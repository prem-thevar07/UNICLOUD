import express from "express";
import mongoose from "mongoose";
import auth from "../middleware/auth.middleware.js";
import CloudAccount from "../models/CloudAccount.js";
import { S3Client, ListBucketsCommand, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logActivity } from "../utils/activityLogger.js";

const router = express.Router();

/* ===============================
   🪣 LIST AVAILABLE BUCKETS
=============================== */
router.post("/buckets", auth, async (req, res) => {
  try {
    const { accessKeyId, secretAccessKey, region } = req.body;

    if (!accessKeyId || !secretAccessKey) {
      return res.status(400).json({ message: "Access Key and Secret Key are required" });
    }

    const client = new S3Client({
      region: region || "us-east-1",
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const command = new ListBucketsCommand({});
    const data = await client.send(command);
    const buckets = (data.Buckets || []).map((b) => b.Name);

    res.json({ buckets });
  } catch (err) {
    console.error("❌ S3 list buckets error:", err.message);
    res.status(400).json({ message: "Failed to list buckets: " + err.message });
  }
});

/* ===============================
   🔌 CONNECT S3 ACCOUNT
=============================== */
router.post("/connect", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { email, accessKeyId, secretAccessKey, region, bucketName } = req.body;

    if (!email || !accessKeyId || !secretAccessKey || !bucketName) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const targetRegion = region || "us-east-1";

    // Validate connection and fetch initial storage size
    const client = new S3Client({
      region: targetRegion,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      MaxKeys: 1000,
    });
    const listRes = await client.send(listCommand);
    const totalSize = (listRes.Contents || []).reduce((sum, item) => sum + (item.Size || 0), 0);

    // Save to DB
    const account = await CloudAccount.findOneAndUpdate(
      { userId, provider: "s3", email },
      {
        status: "connected",
        credentials: {
          accessKeyId,
          secretAccessKey,
          region: targetRegion,
          bucketName,
        },
        storage: {
          used: totalSize,
          total: 50 * 1024 * 1024 * 1024, // 50 GB default quota display
        },
      },
      { new: true, upsert: true }
    );

    // ✅ Log real account_connected event
    await logActivity(userId, "account_connected",
      `Connected Amazon S3 account (${email})`,
      { provider: "s3", email }
    );

    res.json({ success: true, account });
  } catch (err) {
    console.error("❌ S3 connect error:", err.message);
    res.status(400).json({ message: "Failed to connect bucket: " + err.message });
  }
});

