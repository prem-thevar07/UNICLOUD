import axios from "axios";
import { google } from "googleapis";
import PhotoMetadata from "../../models/PhotoMetadata.js";
import { isMediaFile } from "../../utils/mediaFilter.js";
import { refreshGoogleToken } from "./google.provider.js";

/**
 * Helper to ensure valid access token for Google API calls
 */
const getValidGoogleToken = async (account) => {
  let token = account.accessToken;
  try {
    // Always attempt token refresh if near expiry or unverified
    if (!token || !account.tokenExpiry || new Date(account.tokenExpiry) <= new Date(Date.now() + 60000)) {
      if (account.refreshToken) {
        token = await refreshGoogleToken(account);
      }
    }
  } catch (err) {
    console.warn("⚠️ Initial token check failed, forcing token refresh:", err.message);
    if (account.refreshToken) {
      token = await refreshGoogleToken(account);
    }
  }
  return token || account.accessToken;
};

/**
 * 1. Create a Google Photos Picker Session
 */
export const createPickerSession = async (account) => {
  let token = await getValidGoogleToken(account);
  try {
    const res = await axios.post(
      "https://photospicker.googleapis.com/v1/sessions",
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    return res.data; // { id: "SESSION_ID", pickerUri: "https://photos.google.com/picker/..." }
  } catch (err) {
    if ((err.response?.status === 401 || err.response?.data?.error?.code === 401) && account.refreshToken) {
      console.log("🔄 Google Photos Picker 401 received. Auto-refreshing OAuth token & retrying...");
      token = await refreshGoogleToken(account);
      const res = await axios.post(
        "https://photospicker.googleapis.com/v1/sessions",
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      return res.data;
    }
    console.error("❌ Google Photos Picker Session Creation Error:", err.response?.data || err.message);
    throw new Error(err.response?.data?.error?.message || err.message);
  }
};

/**
 * 2. Get Picker Session Status
 */
export const getPickerSessionStatus = async (account, sessionId) => {
  let token = await getValidGoogleToken(account);
  try {
    const res = await axios.get(`https://photospicker.googleapis.com/v1/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  } catch (err) {
    if ((err.response?.status === 401 || err.response?.data?.error?.code === 401) && account.refreshToken) {
      console.log("🔄 Google Photos Picker Status 401 received. Auto-refreshing OAuth token & retrying...");
      token = await refreshGoogleToken(account);
      const res = await axios.get(`https://photospicker.googleapis.com/v1/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    }
    console.error("❌ Google Photos Picker Session Status Error:", err.response?.data || err.message);
    throw err;
  }
};

/**
 * 3. Fetch Selected Media Items & Import to PhotoMetadata Collection
 */
export const importPickerMediaItems = async (userId, account, sessionId) => {
  let token = await getValidGoogleToken(account);
  try {
    // Log current session status for debugging
    try {
      const statusRes = await getPickerSessionStatus(account, sessionId);
      console.log("🔍 Picker Session Status Debug:", JSON.stringify(statusRes, null, 2));
    } catch (e) {
      console.log("🔍 Could not fetch session status debug:", e.message);
    }

    // Auto-purge bad/stale google-photos metadata items saved with invalid drive.google.com URLs or empty thumbnails
    await PhotoMetadata.deleteMany({
      provider: "google-photos",
      $or: [
        { thumbnailUrl: { $regex: "drive.google.com" } },
        { thumbnailUrl: "" },
        { thumbnailUrl: null }
      ]
    });

    let pageToken = null;
    let allMediaItems = [];

    do {
      const url = `https://photospicker.googleapis.com/v1/mediaItems?sessionId=${sessionId}${pageToken ? `&pageToken=${pageToken}` : ""}`;
      let res;
      try {
        res = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        if ((err.response?.status === 401 || err.response?.data?.error?.code === 401) && account.refreshToken) {
          console.log("🔄 Google Photos Picker Import 401 received. Auto-refreshing token & retrying...");
          token = await refreshGoogleToken(account);
          res = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` },
          });
        } else {
          throw err;
        }
      }

      const items = res.data?.mediaItems || res.data?.items || [];
      allMediaItems.push(...items);
      pageToken = res.data?.nextPageToken || null;
    } while (pageToken);

    console.log(`📦 Fetched ${allMediaItems.length} picked items from Google Photos Picker API`);
    if (allMediaItems.length > 0) {
      console.log("🔍 RAW ITEM 0 FROM GOOGLE PICKER:", JSON.stringify(allMediaItems[0], null, 2));
    }

    const bulkOps = [];

    allMediaItems.forEach((item) => {
      const fileId = item.id || item.mediaItemId;
      if (!fileId) return;

      const mediaFile = item.mediaFile || item;
      const metadata = mediaFile.mediaFileMetadata || item.mediaFileMetadata || {};
      const filename = mediaFile.filename || item.filename || `google_photo_${fileId.substring(0, 10)}.jpg`;
      const mimeType = mediaFile.mimeType || item.mimeType || "image/jpeg";
      const baseUrl = mediaFile.baseUrl || item.baseUrl || "";

      if (!isMediaFile(filename, mimeType)) return;

      const createdDate = item.createTime ? new Date(item.createTime) : new Date();
      const cleanBase = baseUrl.split("=")[0];
      const thumbUrl = cleanBase ? `${cleanBase}=w400` : "";
      const prevUrl = cleanBase ? `${cleanBase}=w1600` : "";

      bulkOps.push({
        updateOne: {
          filter: { accountId: account._id, providerFileId: fileId },
          update: {
            $set: {
              userId,
              accountId: account._id,
              provider: "google-photos",
              providerFileId: fileId,
              name: filename,
              mimeType,
              size: Number(metadata.sizeBytes) || Number(item.size) || 0,
              thumbnailUrl: thumbUrl,
              previewUrl: prevUrl,
              originalUrl: baseUrl ? `${baseUrl}=d` : null,
              photoTakenDate: createdDate,
              createdDate,
              modifiedDate: createdDate,
              width: metadata.photoMetadata?.width || metadata.videoMetadata?.width || null,
              height: metadata.photoMetadata?.height || metadata.videoMetadata?.height || null,
            },
          },
          upsert: true,
        },
      });
    });

    if (bulkOps.length > 0) {
      await PhotoMetadata.bulkWrite(bulkOps);
      console.log(`✅ Successfully imported ${bulkOps.length} Google Photos into database timeline`);
    }

    return { importedCount: bulkOps.length };
  } catch (err) {
    const isNotPickedYet = err.response?.data?.error?.status === "FAILED_PRECONDITION";
    if (isNotPickedYet) {
      console.log("ℹ️ User has not finished picking media items for session:", sessionId);
      return { importedCount: 0, message: "User has not finished picking media items." };
    }
    console.error("❌ Google Photos Picker Import Error:", err.response?.data || err.message);
    throw err;
  }
};
