import { Request, Response } from "express";

import {
  createNotification,
  getUserNotifications,
  getNotificationById,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "./notification.service";
import {
  NotificationValidationError,
  validateNotificationContent,
} from "./notification.validation";

// ==========================================
// CREATE NOTIFICATION
// ==========================================

export const createNotificationController = async (
  req: Request,
  res: Response
) => {
  try {
    const recipient = req.body?.recipient;
    if (typeof recipient !== "string") {
      return res.status(400).json({
        success: false,
        message:
          "recipient, type, title and message are required",
      });
    }

    const user = (req as any).user;

    if (!user?.organizationId) {
      return res.status(401).json({
        success: false,
        message:
          "Organization information not found",
      });
    }

    const content = validateNotificationContent(req.body);

    const notification =
      await createNotification({
        recipient,
        organizationId: user.organizationId,
        ...content,
      });

    return res.status(201).json({
      success: true,
      message:
        "Notification created successfully",
      data: notification,
    });
  } catch (error: any) {
    if (
      error instanceof NotificationValidationError ||
      error.message === "Invalid recipient ID" ||
      error.message === "Invalid organization ID" ||
      error.message === "Invalid related entity ID" ||
      error.message === "Notification recipient is inactive or does not belong to this organization"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET USER NOTIFICATIONS
// ==========================================

export const getUserNotificationsController =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const user = (req as any).user;

      if (
        !user?.id ||
        !user?.organizationId
      ) {
        return res.status(401).json({
          success: false,
          message:
            "User authentication information not found",
        });
      }

      const notifications =
        await getUserNotifications(
          user.id,
          user.organizationId
        );

      return res.status(200).json({
        success: true,
        count: notifications.length,
        data: notifications,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

// ==========================================
// GET NOTIFICATION BY ID
// ==========================================

export const getNotificationByIdController =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const id = String(req.params.id);

      const user = (req as any).user;

      if (
        !user?.id ||
        !user?.organizationId
      ) {
        return res.status(401).json({
          success: false,
          message:
            "User authentication information not found",
        });
      }

      const notification =
        await getNotificationById(
          id,
          user.id,
          user.organizationId
        );

      return res.status(200).json({
        success: true,
        data: notification,
      });
    } catch (error: any) {
      const statusCode =
        error.message ===
        "Notification not found"
          ? 404
          : 500;

      return res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    }
  };

// ==========================================
// GET UNREAD COUNT
// ==========================================

export const getUnreadNotificationCountController =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const user = (req as any).user;

      if (
        !user?.id ||
        !user?.organizationId
      ) {
        return res.status(401).json({
          success: false,
          message:
            "User authentication information not found",
        });
      }

      const count =
        await getUnreadNotificationCount(
          user.id,
          user.organizationId
        );

      return res.status(200).json({
        success: true,
        data: {
          unreadCount: count,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

// ==========================================
// MARK ONE AS READ
// ==========================================

export const markNotificationAsReadController =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const id = String(req.params.id);

      const user = (req as any).user;

      if (
        !user?.id ||
        !user?.organizationId
      ) {
        return res.status(401).json({
          success: false,
          message:
            "User authentication information not found",
        });
      }

      const notification =
        await markNotificationAsRead(
          id,
          user.id,
          user.organizationId
        );

      return res.status(200).json({
        success: true,
        message:
          "Notification marked as read",
        data: notification,
      });
    } catch (error: any) {
      const statusCode =
        error.message ===
        "Notification not found"
          ? 404
          : 500;

      return res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    }
  };

// ==========================================
// MARK ALL AS READ
// ==========================================

export const markAllNotificationsAsReadController =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const user = (req as any).user;

      if (
        !user?.id ||
        !user?.organizationId
      ) {
        return res.status(401).json({
          success: false,
          message:
            "User authentication information not found",
        });
      }

      const result =
        await markAllNotificationsAsRead(
          user.id,
          user.organizationId
        );

      return res.status(200).json({
        success: true,
        message:
          "All notifications marked as read",
        data: result,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

// ==========================================
// DELETE NOTIFICATION
// ==========================================

export const deleteNotificationController =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const id = String(req.params.id);

      const user = (req as any).user;

      if (
        !user?.id ||
        !user?.organizationId
      ) {
        return res.status(401).json({
          success: false,
          message:
            "User authentication information not found",
        });
      }

      const notification =
        await deleteNotification(
          id,
          user.id,
          user.organizationId
        );

      return res.status(200).json({
        success: true,
        message:
          "Notification deleted successfully",
        data: notification,
      });
    } catch (error: any) {
      const statusCode =
        error.message ===
        "Notification not found"
          ? 404
          : 500;

      return res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    }
  };
