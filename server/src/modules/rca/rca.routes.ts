
import { Router } from "express";

import {
  createRCAController,
  getRCAsController,
  getRCAController,
  getRCAByProblemController,
  updateRCAController,
  deleteRCAController,
} from "./rca.controller";

import {
  createCorrectiveActionController,
  getCorrectiveActionsController,
  getCorrectiveActionController,
  updateCorrectiveActionController,
  deleteCorrectiveActionController,
} from "./rcaCorrectiveAction.controller";

import {
  authenticate,
  authorize,
} from "../../middleware/auth.middleware";

const router = Router();

// ==========================================
// ALL RCA ROUTES REQUIRE AUTHENTICATION
// ==========================================

router.use(authenticate);

// ==========================================
// CREATE RCA
// ==========================================

router.post(
  "/",
  authorize("admin"),
  createRCAController
);

// ==========================================
// GET ALL RCAs
// ==========================================

router.get(
  "/",
  getRCAsController
);

// ==========================================
// ==========================================
// RCA CORRECTIVE ACTIONS
// ==========================================
// ==========================================

// ==========================================
// CREATE CORRECTIVE ACTION
// ==========================================
//
// POST
// /api/v1/rca/:id/corrective-actions
//

router.post(
  "/:id/corrective-actions",
  authorize("admin"),
  createCorrectiveActionController
);

// ==========================================
// GET ALL CORRECTIVE ACTIONS
// ==========================================
//
// GET
// /api/v1/rca/:id/corrective-actions
//

router.get(
  "/:id/corrective-actions",
  getCorrectiveActionsController
);

// ==========================================
// GET CORRECTIVE ACTION BY ID
// ==========================================
//
// GET
// /api/v1/rca/:id/corrective-actions/:actionId
//

router.get(
  "/:id/corrective-actions/:actionId",
  getCorrectiveActionController
);

// ==========================================
// UPDATE CORRECTIVE ACTION
// ==========================================
//
// PUT
// /api/v1/rca/:id/corrective-actions/:actionId
//

router.put(
  "/:id/corrective-actions/:actionId",
  authorize("admin"),
  updateCorrectiveActionController
);

// ==========================================
// DELETE CORRECTIVE ACTION
// ==========================================
//
// DELETE
// /api/v1/rca/:id/corrective-actions/:actionId
//

router.delete(
  "/:id/corrective-actions/:actionId",
  authorize("admin"),
  deleteCorrectiveActionController
);

// ==========================================
// GET RCA BY PROBLEM
// IMPORTANT:
// MUST COME BEFORE /:id
// ==========================================

router.get(
  "/problem/:problemId",
  getRCAByProblemController
);

// ==========================================
// GET RCA BY ID
// ==========================================

router.get(
  "/:id",
  getRCAController
);

// ==========================================
// UPDATE RCA
// ==========================================

router.put(
  "/:id",
  authorize("admin"),
  updateRCAController
);

// ==========================================
// DELETE RCA
// ==========================================

router.delete(
  "/:id",
  authorize("admin"),
  deleteRCAController
);

export default router;
