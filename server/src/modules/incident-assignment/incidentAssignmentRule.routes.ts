import express from "express";

import {
  createRule,
  getRules,
  getRuleById,
  updateRule,
  deleteRule,
  getApplicableRules,
} from "./incidentAssignmentRule.controller";

import {
  authenticate,
  authorize,
} from "../../middleware/auth.middleware";

const router = express.Router();

// ==========================================
// GET APPLICABLE RULES
// ==========================================
//
// GET
// /api/v1/incident-assignment-rules/applicable/:incidentPriority/:severity
//
// Example:
// /api/v1/incident-assignment-rules/applicable/High/Major
//
// IMPORTANT:
// This route must appear before "/:id"
// so "applicable" is not treated as an ID.
// ==========================================

router.get(
  "/applicable/:incidentPriority/:severity",
  authenticate,
  getApplicableRules
);

// ==========================================
// GET APPLICABLE RULES - QUERY VERSION
// ==========================================
//
// GET
// /api/v1/incident-assignment-rules/applicable
//
// Example:
// /api/v1/incident-assignment-rules/applicable?incidentPriority=High&severity=Major
// ==========================================

router.get(
  "/applicable",
  authenticate,
  getApplicableRules
);

// ==========================================
// GET ALL ASSIGNMENT RULES
// ==========================================
//
// GET
// /api/v1/incident-assignment-rules
// ==========================================

router.get(
  "/",
  authenticate,
  getRules
);

// ==========================================
// CREATE ASSIGNMENT RULE
// ADMIN ONLY
// ==========================================
//
// POST
// /api/v1/incident-assignment-rules
// ==========================================

router.post(
  "/",
  authenticate,
  authorize("admin"),
  createRule
);

// ==========================================
// GET ASSIGNMENT RULE BY ID
// ==========================================
//
// GET
// /api/v1/incident-assignment-rules/:id
// ==========================================

router.get(
  "/:id",
  authenticate,
  getRuleById
);

// ==========================================
// UPDATE ASSIGNMENT RULE
// ADMIN ONLY
// ==========================================
//
// PUT
// /api/v1/incident-assignment-rules/:id
// ==========================================

router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  updateRule
);

// ==========================================
// DELETE ASSIGNMENT RULE
// ADMIN ONLY
// ==========================================
//
// DELETE
// /api/v1/incident-assignment-rules/:id
// ==========================================

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  deleteRule
);

export default router;