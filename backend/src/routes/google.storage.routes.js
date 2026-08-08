import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import axios from "axios";
import { google } from "googleapis";
import CloudAccount from "../models/CloudAccount.js";
import auth from "../middleware/auth.middleware.js";
import { oauth2Client } from "../config/google.js";
import { fileCache } from "../utils/cache.js";
import {
  createPickerSession,
  getPickerSessionStatus,
  importPickerMediaItems,
} from "../services/providers/googlePhotosPicker.provider.js";
import { refreshGoogleToken } from "../services/providers/google.provider.js";

const router = express.Router();

/* ===============================
   🔗 CONNECT GOOGLE (JWT BASED)
=============================== */
router.get("/connect", (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      console.log("❌ Missing token");
      return res.status(401).send("Unauthorized");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    console.log("🔗 OAuth start for user:", userId);

    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.BASE_URL}/api/google/callback`
    );

    const url = client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent", // 🔥 required
      scope: [
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/photospicker.mediaitems.readonly",
      ],
      state: userId,
    });

    res.redirect(url);
  } catch (err) {
    console.error("❌ OAuth start error:", err.message);
    res.status(401).send("Unauthorized");
  }
});

/* ===============================
   🔁 GOOGLE CALLBACK (MULTI ACCOUNT SAFE)
=============================== */
router.get("/callback", async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).send("Missing OAuth data");
    }

    const userId = state;

    console.log("🔁 Callback for user:", userId);

    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.BASE_URL}/api/google/callback`
    );

    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    console.log("✅ Tokens received. Scopes returned by Google:", tokens.scope);

    /* GET EMAIL */
    const oauth2 = google.oauth2({
      auth: client,
      version: "v2",
    });

    const { data } = await oauth2.userinfo.get();
    const email = data.email;

    console.log("📧 Google account:", email);

    /* HANDLE EXISTING ACCOUNT */
    const existing = await CloudAccount.findOne({
      userId,
      provider: "google",
      email,
    });

    const refreshToken =
      tokens.refresh_token || existing?.refreshToken;

    if (!refreshToken) {
      console.warn("⚠️ No refresh token received");
    }

    /* SAVE ACCOUNT (NO OVERWRITE BUG) */
    await CloudAccount.findOneAndUpdate(
      {
        userId,
        provider: "google",
        email,
      },
      {
        userId,
        provider: "google",
        email,
        accessToken: tokens.access_token,
        refreshToken,
        scope: tokens.scope?.split(" ") || [],
        status: "connected",
        lastSyncedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    console.log("💾 Account saved:", email);

    // Invalidate caches for this account and user
    if (existing) {
      fileCache.invalidateAccount(existing._id.toString());
    }
    fileCache.invalidateUserPhotos(userId);

    res.redirect(`${process.env.FRONTEND_URL}/manage-accounts`);
  } catch (err) {
    console.error("❌ Callback error:", err.message);
    res.status(500).send("OAuth failed");
  }
});

/* ===============================
   🔄 SYNC ACCOUNT (🔥 YOUR MISSING PIECE)
=============================== */
router.post("/sync/:accountId", auth, async (req, res) => {
  try {
    const { accountId } = req.params;

    console.log("🔄 Sync request:", accountId);

    const account = await CloudAccount.findOne({
      _id: accountId,
      userId: req.user.id,
    });

    if (!account) {
      console.log("❌ Account not found");
      return res.status(404).json({ message: "Account not found" });
    }

    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    client.setCredentials({
      refresh_token: account.refreshToken,
    });

    const drive = google.drive({
      version: "v3",
      auth: client,
    });

    const about = await drive.about.get({
      fields: "storageQuota",
    });

    const { limit, usage } = about.data.storageQuota;

    account.storage = {
      total: limit,
      used: usage,
    };

    account.lastSyncedAt = new Date();
    account.status = "connected";

    await account.save();

    console.log("✅ Sync success:", account.email);

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Google sync error:", err.message);
    const isInvalidGrant = err.message?.includes("invalid_grant") || err.response?.data?.error === "invalid_grant";

    if (isInvalidGrant) {
      try {
        const account = await CloudAccount.findOne({ _id: req.params.accountId, userId: req.user.id });
        if (account) {
          account.status = "expired";
          await account.save();
        }
      } catch (e) {
        console.error("Failed to update account status to expired:", e.message);
      }
      return res.status(400).json({
        message: "Google account session has expired or was revoked. Please reconnect your account.",
        error: "invalid_grant",
        status: "expired"
      });
    }

    res.status(500).json({ message: "Sync failed", error: err.message });
  }
});

