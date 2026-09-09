import { Router } from "express";

import {
  createSupportTeamController,
  getSupportTeamsController,
  getSupportTeamByIdController,
  updateSupportTeamController,
  deleteSupportTeamController,
} from "./supportTeam.controller";

import {
  authenticate,
  authorize,
} from "../../middleware/auth.middleware";

const router = Router();

// ==========================================
// CREATE SUPPORT TEAM
// ADMIN ONLY
// ==========================================

router.post(
  "/",
  authenticate,
  authorize("admin"),
  createSupportTeamController
);

// ==========================================
// GET ALL SUPPORT TEAMS
// ADMIN + EMPLOYEE
// ==========================================

router.get(
  "/",
  authenticate,
  getSupportTeamsController
);

// ==========================================
// GET SUPPORT TEAM BY ID
// ADMIN + EMPLOYEE
// ==========================================

router.get(
  "/:id",
  authenticate,
  getSupportTeamByIdController
);

// ==========================================
// UPDATE SUPPORT TEAM
// ADMIN ONLY
// ==========================================

router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  updateSupportTeamController
);

// ==========================================
// DELETE SUPPORT TEAM
// ADMIN ONLY
// ==========================================

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  deleteSupportTeamController
);

export default router;