import { Router } from "express";

import {
  createIncidentController,
  getIncidentsController,
  getIncidentController,
  exportIncidentPdfController,
  updateIncidentController,
  deleteIncidentController,
} from "./incident.controller";

import {
  authenticate,
  authorize,
} from "../../middleware/auth.middleware";

const router = Router();

// ==========================================
// CREATE INCIDENT
// ADMIN + EMPLOYEE
// ==========================================

router.post(
  "/",
  authenticate,
  createIncidentController
);

// ==========================================
// GET ALL INCIDENTS
// ADMIN + EMPLOYEE
// ==========================================

router.get(
  "/",
  authenticate,
  getIncidentsController
);

// ==========================================
// EXPORT INCIDENT PDF
// ADMIN + EMPLOYEE
// ==========================================

router.get(
  "/:id/pdf",
  authenticate,
  exportIncidentPdfController
);

// ==========================================
// GET INCIDENT BY ID
// ADMIN + EMPLOYEE
// ==========================================

router.get(
  "/:id",
  authenticate,
  getIncidentController
);

// ==========================================
// UPDATE INCIDENT
// ADMIN + EMPLOYEE
// ==========================================

router.put(
  "/:id",
  authenticate,
  updateIncidentController
);

// ==========================================
// DELETE INCIDENT
// ADMIN ONLY
// ==========================================

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  deleteIncidentController
);

export default router;