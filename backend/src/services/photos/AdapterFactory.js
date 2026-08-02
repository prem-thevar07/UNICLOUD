import { GoogleDriveAdapter } from "./adapters/GoogleDriveAdapter.js";
import { OneDriveAdapter } from "./adapters/OneDriveAdapter.js";
import { DropboxAdapter } from "./adapters/DropboxAdapter.js";
import { S3Adapter } from "./adapters/S3Adapter.js";
import { BoxAdapter } from "./adapters/BoxAdapter.js";

export class AdapterFactory {
  static getAdapter(cloudAccount) {
    if (!cloudAccount || !cloudAccount.provider) {
      throw new Error("Invalid CloudAccount object provided to AdapterFactory.");
    }

    switch (cloudAccount.provider) {
      case "google":
      case "google-photos":
        return new GoogleDriveAdapter(cloudAccount);
      case "onedrive":
        return new OneDriveAdapter(cloudAccount);
      case "dropbox":
        return new DropboxAdapter(cloudAccount);
      case "s3":
        return new S3Adapter(cloudAccount);
      case "box":
        return new BoxAdapter(cloudAccount);
      default:
        throw new Error(`Unsupported cloud provider: ${cloudAccount.provider}`);
    }
  }
}
