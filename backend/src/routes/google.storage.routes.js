import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { google } from "googleapis";
import CloudAccount from "../models/CloudAccount.js";
import auth from "../middleware/auth.middleware.js";
import { oauth2Client } from "../config/google.js";
import { fileCache } from "../utils/cache.js";

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
        "https://www.googleapis.com/auth/photoslibrary.readonly.originals",
        "https://www.googleapis.com/auth/photoslibrary.appendonly",
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

    const { name, webViewLink } = fileMetadata.data;

    // Convert Google Drive /view link to /preview embed link for video/audio/pdf/doc player
    if (webViewLink) {
      const embedPreviewUrl = webViewLink.replace(/\/view(\?.*)?$/, "/preview");
      if (req.headers.authorization) return res.json({ link: embedPreviewUrl });
      return res.redirect(embedPreviewUrl);
    }

    res.status(404).json({ message: "Preview not available" });
  } catch (err) {
    console.error("❌ Google open proxy error:", err.message);
    res.status(500).json({ message: "Failed to open Google Drive file: " + err.message });
  }
});

export default router;