/* ===============================
   📊 STORAGE (OPTIONAL SINGLE FETCH)
=============================== */
router.get("/storage/:accountId", auth, async (req, res) => {
  try {
    const { accountId } = req.params;

    const account = await CloudAccount.findOne({
      _id: accountId,
      userId: req.user.id,
    });

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    res.json(account.storage || { used: 0, total: 0 });
  } catch (err) {
    console.error("❌ Storage error:", err.message);
    res.status(500).json({ message: "Storage fetch failed" });
  }
});

router.get("/storage", auth, async (req, res) => {
  try {
    const accounts = await CloudAccount.find({
      userId: req.user.id,
      provider: "google",
    });

    if (!accounts.length) {
      return res.json([]);
    }

    const results = [];

    for (const account of accounts) {
      const client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );

      client.setCredentials({
        refresh_token: account.refreshToken,
      });

      const drive = google.drive({
        version: "v3",
        auth: client,
      });

      const about = await drive.about.get({
        fields: "storageQuota",
      });

      const { limit, usage } = about.data.storageQuota;

      account.storage = {
        used: usage,
        total: limit,
      };

      account.lastSyncedAt = new Date();
      await account.save();

      results.push({
        accountId: account._id,
        used: usage,
        total: limit,
      });
    }

    res.json(results);
  } catch (err) {
    console.error("❌ STORAGE ERROR:", err.message);
    res.status(500).json({ message: "Storage failed" });
  }
});

/* ===============================
   📁 GET FOLDERS FOR AN ACCOUNT
=============================== */
router.get("/folders/:accountId", auth, async (req, res) => {
  try {
    const { accountId } = req.params;
    const account = await CloudAccount.findOne({
      _id: accountId,
      userId: req.user.id,
    });

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    client.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
    });

    const drive = google.drive({
      version: "v3",
      auth: client,
    });

    // Query non-trashed folders
    const response = await drive.files.list({
      q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false and 'me' in owners",
      fields: "files(id, name)",
      pageSize: 100,
    });

    res.json(response.data.files || []);
  } catch (err) {
    console.error("❌ List folders error:", err.message);
    res.status(500).json({ message: "Failed to list folders" });
  }
});

/* ===============================
   📥 GOOGLE SECURE DOWNLOAD PROXY
=============================== */
router.get("/download/:accountId", auth, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { fileId } = req.query;

    if (!fileId) {
      return res.status(400).json({ message: "File ID is required" });
    }

    let account = null;
    const targetAccountId = req.query.accountId || accountId;
    if (targetAccountId && targetAccountId !== "default" && mongoose.Types.ObjectId.isValid(targetAccountId)) {
      account = await CloudAccount.findOne({
        _id: targetAccountId,
        userId: req.user.id,
        provider: "google",
      });
    }

    if (!account) {
      account = await CloudAccount.findOne({
        userId: req.user.id,
        provider: "google",
      });
    }

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    client.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
    });

    const drive = google.drive({
      version: "v3",
      auth: client,
    });

    // 1. Retrieve file metadata to get name, size, and mimeType
    const fileMetadata = await drive.files.get({
      fileId,
      fields: "id, name, size, mimeType",
    });

    const { name, size, mimeType } = fileMetadata.data;
    const safeName = name ? name.replace(/["\r\n]/g, "") : "download";

    // 2. Check if Google Workspace file (Doc, Sheet, Slide, etc.)
    if (mimeType && mimeType.startsWith("application/vnd.google-apps.")) {
      let exportMimeType = "application/pdf";
      let ext = ".pdf";

      if (mimeType.includes("document")) {
        exportMimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        ext = ".docx";
      } else if (mimeType.includes("spreadsheet")) {
        exportMimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        ext = ".xlsx";
      } else if (mimeType.includes("presentation")) {
        exportMimeType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        ext = ".pptx";
      } else if (mimeType.includes("drawing")) {
        exportMimeType = "image/png";
        ext = ".png";
      }

      const exportName = safeName.endsWith(ext) ? safeName : `${safeName}${ext}`;

      const exportResponse = await drive.files.export(
        { fileId, mimeType: exportMimeType },
        { responseType: "stream" }
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(exportName)}"; filename*=UTF-8''${encodeURIComponent(exportName)}`
      );
      res.setHeader("Content-Type", exportMimeType);
      return exportResponse.data.pipe(res);
    }

    // 3. Binary file stream download (PDF, MP4, JPG, ZIP, etc.)
    const driveResponse = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(safeName)}"; filename*=UTF-8''${encodeURIComponent(safeName)}`
    );
    res.setHeader("Content-Type", mimeType || "application/octet-stream");
    if (size) {
      res.setHeader("Content-Length", size);
    }

    driveResponse.data.pipe(res);
  } catch (err) {
    console.error("❌ Google download proxy error:", err.message);
    res.status(500).json({ message: "Failed to download Google Drive file: " + err.message });
  }
});

