import mongoose, { Document, Schema } from "mongoose";

import { AssetStatus } from "./asset.model";

export interface IAssetLifecycle extends Document {
  assetId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  previousStatus: AssetStatus;
  newStatus: AssetStatus;
  changedAt: Date;
  changedBy?: mongoose.Types.ObjectId;
}

const assetLifecycleSchema = new Schema<IAssetLifecycle>(
  {
    assetId: {
      type: Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    previousStatus: {
      type: String,
      enum: ["Available", "Assigned", "Maintenance", "Retired"],
      required: true,
    },
    newStatus: {
      type: String,
      enum: ["Available", "Assigned", "Maintenance", "Retired"],
      required: true,
    },
    changedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: "AuthUser",
    },
  },
  {
    timestamps: false,
  }
);

assetLifecycleSchema.index({
  assetId: 1,
  organizationId: 1,
  changedAt: -1,
});

export default mongoose.model<IAssetLifecycle>(
  "AssetLifecycle",
  assetLifecycleSchema
);