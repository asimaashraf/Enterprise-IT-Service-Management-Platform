import { Router } from "express";

import {
  createDepartmentController,
  getDepartmentsController,
  getDepartmentController,
  updateDepartmentController,
  deleteDepartmentController,
} from "./department.controller";

import {
  authenticate,
  authorize,
} from "../../middleware/auth.middleware";

import { requireOrganization } from "../../middleware/organization.middleware";

const router = Router();

// ==========================================
// CREATE DEPARTMENT
// ADMIN ONLY
// ==========================================

router.post(
  "/",
  authenticate,
  requireOrganization,
  authorize("admin"),
  createDepartmentController
);

// ==========================================
// GET ALL DEPARTMENTS
// ADMIN + EMPLOYEE
// ==========================================

router.get(
  "/",
  authenticate,
  requireOrganization,
  getDepartmentsController
);

// ==========================================
// GET DEPARTMENT BY ID
// ADMIN + EMPLOYEE
// ==========================================

router.get(
  "/:id",
  authenticate,
  requireOrganization,
  getDepartmentController
);

// ==========================================
// UPDATE DEPARTMENT
// ADMIN ONLY
// ==========================================

router.put(
  "/:id",
  authenticate,
  requireOrganization,
  authorize("admin"),
  updateDepartmentController
);

// ==========================================
// DELETE DEPARTMENT
// ADMIN ONLY
// ==========================================

router.delete(
  "/:id",
  authenticate,
  requireOrganization,
  authorize("admin"),
  deleteDepartmentController
);

export default router;