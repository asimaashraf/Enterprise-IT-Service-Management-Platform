import { Router } from "express";

import {
  createProblemController,
  getProblemsController,
  getProblemController,
  updateProblemController,
  deleteProblemController,
} from "./problem.controller";

import {
  authenticate,
  authorize,
} from "../../middleware/auth.middleware";

const router = Router();

// ==========================================
// CREATE PROBLEM
// ADMIN + EMPLOYEE
// ==========================================

router.post(
  "/",
  authenticate,
  createProblemController
);

// ==========================================
// GET ALL PROBLEMS
// ADMIN + EMPLOYEE
// ==========================================

router.get(
  "/",
  authenticate,
  getProblemsController
);

// ==========================================
// GET PROBLEM BY ID
// ADMIN + EMPLOYEE
// ==========================================

router.get(
  "/:id",
  authenticate,
  getProblemController
);

// ==========================================
// UPDATE PROBLEM
// ADMIN + EMPLOYEE
// ==========================================

router.put(
  "/:id",
  authenticate,
  updateProblemController
);

// ==========================================
// DELETE PROBLEM
// ADMIN ONLY
// ==========================================

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  deleteProblemController
);

export default router;