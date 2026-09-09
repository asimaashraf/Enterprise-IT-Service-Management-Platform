import { Response } from "express";

import {
  createUser,
  getUsersByOrganization,
  getEligibleOperationalAssignees,
  getUserById,
  updateUser,
  deactivateUser,
  activateUser,
  blockUser,
  changeUserRole,
} from "./user.service";

import { AuthRequest } from "../../middleware/auth.middleware";

// ==========================================
// HELPERS
// ==========================================

const sanitize = (user: any) => {
  if (!user) return null;
  const obj = typeof user.toObject === "function" ? user.toObject() : user;
  const { password, __v, ...rest } = obj;
  return { id: rest._id, ...rest };
};

const ensureAdminInOrganization = (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return false;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({
      success: false,
      message: "You are not authorized to perform this action",
    });
    return false;
  }
  if (!req.user.organizationId) {
    res.status(403).json({
      success: false,
      message: "Organization access is required",
    });
    return false;
  }
  return true;
};

// ==========================================
// CREATE USER
// ==========================================

export const createUserController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!ensureAdminInOrganization(req, res)) return;

    const user = await createUser({
      ...req.body,
      organizationId: req.user!.organizationId,
    });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: sanitize(user),
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET USERS
// ==========================================

export const getUsersController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!ensureAdminInOrganization(req, res)) return;

    const users = await getUsersByOrganization(req.user!.organizationId);

    res.status(200).json({
      success: true,
      data: users.map(sanitize),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET ELIGIBLE OPERATIONAL ASSIGNEES
// ==========================================

export const getEligibleOperationalAssigneesController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!ensureAdminInOrganization(req, res)) return;

    const users = await getEligibleOperationalAssignees(
      req.user!.organizationId
    );

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET USER BY ID
// ==========================================

export const getUserController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!ensureAdminInOrganization(req, res)) return;

    const user = await getUserById(
      req.params.id as string,
      req.user!.organizationId
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: sanitize(user),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// UPDATE USER
// ==========================================

export const updateUserController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!ensureAdminInOrganization(req, res)) return;

    const user = await updateUser(
      req.params.id as string,
      req.user!.organizationId,
      req.body
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: sanitize(user),
    });
  } catch (error: any) {
    const status = error.message.includes("last active administrator")
      ? 409
      : 400;
    res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// DEACTIVATE USER
// ==========================================

export const deactivateUserController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!ensureAdminInOrganization(req, res)) return;

    // Prevent self-deactivation through this endpoint — admins use the
    // dedicated admin-revocation flow or another admin to disable their
    // own access.
    if (req.user!.id === req.params.id) {
      return res.status(409).json({
        success: false,
        message:
          "You cannot deactivate your own account. Ask another administrator to do it.",
      });
    }

    const user = await deactivateUser(
      req.params.id as string,
      req.user!.organizationId
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User deactivated successfully",
      data: sanitize(user),
    });
  } catch (error: any) {
    const status = error.message.includes("last active administrator")
      ? 409
      : 500;
    res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// ACTIVATE USER
// ==========================================

export const activateUserController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!ensureAdminInOrganization(req, res)) return;

    const user = await activateUser(
      req.params.id as string,
      req.user!.organizationId
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User activated successfully",
      data: sanitize(user),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// BLOCK USER (soft-delete)
// ==========================================

export const blockUserController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!ensureAdminInOrganization(req, res)) return;

    if (req.user!.id === req.params.id) {
      return res.status(409).json({
        success: false,
        message:
          "You cannot block your own account. Ask another administrator to do it.",
      });
    }

    const user = await blockUser(
      req.params.id as string,
      req.user!.organizationId
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User blocked successfully",
      data: sanitize(user),
    });
  } catch (error: any) {
    const status = error.message.includes("last active administrator")
      ? 409
      : 500;
    res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// CHANGE USER ROLE
// ==========================================

export const changeUserRoleController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!ensureAdminInOrganization(req, res)) return;

    const { role } = req.body;
    if (role !== "admin" && role !== "employee") {
      return res.status(400).json({
        success: false,
        message: "Role must be 'admin' or 'employee'",
      });
    }

    // Prevent self-demotion to keep at least one admin in the org.
    if (
      req.user!.id === req.params.id &&
      role === "employee"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "You cannot demote yourself. Ask another administrator to do it.",
      });
    }

    const user = await changeUserRole(
      req.params.id as string,
      req.user!.organizationId,
      role
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User role updated successfully",
      data: sanitize(user),
    });
  } catch (error: any) {
    const status = error.message.includes("last active administrator")
      ? 409
      : 400;
    res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};