/* ===============================
   📂 OPEN / GENERATE PRE-SIGNED URL (INLINE & DOWNLOAD)
=============================== */
router.get(["/open/:id", "/download/:id"], auth, async (req, res) => {
  try {
    const accountId = req.params.id;
    const { fileId } = req.query; // fileId is the S3 object Key!

    if (!fileId) {
      return res.status(400).json({ message: "File ID (Key) is required" });
    }

    let account = null;
    const targetAccountId = req.query.accountId || accountId;
    if (targetAccountId && targetAccountId !== "default" && mongoose.Types.ObjectId.isValid(targetAccountId)) {
      account = await CloudAccount.findOne({
        _id: targetAccountId,
        userId: req.user.id,
        provider: "s3",
      });
    }

    if (!account) {
      account = await CloudAccount.findOne({
        userId: req.user.id,
        provider: "s3",
      });
    }

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    const getCred = (key) => account.credentials?.get ? account.credentials.get(key) : account.credentials?.[key];
    const accessKeyId = getCred("accessKeyId");
    const secretAccessKey = getCred("secretAccessKey");
    const region = getCred("region") || "us-east-1";
    const bucket = getCred("bucketName");

    const client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    let targetKey = String(fileId || "").replace(/^\/+/, "");

    const ext = targetKey.split(".").pop().toLowerCase();
    const mimeMap = {
      // Images
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      bmp: "image/bmp",
      ico: "image/x-icon",

      // Documents / PDFs / Text
      pdf: "application/pdf",
      txt: "text/plain; charset=utf-8",
      json: "application/json",
      xml: "text/xml",
      csv: "text/csv",
      html: "text/html",
      css: "text/css",
      js: "text/javascript",

      // Audio & Video
      mp3: "audio/mpeg",
      wav: "audio/wav",
      ogg: "audio/ogg",
      m4a: "audio/mp4",
      mp4: "video/mp4",
      webm: "video/webm",
      ogv: "video/ogg",
      mov: "video/quicktime",
      avi: "video/x-msvideo"
    };
    const contentType = mimeMap[ext] || "application/pdf";

    const rawFilename = targetKey.split("/").pop() || "download";
    // Sanitize filename for Content-Disposition so '=' and quotes do not corrupt AWS S3 presigned URL query string
    const safeFilename = rawFilename.replace(/=/g, "_").replace(/["\r\n]/g, "");

    const commandParams = {
      Bucket: bucket,
      Key: targetKey,
    };

    const isDownloadRoute = req.baseUrl?.includes("download") || req.path?.includes("download") || req.originalUrl?.includes("download");
    if (isDownloadRoute) {
      // Force download attachment header for S3 presigned URL
      commandParams.ResponseContentDisposition = `attachment; filename="${safeFilename}"`;
    } else {
      // Inline rendering inside browser tab for Open button preview
      commandParams.ResponseContentDisposition = "inline";
      commandParams.ResponseContentType = contentType;
    }

    const command = new GetObjectCommand(commandParams);
    const signedUrl = await getSignedUrl(client, command, { expiresIn: 3600 });

    const isCodeOrText = ["js", "jsx", "ts", "tsx", "py", "json", "html", "css", "cpp", "c", "java", "sql", "md", "txt", "sh", "env", "log", "xml", "yaml", "yml", "ipynb"].includes(ext);

    if (!isDownloadRoute && isCodeOrText) {
      // Direct stream S3 object to client to bypass S3 CORS restrictions when fetched by Monaco Editor
      const s3Obj = await client.send(new GetObjectCommand({ Bucket: bucket, Key: targetKey }));
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return s3Obj.Body.pipe(res);
    }

    const isOfficeDoc = ["docx", "doc", "xlsx", "xls", "pptx", "ppt"].includes(ext);

    if (!isDownloadRoute && isOfficeDoc) {
      const isEmbedMode = req.query.embed === "true";
      const mode = isEmbedMode ? "embed.aspx" : "view.aspx";
      // Wrap presigned S3 URL with Microsoft Office Web Viewer for docx/xlsx/pptx browser preview
      const officeViewerUrl = `https://view.officeapps.live.com/op/${mode}?src=${encodeURIComponent(signedUrl)}`;
      if (req.headers.authorization) {
        return res.json({ link: officeViewerUrl });
      } else {
        return res.redirect(officeViewerUrl);
      }
    }

    // Return secure URL in JSON if requested via Axios (for download button), 
    // otherwise redirect directly for direct browser tab opens (for open button)
    if (req.headers.authorization) {
      res.json({ link: signedUrl });
    } else {
      res.redirect(signedUrl);
    }
  } catch (err) {
    console.error("❌ S3 download link error:", err.message);
    res.status(500).json({ message: "Failed to retrieve S3 link" });
  }
});

/* ===============================
   🔄 MANUAL SYNC ACCOUNT
=============================== */
router.post("/sync/:id", auth, async (req, res) => {
  try {
    const accountId = req.params.id;
    const account = await CloudAccount.findOne({ _id: accountId, userId: req.user.id });
    if (!account) return res.status(404).json({ message: "Account not found" });

    // Recalculate bucket storage size
    const getCred = (key) => account.credentials?.get ? account.credentials.get(key) : account.credentials?.[key];
    const accessKeyId = getCred("accessKeyId");
    const secretAccessKey = getCred("secretAccessKey");
    const region = getCred("region") || "us-east-1";
    const bucketName = getCred("bucketName");

    const client = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
    const command = new ListObjectsV2Command({ Bucket: bucketName, MaxKeys: 1000 });
    const listRes = await client.send(command);
    const totalSize = (listRes.Contents || []).reduce((sum, item) => sum + (item.Size || 0), 0);

    account.storage.used = totalSize;
    account.lastSyncedAt = new Date();
    await account.save();

    // ✅ Log real account_synced event
    await logActivity(req.user.id, "account_synced",
      `Synced Amazon S3 account`,
      { provider: "s3", email: account.email }
    );

    res.json({ success: true, account });
  } catch (err) {
    console.error("❌ S3 sync error:", err.message);
    res.status(400).json({ message: "Sync failed: " + err.message });
  }
});

export default router;
