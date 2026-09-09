import mongoose, { Document, Schema } from "mongoose";

// ==========================================
// TYPES
// ==========================================

export type SLAStatus =
  | "Active"
  | "Response Breached"
  | "Resolution Breached"
  | "Completed";

export type SLAPriority =
  | "Low"
  | "Medium"
  | "High"
  | "Critical";

// ==========================================
// BUSINESS HOURS
// ==========================================

export interface SLABusinessHours {
  timezone: string;

  startHour: number;
  startMinute: number;

  endHour: number;
  endMinute: number;

  workingDays: number[];
}

// ==========================================
// INTERFACE
// ==========================================

export interface ISLA extends Document {
  incidentId: mongoose.Types.ObjectId;

  organizationId: mongoose.Types.ObjectId;

  priority: SLAPriority;

  responseTimeMinutes: number;

  resolutionTimeMinutes: number;

  responseDueAt: Date;

  resolutionDueAt: Date;

  respondedAt?: Date;

  resolvedAt?: Date;

  status: SLAStatus;

  responseBreached: boolean;

  resolutionBreached: boolean;

  responseBreachNotifiedAt?: Date;

  resolutionBreachNotifiedAt?: Date;

  escalatedPolicyIds: mongoose.Types.ObjectId[];

  businessHours: SLABusinessHours;

  createdAt: Date;

  updatedAt: Date;
}

// ==========================================
// BUSINESS HOURS SUB-SCHEMA
// ==========================================

const businessHoursSchema =
  new Schema<SLABusinessHours>(
    {
      timezone: {
        type: String,
        required: true,
        default: "Asia/Karachi",
      },

      startHour: {
        type: Number,
        required: true,
        min: 0,
        max: 23,
        default: 9,
      },

      startMinute: {
        type: Number,
        required: true,
        min: 0,
        max: 59,
        default: 0,
      },

      endHour: {
        type: Number,
        required: true,
        min: 0,
        max: 23,
        default: 17,
      },

      endMinute: {
        type: Number,
        required: true,
        min: 0,
        max: 59,
        default: 0,
      },

      workingDays: {
        type: [Number],
        required: true,
        default: [1, 2, 3, 4, 5],
      },
    },
    {
      _id: false,
    }
  );

// ==========================================
// SCHEMA
// ==========================================

const slaSchema = new Schema<ISLA>(
  {
    incidentId: {
      type: Schema.Types.ObjectId,
      ref: "Incident",
      required: true,
      unique: true,
    },

    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    priority: {
      type: String,
      enum: [
        "Low",
        "Medium",
        "High",
        "Critical",
      ],
      required: true,
    },

    responseTimeMinutes: {
      type: Number,
      required: true,
      min: 1,
    },

    resolutionTimeMinutes: {
      type: Number,
      required: true,
      min: 1,
    },

    responseDueAt: {
      type: Date,
      required: true,
    },

    resolutionDueAt: {
      type: Date,
      required: true,
    },

    respondedAt: {
      type: Date,
    },

    resolvedAt: {
      type: Date,
    },

    status: {
      type: String,
      enum: [
        "Active",
        "Response Breached",
        "Resolution Breached",
        "Completed",
      ],
      default: "Active",
    },

    responseBreached: {
      type: Boolean,
      default: false,
    },

    resolutionBreached: {
      type: Boolean,
      default: false,
    },

    responseBreachNotifiedAt: {
      type: Date,
    },

    resolutionBreachNotifiedAt: {
      type: Date,
    },

    escalatedPolicyIds: {
      type: [Schema.Types.ObjectId],
      default: [],
    },

    // ==========================================
    // BUSINESS HOURS
    // ==========================================

    businessHours: {
      type: businessHoursSchema,
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

slaSchema.index({
  organizationId: 1,
  status: 1,
});

slaSchema.index({
  organizationId: 1,
  responseDueAt: 1,
});

slaSchema.index({
  organizationId: 1,
  resolutionDueAt: 1,
});

slaSchema.index({
  organizationId: 1,
  incidentId: 1,
});

// ==========================================
// MODEL
// ==========================================

export default mongoose.model<ISLA>(
  "SLA",
  slaSchema
);