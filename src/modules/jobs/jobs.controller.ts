import { Request, Response } from "express";
import mongoose from "mongoose";

import { jobQueue } from "../../queues/job.queue";
import { notificationQueue } from "../../jobs/queues/notification.queue";
import { authRepository } from "../auth/auth.repository";
import {
  NotificationValidationError,
  validateNotificationContent,
} from "../notification/notification.validation";

// ==========================================
// TEST JOB
// ==========================================

export const testJob = async (
  req: Request,
  res: Response
) => {
  try {
    const { message } = req.body;

    const job = await jobQueue.add(
      "test-job",
      {
        message:
          message || "Test background job",
      }
    );

    if (!job) {
      throw new Error(
        "Failed to create test job"
      );
    }

    return res.status(201).json({
      success: true,
      message:
        "Job added to queue successfully",
      jobId: job.id,
    });
  } catch (error) {
    console.error(
      "Test job error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to add job",
    });
  }
};

// ==========================================
// TEST NOTIFICATION JOB
// ==========================================

export const testNotificationJob = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      userId,
      title,
      message,
      type,
      entityType,
      entityId,
      priority,
    } = req.body;

    // ======================================
    // VALIDATION
    // ======================================

    if (
      !userId ||
      !title ||
      !message
    ) {
      return res.status(400).json({
        success: false,
        message:
          "userId, title and message are required",
      });
    }

    const user = (req as any).user;
    if (!user?.organizationId) {
      return res.status(401).json({
        success: false,
        message: "Organization information not found",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
      });
    }

    const recipient = await authRepository.findOne({
      _id: userId,
      organizationId: user.organizationId,
      isActive: true,
    });

    if (!recipient) {
      return res.status(400).json({
        success: false,
        message:
          "Notification recipient is inactive or does not belong to this organization",
      });
    }

    const content = validateNotificationContent({
      type: type || "System",
      title,
      message,
      priority,
      relatedEntity:
        entityType === undefined && entityId === undefined
          ? undefined
          : { entityType, entityId },
    });
    const { relatedEntity, ...notificationContent } = content;

    const job =
      await notificationQueue.add(
        "notification-created",
        {
          userId,
          organizationId: user.organizationId,
          ...notificationContent,
          entityType: relatedEntity?.entityType,
          entityId: relatedEntity?.entityId,
          priority: notificationContent.priority || "Medium",
        }
      );

    if (!job) {
      throw new Error(
        "Failed to create notification job"
      );
    }

    return res.status(201).json({
      success: true,
      message:
        "Notification job added successfully",
      jobId: job.id,
    });
  } catch (error) {
    if (error instanceof NotificationValidationError) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error(
      "Notification job error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to add notification job",
    });
  }
};
