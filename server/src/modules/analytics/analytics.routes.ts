import { Router } from "express";

import {
  getTechnicianPerformanceController,
  getIncidentTrendsController,
  getSLAComplianceController,
  getResolutionTimeController,
  getAssetHealthController,
  getChangeSuccessRateController,
} from "./analytics.controller";

import {
  authenticate,
} from "../../middleware/auth.middleware";

const router = Router();

// ==========================================
// INCIDENT TRENDS
// ADMIN + EMPLOYEE
// ==========================================

router.get(
  "/incident-trends",
  authenticate,
  getIncidentTrendsController
);

// ==========================================
// SLA COMPLIANCE
// ADMIN + EMPLOYEE
// ==========================================

router.get(
  "/sla-compliance",
  authenticate,
  getSLAComplianceController
);

// ==========================================
// RESOLUTION TIME
// ADMIN + EMPLOYEE
// ==========================================

router.get(
  "/resolution-time",
  authenticate,
  getResolutionTimeController
);

// ==========================================
// TECHNICIAN PERFORMANCE
// ADMIN + EMPLOYEE
// ==========================================

router.get(
  "/technician-performance",
  authenticate,
  getTechnicianPerformanceController
);

// ==========================================
// ASSET HEALTH
// ADMIN + EMPLOYEE
// ==========================================

router.get(
  "/asset-health",
  authenticate,
  getAssetHealthController
);

// ==========================================
// CHANGE SUCCESS RATE
// ADMIN + EMPLOYEE
// ==========================================

router.get(
  "/change-success-rate",
  authenticate,
  getChangeSuccessRateController
);

export default router;