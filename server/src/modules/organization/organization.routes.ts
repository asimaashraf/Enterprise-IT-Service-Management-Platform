import { Router } from "express";

import {
  createOrganizationController,
  getOrganizationsController,
  getOrganizationByIdController,
  updateOrganizationController,
  deleteOrganizationController,
} from "./organization.controller";

import {
  authenticate,
  authorize,
} from "../../middleware/auth.middleware";

import {
  requireOrganization,
} from "../../middleware/organization.middleware";

const router = Router();

// ==========================================
// ORGANIZATION ROUTES
// ==========================================

// CREATE — Admin only
router.post(
  "/",
  authenticate,
  requireOrganization,
  authorize("admin"),
  createOrganizationController
);

// GET ALL — Authenticated users
router.get(
  "/",
  authenticate,
  requireOrganization,
  getOrganizationsController
);

// GET ONE — Authenticated users
router.get(
  "/:id",
  authenticate,
  requireOrganization,
  getOrganizationByIdController
);

// UPDATE — Admin only
router.put(
  "/:id",
  authenticate,
  requireOrganization,
  authorize("admin"),
  updateOrganizationController
);

// DELETE — Admin only
router.delete(
  "/:id",
  authenticate,
  requireOrganization,
  authorize("admin"),
  deleteOrganizationController
);

export default router;