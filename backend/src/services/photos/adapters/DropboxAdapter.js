import { fetchDropboxFiles } from "../../providers/dropbox.provider.js";
import { ProviderAdapter } from "../ProviderAdapter.js";
import { isMediaFile } from "../../../utils/mediaFilter.js";

export class DropboxAdapter extends ProviderAdapter {
  constructor(cloudAccount) {
    super(cloudAccount);
  }

  async listMetadata(pageToken = null, options = {}) {
    const res = await fetchDropboxFiles(this.account, pageToken || null);
    const rawFiles = res?.files || [];

    const filtered = rawFiles.filter((file) => {
      if (file[".tag"] === "folder") return false;
      return isMediaFile(file.name);
    });

    const items = filtered.map((f) => this.normalizeMetadata(f));
    return {
      items,
      nextPageToken: res?.nextPageToken || null,
    };
  }

  async getIncrementalChanges(deltaToken = null) {
    // Falls back to listMetadata if no native delta cursor passed
    const res = await this.listMetadata(deltaToken);
    return {
      changes: res.items,
      deletedIds: [],
      nextDeltaToken: res.nextPageToken,
    };
  }

  normalizeMetadata(file) {
    const ext = (file.name || "").split(".").pop().toLowerCase();
    const created = file.client_modified ? new Date(file.client_modified) : new Date();
    const modified = file.server_modified ? new Date(file.server_modified) : created;
    
    const folderPath = file.path_display ? (file.path_display.substring(0, file.path_display.lastIndexOf("/")) || "/") : "/";
    const parentName = folderPath === "/" ? "Root" : (folderPath.split("/").filter(Boolean).pop() || "Root");

    return {
      userId: this.account.userId,
      accountId: this.account._id,
      provider: "dropbox",
      providerFileId: file.id,
      name: file.name || "Unnamed Photo",
      mimeType: ["jpg", "jpeg", "png", "gif", "webp"].includes(ext) ? `image/${ext}` : `video/${ext}`,
      size: Number(file.size) || 0,
      thumbnailUrl: `/api/dropbox/open/${this.accountId}?path=${encodeURIComponent(file.id)}&name=${encodeURIComponent(file.name || "photo")}`,
      previewUrl: `/api/dropbox/open/${this.accountId}?path=${encodeURIComponent(file.id)}&name=${encodeURIComponent(file.name || "photo")}`,
      originalUrl: `https://www.dropbox.com/home` + (file.path_display || ""),
      createdDate: created,
      modifiedDate: modified,
      photoTakenDate: created,
      width: null,
      height: null,
      parentFolder: parentName,
    };
  }
}
