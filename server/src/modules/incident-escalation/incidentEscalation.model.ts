import mongoose, {
  Document,
  Schema,
} from "mongoose";

// ==========================================
// TYPES
// ==========================================

export type EscalationLevel =
  | "Level 1"
  | "Level 2"
  | "Level 3";

export type EscalationTargetType =
  | "User"
  | "SupportTeam";

export type IncidentPriority =
  | "Low"
  | "Medium"
  | "High"
  | "Critical";

// ==========================================
// INTERFACE
// ==========================================

export interface IIncidentEscalationPolicy
  extends Document {
  name: string;

  description?: string;

  organizationId: mongoose.Types.ObjectId;

  priority: IncidentPriority;

  escalationLevel: EscalationLevel;

  thresholdMinutes: number;

  targetType: EscalationTargetType;

  targetUser?: mongoose.Types.ObjectId;

  targetTeam?: mongoose.Types.ObjectId;

  isActive: boolean;

  createdBy: mongoose.Types.ObjectId;

  createdAt: Date;

  updatedAt: Date;
}

// ==========================================
// SCHEMA
// ==========================================

const incidentEscalationPolicySchema =
  new Schema<IIncidentEscalationPolicy>(
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      description: {
        type: String,
        trim: true,
      },

      organizationId: {
        type: Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true,
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

      escalationLevel: {
        type: String,
        enum: [
          "Level 1",
          "Level 2",
          "Level 3",
        ],
        required: true,
      },

      thresholdMinutes: {
        type: Number,
        required: true,
        min: 1,
      },

      targetType: {
        type: String,
        enum: [
          "User",
          "SupportTeam",
        ],
        required: true,
      },

      targetUser: {
        type: Schema.Types.ObjectId,
        ref: "AuthUser",
      },

      targetTeam: {
        type: Schema.Types.ObjectId,
        ref: "SupportTeam",
      },

      isActive: {
        type: Boolean,
        default: true,
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

// ==========================================
// UNIQUE POLICY NAME PER ORGANIZATION
// ==========================================

incidentEscalationPolicySchema.index(
  {
    organizationId: 1,
    name: 1,
  },
  {
    unique: true,
  }
);

// ==========================================
// POLICY LOOKUP INDEX
// ==========================================

incidentEscalationPolicySchema.index({
  organizationId: 1,
  priority: 1,
  isActive: 1,
  thresholdMinutes: 1,
});

// ==========================================
// MODEL
// ==========================================

export default mongoose.model<IIncidentEscalationPolicy>(
  "IncidentEscalationPolicy",
  incidentEscalationPolicySchema
);