import { fetchOneDriveFiles } from "../../providers/onedrive.provider.js";
import { ProviderAdapter } from "../ProviderAdapter.js";
import { isMediaFile } from "../../../utils/mediaFilter.js";

export class OneDriveAdapter extends ProviderAdapter {
  constructor(cloudAccount) {
    super(cloudAccount);
  }

  async listMetadata(pageToken = null, options = {}) {
    const res = await fetchOneDriveFiles(this.account, pageToken, options);
    const rawFiles = res?.files || [];

    const filtered = rawFiles.filter((file) => {
      if (file.folder) return false;
      return isMediaFile(file.name, file.file?.mimeType);
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
    const created = file.createdDateTime ? new Date(file.createdDateTime) : new Date();
    const modified = file.lastModifiedDateTime ? new Date(file.lastModifiedDateTime) : created;
    const photoTakenDate = file.photo?.takenDateTime ? new Date(file.photo.takenDateTime) : created;

    const rawPath = file.parentReference?.path || "";
    const pathSegs = rawPath.replace(/^\/drive\/root:?/, "").split("/").filter(Boolean);
    const parentName = pathSegs.length > 0 ? pathSegs[pathSegs.length - 1] : "Root";

    return {
      userId: this.account.userId,
      accountId: this.account._id,
      provider: "onedrive",
      providerFileId: file.id,
      name: file.name || "Unnamed Photo",
      mimeType: file.file?.mimeType || "image/jpeg",
      size: Number(file.size) || 0,
      thumbnailUrl: `/api/onedrive/thumbnail/${this.accountId}?fileId=${file.id}`,
      previewUrl: `/api/onedrive/open/${this.accountId}?fileId=${file.id}`,
      originalUrl: file["@microsoft.graph.downloadUrl"] || file.webUrl || null,
      createdDate: created,
      modifiedDate: modified,
      photoTakenDate: isNaN(photoTakenDate.getTime()) ? created : photoTakenDate,
      width: file.image?.width || null,
      height: file.image?.height || null,
      parentFolder: parentName,
    };
  }
}
