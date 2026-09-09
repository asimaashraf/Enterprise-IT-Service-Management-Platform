import mongoose, { Document, Schema } from "mongoose";

// ==========================================
// ENUM TYPES
// ==========================================

export type ServiceRequestType =
  | "Software Installation"
  | "Hardware Purchase"
  | "Email Access"
  | "VPN Access"
  | "Account Creation"
  | "Password Reset"
  | "Cloud Resource Request";

export type ServiceRequestPriority =
  | "Low"
  | "Medium"
  | "High"
  | "Critical";

export type ServiceRequestStatus =
  | "Pending"
  | "Approved"
  | "In Progress"
  | "Completed"
  | "Rejected"
  | "Cancelled";

// ==========================================
// INTERFACE
// ==========================================

export interface IServiceRequest extends Document {
  requestId: string;

  title: string;

  description: string;

  type: ServiceRequestType;

  priority: ServiceRequestPriority;

  status: ServiceRequestStatus;

  requestedBy: mongoose.Types.ObjectId;

  assignedTo?: mongoose.Types.ObjectId;

  organizationId: mongoose.Types.ObjectId;

  approvedBy?: mongoose.Types.ObjectId;

  approvedAt?: Date;

  startedAt?: Date;

  completedAt?: Date;

  rejectedBy?: mongoose.Types.ObjectId;

  rejectedAt?: Date;

  rejectionReason?: string;

  cancelledAt?: Date;

  createdAt: Date;

  updatedAt: Date;
}

// ==========================================
// SCHEMA
// ==========================================

const serviceRequestSchema =
  new Schema<IServiceRequest>(
    {
      // ======================================
      // REQUEST ID
      // ======================================

      requestId: {
        type: String,
        required: true,
        trim: true,
      },

      // ======================================
      // BASIC INFORMATION
      // ======================================

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

      // ======================================
      // REQUEST TYPE
      // ======================================

      type: {
        type: String,
        enum: [
          "Software Installation",
          "Hardware Purchase",
          "Email Access",
          "VPN Access",
          "Account Creation",
          "Password Reset",
          "Cloud Resource Request",
        ],
        required: true,
      },

      // ======================================
      // PRIORITY
      // ======================================

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

      // ======================================
      // STATUS
      // ======================================

      status: {
        type: String,
        enum: [
          "Pending",
          "Approved",
          "In Progress",
          "Completed",
          "Rejected",
          "Cancelled",
        ],
        default: "Pending",
      },

      // ======================================
      // REQUESTER
      // ======================================

      requestedBy: {
        type: Schema.Types.ObjectId,
        ref: "AuthUser",
        required: true,
      },

      // ======================================
      // ASSIGNED EMPLOYEE
      // ======================================

      assignedTo: {
        type: Schema.Types.ObjectId,
        ref: "AuthUser",
      },

      // ======================================
      // ORGANIZATION
      // ======================================

      organizationId: {
        type: Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
      },

      // ======================================
      // APPROVAL
      // ======================================

      approvedBy: {
        type: Schema.Types.ObjectId,
        ref: "AuthUser",
      },

      approvedAt: {
        type: Date,
      },

      // ======================================
      // PROCESSING
      // ======================================

      startedAt: {
        type: Date,
      },

      // ======================================
      // COMPLETION
      // ======================================

      completedAt: {
        type: Date,
      },

      // ======================================
      // REJECTION
      // ======================================

      rejectedBy: {
        type: Schema.Types.ObjectId,
        ref: "AuthUser",
      },

      rejectedAt: {
        type: Date,
      },

      rejectionReason: {
        type: String,
        trim: true,
      },

      // ======================================
      // CANCELLATION
      // ======================================

      cancelledAt: {
        type: Date,
      },
    },
    {
      timestamps: true,
    }
  );

// ==========================================
// UNIQUE REQUEST ID PER ORGANIZATION
// ==========================================

serviceRequestSchema.index(
  {
    requestId: 1,
    organizationId: 1,
  },
  {
    unique: true,
  }
);

// ==========================================
// ORGANIZATION QUERY INDEX
// ==========================================

serviceRequestSchema.index({
  organizationId: 1,
  createdAt: -1,
});

// ==========================================
// REQUESTER QUERY INDEX
// ==========================================

serviceRequestSchema.index({
  organizationId: 1,
  requestedBy: 1,
  createdAt: -1,
});

// ==========================================
// ASSIGNED EMPLOYEE QUERY INDEX
// ==========================================

serviceRequestSchema.index({
  organizationId: 1,
  assignedTo: 1,
  status: 1,
});

// ==========================================
// EXPORT MODEL
// ==========================================

export default mongoose.model<IServiceRequest>(
  "ServiceRequest",
  serviceRequestSchema
);