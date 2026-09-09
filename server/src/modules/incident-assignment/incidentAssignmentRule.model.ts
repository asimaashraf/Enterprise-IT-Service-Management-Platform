import mongoose, {
  Document,
  Schema,
} from "mongoose";

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

// ==========================================
// INTERFACE
// ==========================================

export interface IIncidentAssignmentRule
  extends Document {
  name: string;

  description?: string;

  ruleOrder: number;

  incidentPriority?: IncidentPriority;

  severity?: IncidentSeverity;

  targetUser: mongoose.Types.ObjectId;

  organizationId: mongoose.Types.ObjectId;

  createdBy: mongoose.Types.ObjectId;

  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;
}

// ==========================================
// SCHEMA
// ==========================================

const incidentAssignmentRuleSchema =
  new Schema<IIncidentAssignmentRule>(
    {
      // ======================================
      // NAME
      // ======================================

      name: {
        type: String,
        required: true,
        trim: true,
      },

      // ======================================
      // DESCRIPTION
      // ======================================

      description: {
        type: String,
        trim: true,
      },

      // ======================================
      // RULE ORDER
      // ======================================

      ruleOrder: {
        type: Number,
        required: true,
        min: 1,
      },

      // ======================================
      // INCIDENT PRIORITY
      // ======================================

      incidentPriority: {
        type: String,
        enum: [
          "Low",
          "Medium",
          "High",
          "Critical",
        ],
      },

      // ======================================
      // INCIDENT SEVERITY
      // ======================================

      severity: {
        type: String,
        enum: [
          "Minor",
          "Major",
          "Critical",
        ],
      },

      // ======================================
      // TARGET USER
      // ======================================

      targetUser: {
        type: Schema.Types.ObjectId,
        ref: "AuthUser",
        required: true,
      },

      // ======================================
      // ORGANIZATION
      // ======================================

      organizationId: {
        type: Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true,
      },

      // ======================================
      // CREATED BY
      // ======================================

      createdBy: {
        type: Schema.Types.ObjectId,
        ref: "AuthUser",
        required: true,
      },

      // ======================================
      // ACTIVE STATUS
      // ======================================

      isActive: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
    }
  );

// ==========================================
// INDEXES
// ==========================================

incidentAssignmentRuleSchema.index({
  organizationId: 1,
  ruleOrder: 1,
});

incidentAssignmentRuleSchema.index({
  organizationId: 1,
  isActive: 1,
});

incidentAssignmentRuleSchema.index({
  organizationId: 1,
  incidentPriority: 1,
  severity: 1,
});

// ==========================================
// MODEL
// ==========================================

const IncidentAssignmentRule =
  mongoose.models.IncidentAssignmentRule ||
  mongoose.model<IIncidentAssignmentRule>(
    "IncidentAssignmentRule",
    incidentAssignmentRuleSchema
  );

export default IncidentAssignmentRule;