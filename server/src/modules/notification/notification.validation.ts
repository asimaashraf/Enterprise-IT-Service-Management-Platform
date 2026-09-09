import mongoose from "mongoose";

import {
  NotificationEntityType,
  NotificationPriority,
  NotificationType,
  notificationEntityTypes,
  notificationPriorities,
  notificationTypes,
} from "./notification.types";

export class NotificationValidationError extends Error {}

export interface ValidatedNotificationContent {
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  relatedEntity?: {
    entityType: NotificationEntityType;
    entityId: string;
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const requiredText = (value: unknown, field: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new NotificationValidationError(`${field} is required`);
  }

  return value.trim();
};

export const validateNotificationContent = (
  value: unknown
): ValidatedNotificationContent => {
  if (!isRecord(value)) {
    throw new NotificationValidationError("Notification payload must be an object");
  }

  const type = requiredText(value.type, "type");
  if (!notificationTypes.includes(type as NotificationType)) {
    throw new NotificationValidationError("Invalid notification type");
  }

  let priority: NotificationPriority | undefined;
  if (value.priority !== undefined) {
    if (typeof value.priority !== "string" || !notificationPriorities.includes(value.priority as NotificationPriority)) {
      throw new NotificationValidationError("Invalid notification priority");
    }
    priority = value.priority as NotificationPriority;
  }

  let relatedEntity: ValidatedNotificationContent["relatedEntity"];
  if (value.relatedEntity !== undefined) {
    if (!isRecord(value.relatedEntity)) {
      throw new NotificationValidationError("relatedEntity must be an object");
    }

    const entityType = value.relatedEntity.entityType;
    const entityId = value.relatedEntity.entityId;
    if (typeof entityType !== "string" || !notificationEntityTypes.includes(entityType as NotificationEntityType)) {
      throw new NotificationValidationError("Invalid related entity type");
    }
    if (typeof entityId !== "string" || !mongoose.Types.ObjectId.isValid(entityId)) {
      throw new NotificationValidationError("Invalid related entity ID");
    }

    relatedEntity = {
      entityType: entityType as NotificationEntityType,
      entityId,
    };
  }

  return {
    type: type as NotificationType,
    title: requiredText(value.title, "title"),
    message: requiredText(value.message, "message"),
    priority,
    relatedEntity,
  };
};
