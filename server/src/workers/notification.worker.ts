import { Worker, Job } from "bullmq";
import mongoose from "mongoose";

import redis from "../config/redis";
import Notification from "../modules/notification/notification.model";
import AuthUser from "../modules/auth/auth.model";

import {
  NotificationJobData,
} from "../jobs/queues/notification.queue";

// ==========================================
// GENERATE NOTIFICATION ID
// ==========================================

const generateNotificationId = (): string => {
  return `NOT-${Date.now()}-${Math.floor(
    Math.random() * 1000
  )}`;
};

// ==========================================
// PUBLISH REAL-TIME NOTIFICATION
// ==========================================
// IMPORTANT:
// The worker is a separate Node.js process from
// the API server.
//
// Therefore we publish through Redis instead
// of importing Socket.IO directly.
// ==========================================

const publishNotification = async (
  userId: string,
  notification: any,
  organizationId: string,
  type: NotificationJobData["type"],
  title: string,
  message: string,
  priority: NotificationJobData["priority"],
  relatedEntity:
    | {
        entityType:
          | "Incident"
          | "Problem"
          | "ServiceRequest"
          | "Change"
          | "RCA"
          | "SLA";

        entityId: mongoose.Types.ObjectId;
      }
    | undefined
): Promise<void> => {
  const realtimePayload = {
    _id: notification._id.toString(),

    notificationId:
      notification.notificationId,

    recipient: userId,

    organizationId,

    type,

    title,

    message,

    priority: priority || "Medium",

    status: "Unread",

    relatedEntity: relatedEntity
      ? {
          entityType:
            relatedEntity.entityType,

          entityId:
            relatedEntity.entityId.toString(),
        }
      : undefined,

    createdAt:
      notification.createdAt,

    updatedAt:
      notification.updatedAt,
  };

  await redis.publish(
    "notification:realtime",
    JSON.stringify({
      userId,
      organizationId,
      event: "notification:new",
      data: realtimePayload,
    })
  );

  console.log(
    "Real-time notification published to Redis"
  );

  console.log(
    "Recipient room:",
    `user:${userId}`
  );
};

// ==========================================
// NOTIFICATION WORKER
// ==========================================

const notificationWorker =
  new Worker<NotificationJobData>(
    "notifications",

    async (
      job: Job<NotificationJobData>
    ) => {
      console.log(
        "=========================================="
      );

      console.log(
        "Processing notification job"
      );

      console.log(
        "Job ID:",
        job.id
      );

      console.log(
        "Job Name:",
        job.name
      );

      console.log(
        "Job Data:",
        job.data
      );

      console.log(
        "=========================================="
      );

      const {
        userId,
        organizationId,
        notificationId,
        title,
        message,
        type,
        entityType,
        entityId,
        priority,
      } = job.data;

      // ========================================
      // VALIDATE RECIPIENT
      // ========================================

      if (
        !mongoose.Types.ObjectId.isValid(
          userId
        )
      ) {
        console.warn(
          `Invalid recipient ObjectId: ${userId}`
        );

        return {
          success: false,
          persisted: false,
          reason:
            "Invalid recipient ObjectId",
        };
      }

      const recipient = await AuthUser.findOne({
        _id: userId,
        organizationId,
        isActive: true,
      }).select("_id");

      if (!recipient) {
        return {
          success: false,
          persisted: false,
          reason: "Recipient is inactive or outside the organization",
        };
      }

      if (notificationId) {
        const existing = await Notification.findOne({
          notificationId,
          organizationId,
        });

        if (existing) {
          return {
            success: true,
            persisted: false,
            duplicate: true,
            notificationId: existing._id.toString(),
          };
        }
      }

      // ========================================
      // VALIDATE ORGANIZATION
      // ========================================

      if (
        !mongoose.Types.ObjectId.isValid(
          organizationId
        )
      ) {
        console.warn(
          `Invalid organization ObjectId: ${organizationId}`
        );

        return {
          success: false,
          persisted: false,
          reason:
            "Invalid organization ObjectId",
        };
      }

      // ========================================
      // VALIDATE RELATED ENTITY
      // ========================================

      let relatedEntity:
        | {
            entityType:
              | "Incident"
              | "Problem"
              | "ServiceRequest"
              | "Change"
              | "RCA"
              | "SLA";

            entityId: mongoose.Types.ObjectId;
          }
        | undefined;

      if (
        entityType &&
        entityId
      ) {
        if (
          !mongoose.Types.ObjectId.isValid(
            entityId
          )
        ) {
          throw new Error(
            `Invalid related entity ObjectId: ${entityId}`
          );
        }

        relatedEntity = {
          entityType,

          entityId:
            new mongoose.Types.ObjectId(
              entityId
            ),
        };
      }

      // ========================================
      // CREATE NOTIFICATION
      // ========================================

      const notification =
        await Notification.create({
          notificationId:
            notificationId || generateNotificationId(),

          recipient:
            new mongoose.Types.ObjectId(
              userId
            ),

          organizationId:
            new mongoose.Types.ObjectId(
              organizationId
            ),

          type,

          title,

          message,

          priority:
            priority || "Medium",

          status: "Unread",

          relatedEntity,
        });

      // ========================================
      // PUBLISH REAL-TIME EVENT
      // ========================================
      // IMPORTANT:
      // Do NOT call emitToUser() here.
      //
      // This worker is a separate process.
      // Redis Pub/Sub sends the event to the
      // API process where Socket.IO lives.
      // ========================================

      try {
        await publishNotification(
          userId,
          notification,
          organizationId,
          type,
          title,
          message,
          priority,
          relatedEntity
        );
      } catch (socketError: any) {
        // ======================================
        // REAL-TIME FAILURE MUST NOT
        // FAIL THE NOTIFICATION JOB
        // ======================================

        console.error(
          "Failed to publish real-time notification:",
          socketError.message
        );
      }

      // ========================================
      // SUCCESS LOG
      // ========================================

      console.log(
        "Notification saved to MongoDB"
      );

      console.log(
        "Notification ID:",
        notification.notificationId
      );

      console.log(
        "MongoDB Document ID:",
        notification._id.toString()
      );

      console.log(
        "Recipient:",
        userId
      );

      console.log(
        "Organization:",
        organizationId
      );

      console.log(
        "=========================================="
      );

      return {
        success: true,

        persisted: true,

        notificationId:
          notification.notificationId,
      };
    },

    {
      connection: redis,

      concurrency: 5,
    }
  );

// ==========================================
// WORKER EVENTS
// ==========================================

notificationWorker.on(
  "ready",
  () => {
    console.log(
      "Notification worker ready"
    );
  }
);

notificationWorker.on(
  "completed",
  (job) => {
    console.log(
      `Notification job completed: ${job.id}`
    );
  }
);

notificationWorker.on(
  "failed",
  (job, error) => {
    console.error(
      `Notification job failed: ${job?.id}`,
      error.message
    );
  }
);

notificationWorker.on(
  "error",
  (error) => {
    console.error(
      "Notification worker error:",
      error.message
    );
  }
);

// ==========================================
// EXPORT
// ==========================================

export default notificationWorker;