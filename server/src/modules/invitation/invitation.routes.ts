import { Router } from "express";
import {
  createInvitationController,
  listInvitationsController,
  revokeInvitationController,
  validateInvitationController,
  acceptInvitationController,
} from "./invitation.controller";
import { authenticate, authorize } from "../../middleware/auth.middleware";

const router = Router();

// ==========================================
// INVITATION ROUTES
// ==========================================
//
// Tenant-scoped, admin-only operations. The validate and accept endpoints
// are public but rely on a cryptographically-secure invitation token; the
// browser never chooses an organizationId.

// Admin: list invitations for the current admin's organization.
router.get(
  "/",
  authenticate,
  authorize("admin"),
  listInvitationsController
);

// Admin: invite a new user into the current admin's organization.
router.post(
  "/",
  authenticate,
  authorize("admin"),
  createInvitationController
);

// Admin: revoke a pending invitation in the current admin's organization.
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  revokeInvitationController
);

// Public: validate an invitation token (does not consume it).
// NOTE: this must be registered before the parameterized :id route would
// shadow it, but since we use a literal path segment, express will route
// correctly.
router.get("/validate", validateInvitationController);

// Public: accept an invitation and create the user.
router.post("/accept", acceptInvitationController);

export default router;
