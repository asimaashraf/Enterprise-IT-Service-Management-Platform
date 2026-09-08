import { Router } from "express";

import { authenticate, authorize } from "../../middleware/auth.middleware";

import {
  createNotificationController,
  getUserNotificationsController,
  getNotificationByIdController,
  getUnreadNotificationCountController,
  markNotificationAsReadController,
  markAllNotificationsAsReadController,
  deleteNotificationController,
} from "./notification.controller";

const router = Router();

// ==========================================
// ALL NOTIFICATION ROUTES REQUIRE AUTH
// ==========================================

router.use(authenticate);

// ==========================================
// CREATE NOTIFICATION
// ==========================================

router.post(
  "/",
  authorize("admin"),
  createNotificationController
);

// ==========================================
// GET CURRENT USER NOTIFICATIONS
// ==========================================

router.get(
  "/",
  getUserNotificationsController
);

// ==========================================
// GET UNREAD COUNT
// ==========================================

router.get(
  "/unread-count",
  getUnreadNotificationCountController
);

// ==========================================
// MARK ALL AS READ
// ==========================================

router.patch(
  "/read-all",
  markAllNotificationsAsReadController
);

// ==========================================
// GET NOTIFICATION BY ID
// ==========================================

router.get(
  "/:id",
  getNotificationByIdController
);

// ==========================================
// MARK ONE AS READ
// ==========================================

router.patch(
  "/:id/read",
  markNotificationAsReadController
);

// ==========================================
// DELETE NOTIFICATION
// ==========================================

router.delete(
  "/:id",
  deleteNotificationController
);

export default router;
