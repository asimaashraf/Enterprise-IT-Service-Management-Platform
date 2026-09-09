
import mongoose, {
  Document,
  Schema,
} from "mongoose";

// ==========================================
// CORRECTIVE ACTION STATUS
// ==========================================

export type CorrectiveActionStatus =
  | "Pending"
  | "In Progress"
  | "Completed"
  | "Cancelled";

// ==========================================
// INTERFACE
// ==========================================

export interface IRCAcorrectiveAction
  extends Document {
  rca: mongoose.Types.ObjectId;

  title: string;

  description: string;

  assignedTo: mongoose.Types.ObjectId;

  dueDate: Date;

  status: CorrectiveActionStatus;

  completedAt?: Date;

  createdBy: mongoose.Types.ObjectId;

  organizationId: mongoose.Types.ObjectId;

  createdAt: Date;

  updatedAt: Date;
}

// ==========================================
// SCHEMA
// ==========================================

const correctiveActionSchema =
  new Schema<IRCAcorrectiveAction>(
    {
      // ==========================================
      // RCA
      // ==========================================

      rca: {
        type: Schema.Types.ObjectId,
        ref: "RCA",
        required: true,
      },

      // ==========================================
      // TITLE
      // ==========================================

      title: {
        type: String,
        required: true,
        trim: true,
      },

      // ==========================================
      // DESCRIPTION
      // ==========================================

      description: {
        type: String,
        required: true,
        trim: true,
      },

      // ==========================================
      // ASSIGNED USER
      // ==========================================

      assignedTo: {
        type: Schema.Types.ObjectId,
        ref: "AuthUser",
        required: true,
      },

      // ==========================================
      // DUE DATE
      // ==========================================

      dueDate: {
        type: Date,
        required: true,
      },

      // ==========================================
      // STATUS
      // ==========================================

      status: {
        type: String,
        enum: [
          "Pending",
          "In Progress",
          "Completed",
          "Cancelled",
        ],
        default: "Pending",
      },

      // ==========================================
      // COMPLETED AT
      // ==========================================

      completedAt: {
        type: Date,
      },

      // ==========================================
      // CREATED BY
      // ==========================================

      createdBy: {
        type: Schema.Types.ObjectId,
        ref: "AuthUser",
        required: true,
      },

      // ==========================================
      // ORGANIZATION
      // ==========================================

      organizationId: {
        type: Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
      },
    },
    {
      timestamps: true,
    }
  );

// ==========================================
// INDEXES
// ==========================================

correctiveActionSchema.index({
  rca: 1,
  organizationId: 1,
});

correctiveActionSchema.index({
  organizationId: 1,
  status: 1,
});

correctiveActionSchema.index({
  organizationId: 1,
  dueDate: 1,
});

correctiveActionSchema.index({
  assignedTo: 1,
  status: 1,
});

// ==========================================
// MODEL
// ==========================================

export default mongoose.model<IRCAcorrectiveAction>(
  "RCACorrectiveAction",
  correctiveActionSchema
);
