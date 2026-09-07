import mongoose, {
  Document,
  Schema,
} from "mongoose";

// ==========================================
// TYPES
// ==========================================

export type ChangeRisk =
  | "Low"
  | "Medium"
  | "High"
  | "Critical";

export type ChangeType =
  | "Standard"
  | "Normal"
  | "Emergency";

export type ChangeStatus =
  | "Draft"
  | "Pending Approval"
  | "Approved"
  | "Rejected"
  | "Scheduled"
  | "In Progress"
  | "Completed"
  | "Failed"
  | "Cancelled";

export interface IChange extends Document {
  changeId: string;

  title: string;
  description: string;

  type: ChangeType;
  risk: ChangeRisk;
  status: ChangeStatus;

  requestedBy: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;

  organizationId: mongoose.Types.ObjectId;

  affectedAssets?: mongoose.Types.ObjectId[];

  plannedStartAt?: Date;
  plannedEndAt?: Date;

  rollbackPlan?: string;

  approvalReason?: string;

  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;

  rejectedBy?: mongoose.Types.ObjectId;
  rejectedAt?: Date;

  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  cancelledAt?: Date;

  failureReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// SCHEMA
// ==========================================

const changeSchema = new Schema<IChange>(
  {
    // ----------------------------------------
    // CHANGE ID
    // ----------------------------------------

    changeId: {
      type: String,
      required: true,
      trim: true,
    },

    // ----------------------------------------
    // BASIC INFORMATION
    // ----------------------------------------

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    // ----------------------------------------
    // CHANGE TYPE
    // ----------------------------------------

    type: {
      type: String,
      enum: [
        "Standard",
        "Normal",
        "Emergency",
      ],
      default: "Normal",
    },

    // ----------------------------------------
    // RISK
    // ----------------------------------------

    risk: {
      type: String,
      enum: [
        "Low",
        "Medium",
        "High",
        "Critical",
      ],
      default: "Medium",
    },

    // ----------------------------------------
    // STATUS
    // ----------------------------------------

    status: {
      type: String,
      enum: [
        "Draft",
        "Pending Approval",
        "Approved",
        "Rejected",
        "Scheduled",
        "In Progress",
        "Completed",
        "Failed",
        "Cancelled",
      ],
      default: "Draft",
    },

    // ----------------------------------------
    // REQUESTER
    // ----------------------------------------

    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "AuthUser",
      required: true,
    },

    // ----------------------------------------
    // ASSIGNED USER
    // ----------------------------------------

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "AuthUser",
    },

    // ----------------------------------------
    // ORGANIZATION
    // ----------------------------------------

    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    // ----------------------------------------
    // AFFECTED ASSETS
    // ----------------------------------------

    affectedAssets: [
      {
        type: Schema.Types.ObjectId,
        ref: "Asset",
      },
    ],

    // ----------------------------------------
    // DEPLOYMENT SCHEDULE
    // ----------------------------------------

    plannedStartAt: {
      type: Date,
    },

    plannedEndAt: {
      type: Date,
    },

    // ----------------------------------------
    // ROLLBACK PLAN
    // ----------------------------------------

    rollbackPlan: {
      type: String,
      trim: true,
    },

    // ----------------------------------------
    // APPROVAL
    // ----------------------------------------

    approvalReason: {
      type: String,
      trim: true,
    },

    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "AuthUser",
    },

    approvedAt: {
      type: Date,
    },

    // ----------------------------------------
    // REJECTION
    // ----------------------------------------

    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: "AuthUser",
    },

    rejectedAt: {
      type: Date,
    },

    // ----------------------------------------
    // EXECUTION
    // ----------------------------------------

    startedAt: {
      type: Date,
    },

    completedAt: {
      type: Date,
    },

    failedAt: {
      type: Date,
    },

    cancelledAt: {
      type: Date,
    },

    // ----------------------------------------
    // FAILURE
    // ----------------------------------------

    failureReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// UNIQUE CHANGE ID PER ORGANIZATION
// ==========================================

changeSchema.index(
  {
    changeId: 1,
    organizationId: 1,
  },
  {
    unique: true,
  }
);

// ==========================================
// ORGANIZATION QUERY INDEX
// ==========================================

changeSchema.index({
  organizationId: 1,
  createdAt: -1,
});

// ==========================================
// EXPORT
// ==========================================

export default mongoose.model<IChange>(
  "Change",
  changeSchema
);
