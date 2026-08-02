/**
 * Abstract Provider Adapter Interface
 * All cloud storage providers must implement this contract.
 */
export class ProviderAdapter {
  constructor(cloudAccount) {
    if (new.target === ProviderAdapter) {
      throw new TypeError("Cannot instantiate abstract class ProviderAdapter directly.");
    }
    this.account = cloudAccount;
    this.accountId = cloudAccount._id.toString();
    this.provider = cloudAccount.provider;
  }

  /**
   * List photo and video metadata from provider (supports pagination)
   * @param {string|null} pageToken 
   * @param {object} options 
   * @returns {Promise<{ items: Array, nextPageToken: string|null }>}
   */
  async listMetadata(pageToken = null, options = {}) {
    throw new Error("Method 'listMetadata()' must be implemented.");
  }

  /**
   * Retrieve incremental changes using delta token
   * @param {string|null} deltaToken 
   * @returns {Promise<{ changes: Array, deletedIds: Array, nextDeltaToken: string|null }>}
   */
  async getIncrementalChanges(deltaToken = null) {
    throw new Error("Method 'getIncrementalChanges()' must be implemented.");
  }

  /**
   * Normalize provider raw file record into unified metadata format
   * @param {object} rawFile 
   * @returns {object}
   */
  normalizeMetadata(rawFile) {
    throw new Error("Method 'normalizeMetadata()' must be implemented.");
  }
}
