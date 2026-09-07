
import { Router } from "express";

import {
  createPolicy,
  getPolicies,
  getApplicablePolicies,
  getPolicyById,
  updatePolicy,
  deletePolicy,
} from "./incidentEscalation.controller";

import {
  authenticate,
  authorize,
} from "../../middleware/auth.middleware";

const router = Router();

// ==========================================
// INCIDENT ESCALATION POLICY ROUTES
// ==========================================

// ==========================================
// GET ALL ESCALATION POLICIES
// GET /
// ==========================================

router.get(
  "/",
  authenticate,
  authorize("admin"),
  getPolicies
);

// ==========================================
// GET APPLICABLE ESCALATION POLICIES
// GET /applicable/:priority
//
// IMPORTANT:
// This route MUST be declared before /:id
// so "applicable" is not interpreted as an ID.
// ==========================================

router.get(
  "/applicable/:priority",
  authenticate,
  authorize("admin"),
  getApplicablePolicies
);

// ==========================================
// GET ESCALATION POLICY BY ID
// GET /:id
// ==========================================

router.get(
  "/:id",
  authenticate,
  authorize("admin"),
  getPolicyById
);

// ==========================================
// CREATE ESCALATION POLICY
// POST /
// Admin only
// ==========================================

router.post(
  "/",
  authenticate,
  authorize("admin"),
  createPolicy
);

// ==========================================
// UPDATE ESCALATION POLICY
// PUT /:id
// Admin only
// ==========================================

router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  updatePolicy
);

// ==========================================
// DELETE ESCALATION POLICY
// DELETE /:id
// Admin only
// ==========================================

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  deletePolicy
);

export default router;
