import { timelineEngineService } from "../services/photos/TimelineEngine.service.js";
import { syncManagerService } from "../services/photos/SyncManager.service.js";
import PhotoMetadata from "../models/PhotoMetadata.js";

/**
 * GET /api/photos or POST /api/photos (Timeline Cursor Endpoint)
 */
export const getPhotos = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cursor, limit, accountIds, folder, type } = req.body || req.query;

    // Check if user has indexed metadata in PhotoMetadata collection
    const metadataCount = await PhotoMetadata.countDocuments({ userId });
    
    // If metadata index is empty, trigger background sync and populate initial items
    if (metadataCount === 0) {
      console.log(`📌 Initial metadata sync required for user ${userId}...`);
      await syncManagerService.syncUserAccounts(userId);
    }

    const result = await timelineEngineService.getTimeline(userId, {
      cursor,
      limit: limit ? parseInt(limit, 10) : 60,
      accountIds,
      folder,
      type,
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
