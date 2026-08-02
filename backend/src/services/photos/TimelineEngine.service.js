import mongoose from "mongoose";
import PhotoMetadata from "../../models/PhotoMetadata.js";

class TimelineEngineService {
  constructor() {
    this.formatPhotoOutput = this.formatPhotoOutput.bind(this);
  }

  /**
   * Encode opaque base64 cursor
   * @param {number} skipOffset 
   * @returns {string}
   */
  encodeCursor(skipOffset) {
    const payload = JSON.stringify({ s: skipOffset });
    return Buffer.from(payload).toString("base64");
  }

  /**
   * Decode opaque base64 cursor
   * @param {string} cursor 
   * @returns {{ s: number } | null}
   */
  decodeCursor(cursor) {
    if (!cursor) return null;
    try {
      const json = Buffer.from(cursor, "base64").toString("utf8");
      const parsed = JSON.parse(json);
      if (!parsed || parsed.s === undefined || isNaN(parsed.s)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Retrieve timeline batch with opaque cursor pagination & backend date grouping
   * @param {string} userId 
   * @param {object} options 
   */
  async getTimeline(userId, options = {}) {
    const limit = Math.min(options.limit || 60, 200);
    const cursorObj = this.decodeCursor(options.cursor);
    const skip = cursorObj && typeof cursorObj.s === "number" ? cursorObj.s : 0;

    // Build MongoDB query filter
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const query = {
      userId: userObjectId,
      name: { $not: /\.(d\.ts|d\.mts|ts|tsx|mts|cts|js|jsx|json|html|css|py|cpp|c|java|sql|md|txt|sh|env|log|xml|yaml|yml|ipynb|pdf|docx?|xlsx?|pptx?|zip|tar|gz|7z|rar|exe|dll|bin)$/i },
    };

    // Account filtering (supports single or multi account selection)
    if (options.accountIds && Array.isArray(options.accountIds) && options.accountIds.length > 0) {
      const validAccountIds = options.accountIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
      if (validAccountIds.length > 0) {
        query.accountId = { $in: validAccountIds };
      }
    }

    // Folder filtering
    if (options.folder && options.folder !== "all") {
      query.parentFolder = options.folder;
    }

    // Type filtering (image vs video)
    if (options.type === "image") {
      query.mimeType = { $regex: "^image/" };
    } else if (options.type === "video") {
      query.mimeType = { $regex: "^video/" };
    }

    // Fetch batch with skip offset and limit + 1 to determine hasMore
    const items = await PhotoMetadata.find(query)
      .sort({ photoTakenDate: -1, _id: -1 })
      .skip(skip)
      .limit(limit + 1)
      .lean();

    const hasMore = items.length > limit;
    const resultBatch = hasMore ? items.slice(0, limit) : items;

    // Generate next opaque cursor if more items exist
    let nextCursor = null;
    if (hasMore && resultBatch.length > 0) {
      nextCursor = this.encodeCursor(skip + resultBatch.length);
    }

    // Generate date groupings (Today, Yesterday, June 2026, 2025...)
    const groupedSections = this.groupItemsByDate(resultBatch);

    return {
      items: resultBatch.map((item) => this.formatPhotoOutput(item)),
      groupedSections,
      nextCursor,
      hasMore,
    };
  }

  /**
   * Group timeline items by formatted date section headers
   * @param {Array} items 
   */
  groupItemsByDate(items) {
    const groupsMap = new Map();
    const todayStr = new Date().toDateString();

    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const yestStr = yest.toDateString();

    items.forEach((p) => {
      const d = new Date(p.photoTakenDate || p.createdDate || Date.now());
      const dateStr = d.toDateString();

      let label = d.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
      if (dateStr === todayStr) {
        label = `Today — ${d.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })}`;
      } else if (dateStr === yestStr) {
        label = `Yesterday — ${d.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })}`;
      }

      if (!groupsMap.has(label)) {
        groupsMap.set(label, {
          label,
          timestamp: d.getTime(),
          items: [],
        });
      }
      groupsMap.get(label).items.push(this.formatPhotoOutput(p));
    });

    return Array.from(groupsMap.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Search indexed photo metadata instantly
   * @param {string} userId 
   * @param {string} searchQuery 
   */
  async searchPhotos(userId, searchQuery) {
    if (!searchQuery || !searchQuery.trim()) return [];

    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const regex = new RegExp(searchQuery.trim(), "i");
    const nonMediaPattern = /\.(d\.ts|d\.mts|ts|tsx|mts|cts|js|jsx|json|html|css|py|cpp|c|java|sql|md|txt|sh|env|log|xml|yaml|yml|ipynb|pdf|docx?|xlsx?|pptx?|zip|tar|gz|7z|rar|exe|dll|bin)$/i;

    const items = await PhotoMetadata.find({
      userId: userObjectId,
      name: { $not: nonMediaPattern },
      $or: [{ name: regex }, { parentFolder: regex }, { album: regex }],
    })
      .sort({ photoTakenDate: -1 })
      .limit(100)
      .lean();

    return items.map((item) => this.formatPhotoOutput(item));
  }

  /**
   * Compute aggregated metrics directly from database index
   * @param {string} userId 
   */
  async getMetrics(userId) {
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const photosCount = await PhotoMetadata.countDocuments({ userId: userObjectId, mimeType: { $regex: "^image/" } });
    const videosCount = await PhotoMetadata.countDocuments({ userId: userObjectId, mimeType: { $regex: "^video/" } });
    
    const sizeResult = await PhotoMetadata.aggregate([
      { $match: { userId: userObjectId } },
      { $group: { _id: null, totalBytes: { $sum: "$size" } } },
    ]);

    const totalBytes = sizeResult.length > 0 ? sizeResult[0].totalBytes : 0;

    return {
      photosCount,
      videosCount,
      totalBytes,
    };
  }

  /**
   * Format metadata object for API output
   * @param {object} item 
   */
  formatPhotoOutput(item) {
    if (!item) return null;
    return {
      id: item.providerFileId || (item._id ? item._id.toString() : ""),
      metadataId: item._id ? item._id.toString() : "",
      name: item.name || "Unnamed Photo",
      mimeType: item.mimeType || "image/jpeg",
      size: item.size || 0,
      thumbnailLink: item.thumbnailUrl,
      webViewLink: item.originalUrl,
      webContentLink: item.originalUrl,
      previewUrl: item.previewUrl,
      createdTime: item.photoTakenDate || item.createdDate || new Date().toISOString(),
      provider: item.provider,
      accountId: item.accountId ? item.accountId.toString() : "",
      parentFolder: item.parentFolder || "Root",
      album: item.album || null,
      width: item.width || null,
      height: item.height || null,
    };
  }
}

export const timelineEngineService = new TimelineEngineService();
