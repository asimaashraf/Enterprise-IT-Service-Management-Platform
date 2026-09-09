import mongoose, { Document, Schema } from "mongoose";

// ==========================================
// TYPES
// ==========================================

export type ProblemPriority =
  | "Low"
  | "Medium"
  | "High"
  | "Critical";

export type ProblemStatus =
  | "Open"
  | "Under Investigation"
  | "Known Error"
  | "Resolved"
  | "Closed";

export type ProblemImpact =
  | "Low"
  | "Medium"
  | "High";

export type ProblemUrgency =
  | "Low"
  | "Medium"
  | "High";

// ==========================================
// INTERFACE
// ==========================================

export interface IProblem extends Document {
  problemId: string;
  title: string;
  description: string;

  priority: ProblemPriority;
  impact: ProblemImpact;
  urgency: ProblemUrgency;

  status: ProblemStatus;

  reportedBy: mongoose.Types.ObjectId;

  assignedTo?: mongoose.Types.ObjectId;

  organizationId: mongoose.Types.ObjectId;

  rootCause?: string;

  workaround?: string;

  resolution?: string;

  resolvedAt?: Date;

  closedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// SCHEMA
// ==========================================

const problemSchema = new Schema<IProblem>(
  {
    problemId: {
      type: String,
      required: true,
      trim: true,
    },

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

    priority: {
      type: String,
      enum: [
        "Low",
        "Medium",
        "High",
        "Critical",
      ],
      default: "Medium",
    },

    impact: {
      type: String,
      enum: [
        "Low",
        "Medium",
        "High",
      ],
      default: "Medium",
    },

    urgency: {
      type: String,
      enum: [
        "Low",
        "Medium",
        "High",
      ],
      default: "Medium",
    },

    status: {
      type: String,
      enum: [
        "Open",
        "Under Investigation",
        "Known Error",
        "Resolved",
        "Closed",
      ],
      default: "Open",
    },

    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: "AuthUser",
      required: true,
    },

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "AuthUser",
    },

    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    rootCause: {
      type: String,
      trim: true,
    },

    workaround: {
      type: String,
      trim: true,
    },

    resolution: {
      type: String,
      trim: true,
    },

    resolvedAt: {
      type: Date,
    },

    closedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// UNIQUE PROBLEM ID PER ORGANIZATION
// ==========================================

problemSchema.index(
  {
    problemId: 1,
    organizationId: 1,
  },
  {
    unique: true,
  }
);

export default mongoose.model<IProblem>(
  "Problem",
  problemSchema
);