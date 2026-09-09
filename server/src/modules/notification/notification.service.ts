import mongoose from "mongoose";

import { notificationRepository } from "./notification.repository";
import { authRepository } from "../auth/auth.repository";
import notificationQueue, {
  NotificationJobData,
} from "../../jobs/queues/notification.queue";

import {
  NotificationType,
  NotificationPriority,
} from "./notification.types";

// ==========================================
// TYPES
// ==========================================

interface CreateNotificationData {
  notificationId?: string;

  recipient: string;

  organizationId: string;

  type: NotificationType;

  title: string;

  message: string;

  priority?: NotificationPriority;

  relatedEntity?: {
    entityType:
      | "Incident"
      | "Problem"
      | "ServiceRequest"
      | "Change"
      | "RCA"
      | "SLA";

    entityId: string;
  };
}

export interface QueueNotificationEventData {
  eventKey: string;
  recipients: string[];
  organizationId: string;
  title: string;
  message: string;
  type: NotificationJobData["type"];
  entityType?: NotificationJobData["entityType"];
  entityId?: string;
  priority?: NotificationJobData["priority"];
}

// ==========================================
// OBJECT ID VALIDATION
// ==========================================

const validateObjectId = (
  id: string,
  fieldName: string
): mongoose.Types.ObjectId => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${fieldName}`);
  }

  return new mongoose.Types.ObjectId(id);
};

// ==========================================
// GENERATE NOTIFICATION ID
// ==========================================

const generateNotificationId = (): string => {
  return `NOT-${Date.now()}-${Math.floor(
    Math.random() * 1000
  )}`;
};

// ==========================================
// CREATE NOTIFICATION
// ==========================================

export const createNotification = async (
  data: CreateNotificationData
) => {
  const recipient = validateObjectId(
    data.recipient,
    "recipient ID"
  );

  const organizationId = validateObjectId(
    data.organizationId,
    "organization ID"
  );

  const recipientUser = await authRepository.findOne({
    _id: recipient,
    organizationId,
    isActive: true,
  });

  if (!recipientUser) {
    throw new Error(
      "Notification recipient is inactive or does not belong to this organization"
    );
  }

  let relatedEntity;

  if (data.relatedEntity) {
    const entityId = validateObjectId(
      data.relatedEntity.entityId,
      "related entity ID"
    );

    relatedEntity = {
      entityType: data.relatedEntity.entityType,
      entityId,
    };
  }

  return notificationRepository.create({
    notificationId:
      data.notificationId ||
      generateNotificationId(),

    recipient,

    organizationId,

    type: data.type,

    title: data.title,

    message: data.message,

    priority:
      data.priority || "Medium",

    status: "Unread",

    relatedEntity,
  });
};

export const queueNotificationEvent = async (
  data: QueueNotificationEventData
): Promise<number> => {
  const organizationId = validateObjectId(
    data.organizationId,
    "organization ID"
  );

  const uniqueRecipients = [...new Set(data.recipients)];
  let queued = 0;

  for (const recipientId of uniqueRecipients) {
    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      continue;
    }

    let recipient;

    try {
      recipient = await authRepository.findOne({
        _id: recipientId,
        organizationId,
        isActive: true,
      });
    } catch (error: any) {
      console.error(
        "Failed to validate notification recipient:",
        error?.message || error
      );
      continue;
    }

    if (!recipient) {
      continue;
    }

    const notificationId = `NOT-${data.eventKey}-${recipientId}`;
    const jobId = `notification-${data.eventKey}-${recipientId}`;

    try {
      await notificationQueue.add(
        "notification-created",
        {
          notificationId,
          userId: recipientId,
          organizationId: organizationId.toString(),
          title: data.title,
          message: data.message,
          type: data.type,
          entityType: data.entityType,
          entityId: data.entityId,
          priority: data.priority || "Medium",
        },
        {
          jobId,
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        }
      );

      queued += 1;
    } catch (error: any) {
      console.error(
        "Failed to queue notification event:",
        error?.message || error
      );
    }
  }

  return queued;
};

// ==========================================
// GET USER NOTIFICATIONS
// ==========================================

export const getUserNotifications = async (
  userId: string,
  organizationId: string
) => {
  const recipient = validateObjectId(
    userId,
    "user ID"
  );

  const orgId = validateObjectId(
    organizationId,
    "organization ID"
  );

  return notificationRepository.findByUser(
    recipient,
    orgId
  );
};

// ==========================================
// GET NOTIFICATION BY ID
// ==========================================

export const getNotificationById = async (
  notificationId: string,
  userId: string,
  organizationId: string
) => {
  const notificationObjectId =
    validateObjectId(
      notificationId,
      "notification ID"
    );

  const userObjectId = validateObjectId(
    userId,
    "user ID"
  );

  const orgObjectId = validateObjectId(
    organizationId,
    "organization ID"
  );

  const notification =
    await notificationRepository.findByIdForUser(
      notificationObjectId,
      userObjectId,
      orgObjectId
    );

  if (!notification) {
    throw new Error(
      "Notification not found"
    );
  }

  return notification;
};

// ==========================================
// GET UNREAD COUNT
// ==========================================

export const getUnreadNotificationCount =
  async (
    userId: string,
    organizationId: string
  ) => {
    const recipient = validateObjectId(
      userId,
      "user ID"
    );

    const orgId = validateObjectId(
      organizationId,
      "organization ID"
    );

    return notificationRepository.countUnread(
      recipient,
      orgId
    );
  };

// ==========================================
// MARK NOTIFICATION AS READ
// ==========================================

export const markNotificationAsRead =
  async (
    notificationId: string,
    userId: string,
    organizationId: string
  ) => {
    const notificationObjectId =
      validateObjectId(
        notificationId,
        "notification ID"
      );

    const recipient = validateObjectId(
      userId,
      "user ID"
    );

    const orgId = validateObjectId(
      organizationId,
      "organization ID"
    );

    const notification =
      await notificationRepository.markAsRead(
        notificationObjectId,
        recipient,
        orgId
      );

    if (!notification) {
      throw new Error(
        "Notification not found"
      );
    }

    return notification;
  };

// ==========================================
// MARK ALL NOTIFICATIONS AS READ
// ==========================================

export const markAllNotificationsAsRead =
  async (
    userId: string,
    organizationId: string
  ) => {
    const recipient = validateObjectId(
      userId,
      "user ID"
    );

    const orgId = validateObjectId(
      organizationId,
      "organization ID"
    );

    const result =
      await notificationRepository.markAllAsRead(
        recipient,
        orgId
      );

    return {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    };
  };

// ==========================================
// DELETE NOTIFICATION
// ==========================================

export const deleteNotification = async (
  notificationId: string,
  userId: string,
  organizationId: string
) => {
  const notificationObjectId =
    validateObjectId(
      notificationId,
      "notification ID"
    );

  const recipient = validateObjectId(
    userId,
    "user ID"
  );

  const orgId = validateObjectId(
    organizationId,
    "organization ID"
  );

  const notification =
    await notificationRepository.deleteForUser(
      notificationObjectId,
      recipient,
      orgId
    );

  if (!notification) {
    throw new Error(
      "Notification not found"
    );
  }

  return notification;
};