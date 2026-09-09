import { Router } from "express";

import {
  createUserController,
  getUsersController,
  getEligibleOperationalAssigneesController,
  getUserController,
  updateUserController,
  deactivateUserController,
  activateUserController,
  blockUserController,
  changeUserRoleController,
} from "./user.controller";

import {
  authenticate,
  authorize,
} from "../../middleware/auth.middleware";

const router = Router();

// ==========================================
// USER MANAGEMENT ROUTES (Admin only)
//
// All routes are tenant-scoped: the organizationId is taken from the
// authenticated admin's JWT. The browser cannot influence it.
// ==========================================

// CREATE USER — Admin only (legacy direct-create; prefer invitations)
router.post(
  "/",
  authenticate,
  authorize("admin"),
  createUserController
);

// GET ALL USERS — Admin only
router.get(
  "/",
  authenticate,
  authorize("admin"),
  getUsersController
);

// GET ONE USER — Admin only
router.get(
  "/eligible-assignees",
  authenticate,
  authorize("admin"),
  getEligibleOperationalAssigneesController
);

router.get(
  "/:id",
  authenticate,
  authorize("admin"),
  getUserController
);

// UPDATE USER — Admin only
router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  updateUserController
);

// CHANGE USER ROLE — Admin only
router.patch(
  "/:id/role",
  authenticate,
  authorize("admin"),
  changeUserRoleController
);

// ACTIVATE USER — Admin only
router.patch(
  "/:id/activate",
  authenticate,
  authorize("admin"),
  activateUserController
);

// DEACTIVATE USER — Admin only
router.patch(
  "/:id/deactivate",
  authenticate,
  authorize("admin"),
  deactivateUserController
);

// BLOCK USER (soft-delete) — Admin only
router.patch(
  "/:id/block",
  authenticate,
  authorize("admin"),
  blockUserController
);

export default router;
