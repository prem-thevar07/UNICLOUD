import { timelineEngineService } from "../services/photos/TimelineEngine.service.js";
import { syncManagerService } from "../services/photos/SyncManager.service.js";
import PhotoMetadata from "../models/PhotoMetadata.js";
import CloudAccount from "../models/CloudAccount.js";

/**
 * GET /api/photos or POST /api/photos (Timeline Cursor Endpoint)
 */
export const getPhotos = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cursor, limit, accountIds, folder, type, preset } = req.body || req.query;

    let parsedAccountIds = accountIds;
    if (typeof accountIds === "string") {
      parsedAccountIds = accountIds.split(",").map((s) => s.trim()).filter(Boolean);
    }

    // Ensure every connected cloud account has its photos indexed in PhotoMetadata
    const connectedAccounts = await CloudAccount.find({ userId, status: "connected" });
    for (const acc of connectedAccounts) {
      const accCount = await PhotoMetadata.countDocuments({ userId, accountId: acc._id });
      if (accCount === 0) {
        console.log(`📌 Syncing photos for newly connected account [${acc.provider}:${acc.email}]...`);
        await syncManagerService.syncAccount(acc).catch((e) => console.warn("Account photo sync warning:", e.message));
      }
    }

    const result = await timelineEngineService.getTimeline(userId, {
      cursor,
      limit: limit ? parseInt(limit, 10) : 60,
      accountIds: parsedAccountIds,
      folder,
      type,
      preset,
    });

    res.json({
      files: result.items,
      groupedSections: result.groupedSections,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  } catch (err) {
    console.error("❌ Timeline Engine Error:", err);
    res.status(500).json({ message: "Failed to retrieve photo timeline: " + err.message });
  }
};

/**
 * POST /api/photos/sync (Background Metadata Sync Trigger)
 */
export const syncPhotos = async (req, res) => {
  try {
    const userId = req.user.id;
    // Trigger background sync without blocking response
    syncManagerService.syncUserAccounts(userId).then((res) => {
      console.log("Background sync finished:", res);
    });

    res.json({ message: "Background metadata synchronization started" });
  } catch (err) {
    console.error("❌ Sync Trigger Error:", err);
    res.status(500).json({ message: "Failed to start sync: " + err.message });
  }
};

/**
 * GET /api/photos/search
 */
export const searchPhotos = async (req, res) => {
  try {
    const userId = req.user.id;
    const { q } = req.query;
    const results = await timelineEngineService.searchPhotos(userId, q);
    res.json({ files: results });
  } catch (err) {
    console.error("❌ Search Error:", err);
    res.status(500).json({ message: "Search failed: " + err.message });
  }
};

/**
 * DELETE /api/photos/google-photos (Purge all imported Google Photos items)
 */
export const purgeGooglePhotos = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await PhotoMetadata.deleteMany({
      userId,
      provider: "google-photos",
    });
    res.json({
      message: "Successfully purged imported Google Photos items",
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error("❌ Purge Google Photos Error:", err);
    res.status(500).json({ message: "Failed to purge Google Photos items: " + err.message });
  }
};
