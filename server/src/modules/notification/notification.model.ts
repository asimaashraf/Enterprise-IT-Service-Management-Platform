import mongoose, {
  Document,
  Schema,
} from "mongoose";

import {
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  NotificationEntityType,
} from "./notification.types";

// ==========================================
// INTERFACE
// ==========================================

export interface INotification extends Document {
  notificationId: string;

  recipient: mongoose.Types.ObjectId;

  organizationId: mongoose.Types.ObjectId;

  type: NotificationType;

  title: string;

  message: string;

  priority: NotificationPriority;

  status: NotificationStatus;

  relatedEntity?: {
    entityType: NotificationEntityType;

    entityId: mongoose.Types.ObjectId;
  };

  readAt?: Date;

  createdAt: Date;

  updatedAt: Date;
}

// ==========================================
// SCHEMA
// ==========================================

const notificationSchema =
  new Schema<INotification>(
    {
      // ======================================
      // NOTIFICATION ID
      // ======================================

      notificationId: {
        type: String,
        required: true,
        trim: true,
      },

      // ======================================
      // RECIPIENT
      // ======================================

      recipient: {
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
      },

      // ======================================
      // NOTIFICATION TYPE
      // ======================================

      type: {
        type: String,
        enum: [
          "Incident Created",
          "Incident Assigned",
          "Incident Updated",
          "Problem Assigned",
          "Problem Updated",
          "Service Request Updated",
          "Service Request Approval",
          "Change Request Updated",
          "Change Request Approval",
          "SLA Breached",
          "RCA Updated",
          "System",
        ],
        required: true,
      },

      // ======================================
      // TITLE
      // ======================================

      title: {
        type: String,
        required: true,
        trim: true,
      },

      // ======================================
      // MESSAGE
      // ======================================

      message: {
        type: String,
        required: true,
        trim: true,
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
          "Unread",
          "Read",
        ],
        default: "Unread",
      },

      // ======================================
      // RELATED ENTITY
      // ======================================

      relatedEntity: {
        entityType: {
          type: String,
          enum: [
            "Incident",
            "Problem",
            "ServiceRequest",
            "Change",
            "RCA",
            "SLA",
          ],
        },

        entityId: {
          type: Schema.Types.ObjectId,
        },
      },

      // ======================================
      // READ AT
      // ======================================

      readAt: {
        type: Date,
      },
    },
    {
      timestamps: true,
    }
  );

// ==========================================
// INDEXES
// ==========================================

// Organization notifications
notificationSchema.index({
  organizationId: 1,
  createdAt: -1,
});

// User notifications
notificationSchema.index({
  organizationId: 1,
  recipient: 1,
  createdAt: -1,
});

// Unread notifications
notificationSchema.index({
  organizationId: 1,
  recipient: 1,
  status: 1,
});

// Notification ID per organization
notificationSchema.index(
  {
    notificationId: 1,
    organizationId: 1,
  },
  {
    unique: true,
  }
);

// ==========================================
// MODEL
// ==========================================

export default mongoose.model<INotification>(
  "Notification",
  notificationSchema
);