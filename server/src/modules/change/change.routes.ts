import { Router } from "express";

import {
  createChangeController,
  getChangesController,
  getChangeController,
  updateChangeController,
  deleteChangeController,
} from "./change.controller";

import {
  authenticate,
  authorize,
} from "../../middleware/auth.middleware";

const router = Router();

// ==========================================
// CREATE CHANGE
// ADMIN + EMPLOYEE
// ==========================================

router.post(
  "/",
  authenticate,
  createChangeController
);

// ==========================================
// GET ALL CHANGES
// ADMIN + EMPLOYEE
// ==========================================

router.get(
  "/",
  authenticate,
  getChangesController
);

// ==========================================
// GET CHANGE BY ID
// ADMIN + EMPLOYEE
// ==========================================

router.get(
  "/:id",
  authenticate,
  getChangeController
);

// ==========================================
// UPDATE CHANGE
// ADMIN + EMPLOYEE
// ==========================================

router.put(
  "/:id",
  authenticate,
  updateChangeController
);

// ==========================================
// DELETE CHANGE
// ADMIN ONLY
// ==========================================

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  deleteChangeController
);

export default router;