/* ===============================
   📂 GOOGLE DRIVE SECURE OPEN / PREVIEW
=============================== */
router.get("/open/:accountId", auth, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { fileId } = req.query;

    if (!fileId) {
      return res.status(400).json({ message: "File ID is required" });
    }

    let account = null;
    const targetAccountId = req.query.accountId || accountId;
    if (targetAccountId && targetAccountId !== "default" && mongoose.Types.ObjectId.isValid(targetAccountId)) {
      account = await CloudAccount.findOne({
        _id: targetAccountId,
        userId: req.user.id,
        provider: "google",
      });
    }

    if (!account) {
      account = await CloudAccount.findOne({
        userId: req.user.id,
        provider: "google",
      });
    }

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    client.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
    });

    const drive = google.drive({
      version: "v3",
      auth: client,
    });

    const fileMetadata = await drive.files.get({
      fileId,
      fields: "id, name, mimeType, webViewLink, webContentLink",
    });

    const { name, mimeType, webViewLink } = fileMetadata.data;
    const ext = name ? name.split(".").pop().toLowerCase() : "";
    const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"].includes(ext) || (mimeType && mimeType.startsWith("image/"));
    const isMedia = ["mp3", "wav", "ogg", "m4a", "aac", "flac", "mp4", "webm", "mov", "ogv", "mkv"].includes(ext) || (mimeType && (mimeType.startsWith("audio/") || mimeType.startsWith("video/")));
    const isPdf = ext === "pdf" || mimeType === "application/pdf";
    const isCodeOrText = ["js", "jsx", "ts", "tsx", "py", "json", "html", "css", "cpp", "c", "java", "sql", "md", "txt", "sh", "env", "log", "xml", "yaml", "yml", "ipynb"].includes(ext) || (mimeType && mimeType.startsWith("text/"));
    const isGoogleApps = mimeType && mimeType.startsWith("application/vnd.google-apps.");

    if (isGoogleApps && webViewLink) {
      if (req.headers.authorization) return res.json({ link: webViewLink });
      return res.redirect(webViewLink);
    }

    if (isImage || isMedia || isPdf || isCodeOrText) {
      // Direct raw byte stream for Images, Audio, Video, PDFs, and Code/Text Files
      const driveResponse = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "stream" }
      );
      const mimeMap = {
        jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml", bmp: "image/bmp", ico: "image/x-icon",
        mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", m4a: "audio/mp4", aac: "audio/aac", flac: "audio/flac",
        mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", ogv: "video/ogg", mkv: "video/x-matroska",
        pdf: "application/pdf",
        txt: "text/plain; charset=utf-8", html: "text/html; charset=utf-8", json: "application/json", xml: "text/xml"
      };
      const contentType = mimeMap[ext] || mimeType || "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(name || "preview")}"`);
      return driveResponse.data.pipe(res);
    }

    // Fallback to Google Drive web view
    if (webViewLink) {
      const embedPreviewUrl = webViewLink.replace(/\/view(\?.*)?$/, "/preview");
      if (req.headers.authorization) return res.json({ link: embedPreviewUrl });
      return res.redirect(embedPreviewUrl);
    }

    res.status(404).json({ message: "Preview not available" });
  } catch (err) {
    if (err.message?.includes("invalid_grant") || err.response?.data?.error === "invalid_grant") {
      return res.status(401).json({ message: "Google account authorization expired. Please reconnect in Manage Accounts.", requiresReconnect: true });
    }
    console.error("❌ Google open proxy error:", err.message);
    res.status(500).json({ message: "Failed to open Google Drive file: " + err.message });
  }
});

/* ===============================
   📸 GOOGLE PHOTOS PICKER API ROUTES
=============================== */
router.post("/picker/session/:accountId", auth, async (req, res) => {
  try {
    const { accountId } = req.params;
    const account = await CloudAccount.findOne({
      _id: accountId,
      userId: req.user.id,
      provider: "google",
    });

    if (!account) {
      return res.status(404).json({ message: "Google account not found" });
    }

    const sessionData = await createPickerSession(account);
    res.json(sessionData);
  } catch (err) {
    console.error("❌ Picker Session Route Error:", err.message);
    const isScopeError = err.message?.includes("insufficient authentication scopes") || err.message?.includes("PERMISSION_DENIED");
    const message = isScopeError
      ? "Google Photos permission missing. Please reconnect this Google account in Manage Accounts to enable Google Photos access."
      : "Failed to create Google Photos Picker session: " + err.message;
    res.status(isScopeError ? 403 : 500).json({ message, requiresReconnect: isScopeError });
  }
});

router.get("/picker/session/:accountId/:sessionId", auth, async (req, res) => {
  try {
    const { accountId, sessionId } = req.params;
    const account = await CloudAccount.findOne({
      _id: accountId,
      userId: req.user.id,
      provider: "google",
    });

    if (!account) {
      return res.status(404).json({ message: "Google account not found" });
    }

    const status = await getPickerSessionStatus(account, sessionId);
    res.json(status);
  } catch (err) {
    console.error("❌ Picker Status Route Error:", err.message);
    res.status(500).json({ message: "Failed to get Picker session status", error: err.message });
  }
});

router.post("/picker/import/:accountId", auth, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ message: "Session ID is required" });
    }

    const account = await CloudAccount.findOne({
      _id: accountId,
      userId: req.user.id,
      provider: "google",
    });

    if (!account) {
      return res.status(404).json({ message: "Google account not found" });
    }

    const result = await importPickerMediaItems(req.user.id, account, sessionId);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("❌ Picker Import Route Error:", err.message);
    res.status(500).json({ message: "Failed to import selected Google Photos", error: err.message });
  }
});

router.get("/photos/proxy/:accountId", auth, async (req, res) => {
  try {
    let { url } = req.query;
    if (!url) {
      return res.status(400).send("Url is required");
    }

    // If url is not an absolute HTTP(S) URL (e.g. raw fileId or token), fallback to google open route
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      const fallbackOpenUrl = `/api/google/open/${req.params.accountId}?fileId=${encodeURIComponent(url)}&token=${req.query.token || ""}`;
      return res.redirect(fallbackOpenUrl);
    }

    const accountId = req.params.accountId;
    let token = req.query.token;

    // Refresh Google OAuth token if account is available
    if (accountId && accountId !== "default" && mongoose.Types.ObjectId.isValid(accountId)) {
      try {
        const account = await CloudAccount.findOne({ _id: accountId, userId: req.user.id });
        if (account && account.refreshToken) {
          token = await refreshGoogleToken(account);
        }
      } catch (e) {
        console.warn("⚠️ Token refresh error in proxy:", e.message);
      }
    }

    const baseHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "*/*",
    };

    if (req.headers.range) {
      baseHeaders.range = req.headers.range;
    }

    // Build target URLs to try (=dv, =m18, =m22, raw)
    const targets = [url];
    if (url.includes("=dv")) {
      targets.push(url.replace("=dv", "=m18"));
      targets.push(url.replace("=dv", "=m22"));
      targets.push(url.split("=")[0]);
    } else if (!url.includes("=")) {
      targets.push(`${url}=dv`);
      targets.push(`${url}=w400`);
    }

    let imgRes = null;
    let lastErr = null;

    // Smart dual-mode fetch with manual 302 redirect tracking to prevent Authorization header leakage to download CDN
    for (const targetUrl of targets) {
      const headerVariants = [];
      if (token) {
        headerVariants.push({ ...baseHeaders, Authorization: `Bearer ${token}` });
      }
      headerVariants.push({ ...baseHeaders });

      for (const reqHeaders of headerVariants) {
        try {
          let resAttempt = await axios.get(targetUrl, {
            headers: reqHeaders,
            responseType: "stream",
            maxRedirects: 0,
            validateStatus: (s) => s >= 200 && s < 400,
            timeout: 15000,
          });

          // Handle 302 / 301 / 307 redirects manually
          if (resAttempt.status >= 300 && resAttempt.status < 400 && resAttempt.headers.location) {
            const redirectUrl = resAttempt.headers.location;
            resAttempt = await axios.get(redirectUrl, {
              headers: baseHeaders, // Clean headers without Authorization Bearer token
              responseType: "stream",
              maxRedirects: 5,
              timeout: 25000,
            });
          }

          if (resAttempt && (resAttempt.status === 200 || resAttempt.status === 206)) {
            imgRes = resAttempt;
            break;
          }
        } catch (err) {
          lastErr = err;
        }
      }
      if (imgRes && (imgRes.status === 200 || imgRes.status === 206)) {
        break;
      }
    }

    if (!imgRes) {
      throw lastErr || new Error("Failed to fetch Google photo stream");
    }

    if (imgRes.status === 206) {
      res.status(206);
      if (imgRes.headers["content-range"]) res.setHeader("Content-Range", imgRes.headers["content-range"]);
      if (imgRes.headers["accept-ranges"]) res.setHeader("Accept-Ranges", imgRes.headers["accept-ranges"]);
      if (imgRes.headers["content-length"]) res.setHeader("Content-Length", imgRes.headers["content-length"]);
    }

    const isVid = url.includes("=dv") || url.includes("=m18") || url.includes("=m22") || (imgRes.headers["content-type"] || "").startsWith("video/");
    res.setHeader("Content-Type", imgRes.headers["content-type"] || (isVid ? "video/mp4" : "image/jpeg"));
    res.setHeader("Cache-Control", "public, max-age=86400");
    imgRes.data.pipe(res);
  } catch (err) {
    console.error("❌ Google Photos proxy error:", err.response?.status, err.message);
    res.status(500).send("Failed to proxy photo: " + err.message);
  }
});

/* ===============================
   🖼️ GOOGLE DRIVE FAST 15KB THUMBNAIL ROUTE
=============================== */
router.get("/thumbnail/:accountId", auth, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { fileId } = req.query;

    if (!fileId) return res.status(400).send("Missing fileId");

    let account = null;
    if (accountId && accountId !== "default" && mongoose.Types.ObjectId.isValid(accountId)) {
      account = await CloudAccount.findOne({ _id: accountId, userId: req.user.id, provider: "google" });
    }
    if (!account) {
      account = await CloudAccount.findOne({ userId: req.user.id, provider: "google" });
    }
    if (!account) return res.status(404).send("Account not found");

    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    client.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
    });
    const drive = google.drive({ version: "v3", auth: client });

    let meta;
    try {
      meta = await drive.files.get({ fileId, fields: "thumbnailLink" });
    } catch (e1) {
      const fallbackUrl = `/api/google/open/${accountId}?fileId=${fileId}&token=${req.query.token || ""}`;
      return res.redirect(fallbackUrl);
    }

    const rawThumb = meta?.data?.thumbnailLink;
    if (rawThumb) {
      const thumbUrl = rawThumb.replace(/=s\d+$/, "=s300");
      const imgRes = await axios.get(thumbUrl, { responseType: "stream", timeout: 10000 });
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=604800");
      return imgRes.data.pipe(res);
    }

    const fallbackUrl = `/api/google/open/${accountId}?fileId=${fileId}&token=${req.query.token || ""}`;
    return res.redirect(fallbackUrl);
  } catch (err) {
    console.error("❌ Google Drive fast thumbnail error:", err.message);
    res.status(500).send("Thumbnail failed");
  }
});

export default router;