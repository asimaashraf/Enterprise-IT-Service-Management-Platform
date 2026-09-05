import mongoose, { Document, Schema } from "mongoose";

export type AuditOutcome = "Success" | "Failure";

export interface IAuditLog extends Document {
  actorId?: mongoose.Types.ObjectId;
  actorEmail?: string;
  actorRole?: "admin" | "employee";
  organizationId: mongoose.Types.ObjectId;
  action: string;
  eventType: string;
  resourceType: string;
  resourceId?: string;
  outcome: AuditOutcome;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "AuthUser",
    },
    actorEmail: {
      type: String,
      trim: true,
    },
    actorRole: {
      type: String,
      enum: ["admin", "employee"],
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
    },
    resourceType: {
      type: String,
      required: true,
      trim: true,
    },
    resourceId: {
      type: String,
      trim: true,
    },
    outcome: {
      type: String,
      enum: ["Success", "Failure"],
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

auditLogSchema.index({ organizationId: 1, createdAt: -1 });
auditLogSchema.index({ organizationId: 1, resourceType: 1, resourceId: 1 });

export default mongoose.model<IAuditLog>("AuditLog", auditLogSchema);
