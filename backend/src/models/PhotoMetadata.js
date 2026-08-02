import mongoose from "mongoose";

const PhotoMetadataSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CloudAccount",
      required: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      enum: ["google", "google-photos", "onedrive", "dropbox", "s3", "box"],
      index: true,
    },
    providerFileId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      index: true,
    },
    size: {
      type: Number,
      default: 0,
    },
    thumbnailUrl: {
      type: String,
      default: null,
    },
    previewUrl: {
      type: String,
      default: null,
    },
    originalUrl: {
      type: String,
      default: null,
    },
    createdDate: {
      type: Date,
      default: Date.now,
    },
    modifiedDate: {
      type: Date,
      default: Date.now,
    },
    photoTakenDate: {
      type: Date,
      required: true,
      index: true,
    },
    width: {
      type: Number,
      default: null,
    },
    height: {
      type: Number,
      default: null,
    },
    orientation: {
      type: Number,
      default: 1,
    },
    parentFolder: {
      type: String,
      default: "Root",
      index: true,
    },
    album: {
      type: String,
      default: null,
      index: true,
    },
    hash: {
      type: String,
      default: null,
      index: true,
    },
    syncVersion: {
      type: Number,
      default: 1,
    },
    lastSyncTimestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

/* ==========================================================================
   COMPOUND INDEXES FOR FAST ZERO-LATENCY TIMELINE & SEARCH QUERIES
   ========================================================================== */

// 1. Unique constraint per provider file ID per account
PhotoMetadataSchema.index({ accountId: 1, providerFileId: 1 }, { unique: true });

// 2. Global Chronological Timeline Query Index (User + PhotoTakenDate Descending + ObjectId Descending)
PhotoMetadataSchema.index({ userId: 1, photoTakenDate: -1, _id: -1 });

// 3. Provider & Account Timeline Filter Index
PhotoMetadataSchema.index({ userId: 1, accountId: 1, photoTakenDate: -1, _id: -1 });

// 4. Folder & Album Query Index
PhotoMetadataSchema.index({ userId: 1, parentFolder: 1, photoTakenDate: -1 });

// 5. Search Text Index on Name & Folder
PhotoMetadataSchema.index({ name: "text", parentFolder: "text", album: "text" });

const PhotoMetadata = mongoose.model("PhotoMetadata", PhotoMetadataSchema);

export default PhotoMetadata;
