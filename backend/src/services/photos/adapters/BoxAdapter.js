import { fetchBoxFiles } from "../../providers/box.provider.js";
import { ProviderAdapter } from "../ProviderAdapter.js";
import { isMediaFile } from "../../../utils/mediaFilter.js";

export class BoxAdapter extends ProviderAdapter {
  constructor(cloudAccount) {
    super(cloudAccount);
  }

  async listMetadata(pageToken = null, options = {}) {
    const res = await fetchBoxFiles(this.account, pageToken, options);
    const entries = res?.files || [];

    const filtered = entries.filter((file) => {
      if (file.type !== "file") return false;
      return isMediaFile(file.name);
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
    const name = file.name || "Unnamed Photo";
    const ext = name.split(".").pop().toLowerCase();
    const created = file.created_at ? new Date(file.created_at) : new Date();
    const modified = file.modified_at ? new Date(file.modified_at) : created;
    const parentName = file.parent?.name || "Root";
    const openUrl = `/api/box/open/${this.accountId}?fileId=${file.id}`;

    return {
      userId: this.account.userId,
      accountId: this.account._id,
      provider: "box",
      providerFileId: file.id,
      name,
      mimeType: ["jpg", "jpeg", "png", "gif", "webp"].includes(ext) ? `image/${ext}` : `video/${ext}`,
      size: Number(file.size) || 0,
      thumbnailUrl: openUrl,
      previewUrl: openUrl,
      originalUrl: openUrl,
      createdDate: created,
      modifiedDate: modified,
      photoTakenDate: created,
      width: null,
      height: null,
      parentFolder: parentName,
    };
  }
}
