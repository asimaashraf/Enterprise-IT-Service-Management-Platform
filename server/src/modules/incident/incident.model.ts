import mongoose, { Document, Schema } from "mongoose";

// ==========================================
// TYPES
// ==========================================

export type IncidentPriority =
  | "Low"
  | "Medium"
  | "High"
  | "Critical";

export type IncidentSeverity =
  | "Minor"
  | "Major"
  | "Critical";

export type IncidentStatus =
  | "Open"
  | "In Progress"
  | "Pending"
  | "Resolved"
  | "Closed";

// ==========================================
// INTERFACE
// ==========================================

export interface IIncident extends Document {
  incidentId: string;

  title: string;

  description: string;

  priority: IncidentPriority;

  severity: IncidentSeverity;

  status: IncidentStatus;

  reportedBy: mongoose.Types.ObjectId;

  assignedTo?: mongoose.Types.ObjectId;

  organizationId: mongoose.Types.ObjectId;

  resolution?: string;

  resolvedAt?: Date;

  closedAt?: Date;

  createdAt: Date;

  updatedAt: Date;
}

// ==========================================
// SCHEMA
// ==========================================

const incidentSchema = new Schema<IIncident>(
  {
    incidentId: {
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

    severity: {
      type: String,
      enum: [
        "Minor",
        "Major",
        "Critical",
      ],
      default: "Minor",
    },

    status: {
      type: String,
      enum: [
        "Open",
        "In Progress",
        "Pending",
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
// UNIQUE INCIDENT ID PER ORGANIZATION
// ==========================================

incidentSchema.index(
  {
    incidentId: 1,
    organizationId: 1,
  },
  {
    unique: true,
  }
);

// ==========================================
// INDEXES FOR TENANT + STATUS
// ==========================================

incidentSchema.index({
  organizationId: 1,
  status: 1,
});

incidentSchema.index({
  organizationId: 1,
  priority: 1,
});

// ==========================================
// MODEL
// ==========================================

export default mongoose.model<IIncident>(
  "Incident",
  incidentSchema
);