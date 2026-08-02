import { fetchS3Files } from "../../providers/s3.provider.js";
import { ProviderAdapter } from "../ProviderAdapter.js";
import { isMediaFile } from "../../../utils/mediaFilter.js";

export class S3Adapter extends ProviderAdapter {
  constructor(cloudAccount) {
    super(cloudAccount);
  }

  async listMetadata(pageToken = null, options = {}) {
    const res = await fetchS3Files(this.account, pageToken, options);
    const rawFiles = res?.files || [];

    const filtered = rawFiles.filter((file) => {
      const key = file.Key || file.id || file.name || "";
      return isMediaFile(key);
    });

    const items = filtered.map((f) => this.normalizeMetadata(f));
    return {
      items,
      nextPageToken: res?.nextPageToken || null,
    };
  }

  async getIncrementalChanges(deltaToken = null) {
    const res = await this.listMetadata(deltaToken);
    return {
      changes: res.items,
      deletedIds: [],
      nextDeltaToken: res.nextPageToken,
    };
  }

  normalizeMetadata(file) {
    const rawKey = file.Key || file.id || file.name || "file";
    const name = rawKey.split("/").pop() || "Unnamed Photo";
    const ext = name.split(".").pop().toLowerCase();
    const created = file.LastModified ? new Date(file.LastModified) : new Date();

    const parts = rawKey.split("/");
    parts.pop();
    const parentName = parts.length > 0 ? parts[parts.length - 1] : "Root";
    const openUrl = `/api/s3/open/${this.accountId}?fileId=${encodeURIComponent(rawKey)}`;

    return {
      userId: this.account.userId,
      accountId: this.account._id,
      provider: "s3",
      providerFileId: rawKey,
      name,
      mimeType: ["jpg", "jpeg", "png", "gif", "webp"].includes(ext) ? `image/${ext}` : `video/${ext}`,
      size: Number(file.Size || file.size) || 0,
      thumbnailUrl: openUrl,
      previewUrl: openUrl,
      originalUrl: openUrl,
      createdDate: created,
      modifiedDate: created,
      photoTakenDate: created,
      width: null,
      height: null,
      parentFolder: parentName,
    };
  }
}
