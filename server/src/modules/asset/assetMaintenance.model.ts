import mongoose, { Document, Schema } from "mongoose";

export type AssetMaintenanceType =
  | "Preventive"
  | "Corrective"
  | "Inspection"
  | "Upgrade";

export type AssetMaintenanceStatus =
  | "Scheduled"
  | "In Progress"
  | "Completed"
  | "Cancelled";

export interface IAssetMaintenance extends Document {
  assetId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  date: Date;
  type: AssetMaintenanceType;
  description: string;
  cost?: number;
  status: AssetMaintenanceStatus;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const assetMaintenanceSchema = new Schema<IAssetMaintenance>(
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
    date: {
      type: Date,
      required: true,
    },
    type: {
      type: String,
      enum: ["Preventive", "Corrective", "Inspection", "Upgrade"],
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    cost: {
      type: Number,
      min: 0,
    },
    status: {
      type: String,
      enum: ["Scheduled", "In Progress", "Completed", "Cancelled"],
      default: "Completed",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "AuthUser",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

assetMaintenanceSchema.index({
  assetId: 1,
  organizationId: 1,
  date: -1,
});

export default mongoose.model<IAssetMaintenance>(
  "AssetMaintenance",
  assetMaintenanceSchema
);
