import PhotoMetadata from "../../models/PhotoMetadata.js";
import CloudAccount from "../../models/CloudAccount.js";
import { AdapterFactory } from "./AdapterFactory.js";

class SyncManagerService {
  /**
   * Synchronize metadata for a single cloud account (Initial or Incremental)
   * @param {object} account 
   */
  async syncAccount(account) {
    const accIdStr = account._id.toString();
    console.log(`🔄 Starting background metadata sync for account [${account.provider}:${accIdStr}]...`);

    try {
      const adapter = AdapterFactory.getAdapter(account);
      let pageToken = null;
      let totalSynced = 0;
      let hasMore = true;

      // Batch loop to fetch & index all metadata from provider
      while (hasMore) {
        const result = await adapter.listMetadata(pageToken, { pageSize: 1000 });
        const items = result.items || [];

        if (items.length > 0) {
          const bulkOps = items.map((item) => ({
            updateOne: {
              filter: { accountId: account._id, providerFileId: item.providerFileId },
              update: { $set: { ...item, lastSyncTimestamp: new Date() } },
              upsert: true,
            },
          }));

          await PhotoMetadata.bulkWrite(bulkOps);
          totalSynced += items.length;
        }

        pageToken = result.nextPageToken;
        if (!pageToken) {
          hasMore = false;
        }
      }

      // Clean up any legacy non-media items (e.g. types.d.mts, code, documents)
      await PhotoMetadata.deleteMany({
        accountId: account._id,
        $or: [
          { name: { $regex: "\\.(d\\.ts|d\\.mts|ts|tsx|mts|cts|js|jsx|json|html|css|py|cpp|c|java|sql|md|txt|sh|env|log|xml|yaml|yml|ipynb|pdf|docx?|xlsx?|pptx?|zip|tar|gz|7z|rar|exe|dll|bin)$", $options: "i" } },
          { name: { $regex: "^\\." } },
        ],
      });

      // Clean up any bad or stale google-photos records with invalid drive.google.com URLs
      await PhotoMetadata.deleteMany({
        provider: "google-photos",
        $or: [
          { thumbnailUrl: { $regex: "drive.google.com" } },
          { thumbnailUrl: "" },
          { thumbnailUrl: null },
        ],
      });

      // Update lastSyncedAt on CloudAccount document
      account.lastSyncedAt = new Date();
      await account.save();

      console.log(`✅ Metadata sync completed for [${account.provider}:${accIdStr}] (${totalSynced} items indexed)`);
      return { success: true, totalSynced };
    } catch (err) {
      console.error(`❌ Background metadata sync failed for [${account.provider}:${accIdStr}]:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Synchronize all accounts for a specific user in background
   * @param {string} userId 
   */
  async syncUserAccounts(userId) {
    try {
      const accounts = await CloudAccount.find({ userId });
      if (!accounts.length) return { success: true, syncedAccounts: 0 };

      // Execute sync jobs in parallel
      const syncPromises = accounts.map((acc) =>
        this.syncAccount(acc).catch((err) => {
          console.warn(`⚠️ Background sync error for ${acc.provider}:`, err.message);
          return { success: false, error: err.message };
        })
      );
      const results = await Promise.all(syncPromises);

      return {
        success: true,
        syncedAccounts: accounts.length,
        results,
      };
    } catch (err) {
      console.error(`❌ User accounts metadata sync failed for user ${userId}:`, err.message);
      return { success: false, error: err.message };
    }
  }
}

export const syncManagerService = new SyncManagerService();
