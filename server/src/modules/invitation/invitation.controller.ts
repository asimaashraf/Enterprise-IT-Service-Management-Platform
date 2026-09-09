import { Request, Response } from "express";
import {
  createInvitation,
  validateInvitation,
  acceptInvitation,
  listInvitations,
  revokeInvitation,
} from "./invitation.service";
import { AuthRequest } from "../../middleware/auth.middleware";

// ==========================================
// CREATE INVITATION — admin only
// POST /api/v1/invitations
// ==========================================

export const createInvitationController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only administrators may invite users",
      });
    }
    const { email, role } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }
    if (role && role !== "admin" && role !== "employee") {
      return res.status(400).json({
        success: false,
        message: "Role must be 'admin' or 'employee'",
      });
    }

    const invitation = await createInvitation(
      req.user.id,
      req.user.organizationId,
      email,
      role || "employee"
    );

    return res.status(201).json({
      success: true,
      message: "Invitation sent successfully",
      data: invitation,
    });
  } catch (error: any) {
    const status =
      error.message.includes("already exists") ||
      error.message.includes("pending invitation")
        ? 409
        : 400;
    return res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// LIST INVITATIONS — admin only
// GET /api/v1/invitations
// ==========================================

export const listInvitationsController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only administrators may view invitations",
      });
    }

    const invitations = await listInvitations(req.user.organizationId);
    return res.status(200).json({
      success: true,
      data: invitations,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// REVOKE INVITATION — admin only
// DELETE /api/v1/invitations/:id
// ==========================================

export const revokeInvitationController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only administrators may revoke invitations",
      });
    }

    const invitation = await revokeInvitation(
      req.params.id as string,
      req.user.organizationId
    );
    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: "Invitation not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Invitation revoked",
      data: invitation,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// VALIDATE INVITATION — public
// GET /api/v1/invitations/validate?token=...
// ==========================================

export const validateInvitationController = async (
  req: Request,
  res: Response
) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invitation token is required",
      });
    }

    const details = await validateInvitation(token);

    return res.status(200).json({
      success: true,
      data: details,
    });
  } catch (error: any) {
    const msg = error.message || "";
    const isNotFound = msg === "Invitation not found";
    const gonePatterns = [
      "already been accepted",
      "already exists",
      "revoked",
      "expired",
      "no longer valid",
    ];
    const isGone = gonePatterns.some(p => msg.includes(p));
    const status = isNotFound ? 400 : isGone ? 410 : 400;
    return res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// ACCEPT INVITATION — public
// POST /api/v1/invitations/accept
// ==========================================

export const acceptInvitationController = async (
  req: Request,
  res: Response
) => {
  try {
    const { token, name, password } = req.body;
    if (!token || typeof token !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invitation token is required",
      });
    }
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must be at least 2 characters",
      });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const result = await acceptInvitation(token, name.trim(), password);

    return res.status(201).json({
      success: true,
      message: "Account created. You can now sign in.",
      data: {
        user: result.user,
        organizationName: result.organizationName,
      },
    });
  } catch (error: any) {
    const msg = error.message || "";
    // "Invalid or expired invitation" without a record is a bad request;
    // all other "not consumable" reasons are 410 Gone.
    const status = msg.includes("Invalid or expired invitation")
      ? 400
      : [
          "already been accepted",
          "already exists",
          "revoked",
          "expired",
          "no longer valid",
        ].some(p => msg.includes(p))
      ? 410
      : 400;
    return res.status(status).json({
      success: false,
      message: msg,
    });
  }
};
