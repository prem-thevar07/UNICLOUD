import { google } from "googleapis";
import { ProviderAdapter } from "../ProviderAdapter.js";
import { isMediaFile } from "../../../utils/mediaFilter.js";

export class GoogleDriveAdapter extends ProviderAdapter {
  constructor(cloudAccount) {
    super(cloudAccount);
    this.auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    this.auth.setCredentials({
      access_token: cloudAccount.accessToken,
      refresh_token: cloudAccount.refreshToken,
    });
    this.drive = google.drive({ version: "v3", auth: this.auth });
  }

  async listMetadata(pageToken = null, options = {}) {
    const pageSize = options.pageSize || 1000;
    const queryStr = "(mimeType contains 'image/' or mimeType contains 'video/') and trashed = false";

    const res = await this.drive.files.list({
      q: queryStr,
      fields: "nextPageToken, files(id, name, mimeType, thumbnailLink, webContentLink, webViewLink, size, createdTime, modifiedTime, imageMediaMetadata, videoMediaMetadata, parents)",
      pageSize,
      orderBy: "createdTime desc",
      pageToken: pageToken || undefined,
    });

    const rawFiles = res.data.files || [];
    const items = rawFiles
      .filter((file) => isMediaFile(file.name, file.mimeType))
      .map((file) => this.normalizeMetadata(file));
    return {
      items,
      nextPageToken: res.data.nextPageToken || null,
    };
  }

  async getIncrementalChanges(deltaToken = null) {
    let startToken = deltaToken;
    if (!startToken) {
      const tokenRes = await this.drive.changes.getStartPageToken();
      startToken = tokenRes.data.startPageToken;
    }

    const res = await this.drive.changes.list({
      pageToken: startToken,
      fields: "nextPageToken, newStartPageToken, changes(fileId, removed, file(id, name, mimeType, thumbnailLink, webContentLink, webViewLink, size, createdTime, modifiedTime, imageMediaMetadata, videoMediaMetadata, parents, trashed))",
    });

    const changes = [];
    const deletedIds = [];

    (res.data.changes || []).forEach((change) => {
      if (change.removed || (change.file && change.file.trashed)) {
        deletedIds.push(change.fileId);
      } else if (change.file) {
        const mime = change.file.mimeType || "";
        if (mime.startsWith("image/") || mime.startsWith("video/")) {
          changes.push(this.normalizeMetadata(change.file));
        }
      }
    });

    return {
      changes,
      deletedIds,
      nextDeltaToken: res.data.newStartPageToken || res.data.nextPageToken || null,
    };
  }

  normalizeMetadata(file) {
    const created = file.createdTime && !isNaN(new Date(file.createdTime).getTime()) ? new Date(file.createdTime) : new Date();
    const modified = file.modifiedTime && !isNaN(new Date(file.modifiedTime).getTime()) ? new Date(file.modifiedTime) : created;

    let photoTakenDate = created;
    if (file.imageMediaMetadata?.time) {
      const parts = file.imageMediaMetadata.time.split(" ");
      if (parts.length === 2) {
        const dParts = parts[0].split(":");
        const tParts = parts[1].split(":");
        const parsed = new Date(Date.UTC(dParts[0], dParts[1] - 1, dParts[2], tParts[0], tParts[1], tParts[2]));
        if (!isNaN(parsed.getTime())) {
          photoTakenDate = parsed;
        }
      }
    }

    if (!photoTakenDate || isNaN(photoTakenDate.getTime())) {
      photoTakenDate = created;
    }

    const width = file.imageMediaMetadata?.width || file.videoMediaMetadata?.width || null;
    const height = file.imageMediaMetadata?.height || file.videoMediaMetadata?.height || null;
    const orientation = file.imageMediaMetadata?.rotation || 1;

    return {
      userId: this.account.userId,
      accountId: this.account._id,
      provider: "google",
      providerFileId: file.id,
      name: file.name || "Unnamed Photo",
      mimeType: file.mimeType || "image/jpeg",
      size: Number(file.size) || 0,
      thumbnailUrl: file.thumbnailLink || null,
      previewUrl: `/api/google/open/${this.accountId}?fileId=${file.id}`,
      originalUrl: file.webContentLink || file.webViewLink || null,
      createdDate: created,
      modifiedDate: modified,
      photoTakenDate,
      width,
      height,
      orientation,
      parentFolder: file.parents && file.parents.length > 0 ? "Google Drive" : "Root",
    };
  }
}
