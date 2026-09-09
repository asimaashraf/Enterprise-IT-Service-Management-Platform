import { Router } from "express";

import {
  createServiceRequestController,
  getServiceRequestsController,
  getServiceRequestController,
  updateServiceRequestController,
  deleteServiceRequestController,
} from "./serviceRequest.controller";

import {
  authenticate,
  authorize,
} from "../../middleware/auth.middleware";

const router = Router();

// ==========================================
// SERVICE REQUEST MANAGEMENT ROUTES
// ==========================================

// ==========================================
// CREATE SERVICE REQUEST
// ADMIN + EMPLOYEE
// ==========================================

router.post(
  "/",
  authenticate,
  createServiceRequestController
);

// ==========================================
// GET ALL SERVICE REQUESTS
// ADMIN + EMPLOYEE
// ORGANIZATION-SCOPED
// ==========================================

router.get(
  "/",
  authenticate,
  getServiceRequestsController
);

// ==========================================
// GET SERVICE REQUEST BY ID
// ADMIN + EMPLOYEE
// ORGANIZATION-SCOPED
// ==========================================

router.get(
  "/:id",
  authenticate,
  getServiceRequestController
);

// ==========================================
// UPDATE SERVICE REQUEST
// ADMIN + EMPLOYEE
//
// Admin:
// - Approve / reject
// - Assign employee
// - Update request
// - Manage workflow
//
// Requester:
// - Update own request
// - Cancel own request
//
// Assigned employee:
// - Process request
// - Move request to In Progress
// - Complete request
//
// Additional permissions are enforced
// inside the controller/service.
// ==========================================

router.put(
  "/:id",
  authenticate,
  updateServiceRequestController
);

// ==========================================
// DELETE SERVICE REQUEST
// ADMIN ONLY
// ==========================================

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  deleteServiceRequestController
);

export default router;