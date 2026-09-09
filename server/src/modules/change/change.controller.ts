import { Response } from "express";

import {
  createChange,
  getChangesByOrganization,
  getChangeById,
  updateChange,
  deleteChange,
} from "./change.service";

import { AuthRequest } from "../../middleware/auth.middleware";

// ==========================================
// CREATE CHANGE
// ==========================================

export const createChangeController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    // ------------------------------------------
    // AUTHENTICATION CHECK
    // ------------------------------------------

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "User authentication is required",
      });
    }

    // ------------------------------------------
    // ORGANIZATION CHECK
    // ------------------------------------------

    if (!req.user.organizationId) {
      return res.status(403).json({
        success: false,
        message: "Organization access is required",
      });
    }

    // ------------------------------------------
    // CREATE CHANGE
    // ------------------------------------------

    const change = await createChange({
      ...req.body,
      requestedBy: req.user.id,
      organizationId: req.user.organizationId,
    });

    return res.status(201).json({
      success: true,
      message: "Change created successfully",
      data: change,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET ALL CHANGES
// ==========================================

export const getChangesController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    // ------------------------------------------
    // AUTHENTICATION CHECK
    // ------------------------------------------

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "User authentication is required",
      });
    }

    // ------------------------------------------
    // ORGANIZATION CHECK
    // ------------------------------------------

    if (!req.user.organizationId) {
      return res.status(403).json({
        success: false,
        message: "Organization access is required",
      });
    }

    // ------------------------------------------
    // GET CHANGES
    // ------------------------------------------

    const changes = await getChangesByOrganization(
      req.user.organizationId,
      req.user.id,
      req.user.role
    );

    return res.status(200).json({
      success: true,
      data: changes,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET CHANGE BY ID
// ==========================================

export const getChangeController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    // ------------------------------------------
    // AUTHENTICATION CHECK
    // ------------------------------------------

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "User authentication is required",
      });
    }

    // ------------------------------------------
    // ORGANIZATION CHECK
    // ------------------------------------------

    if (!req.user.organizationId) {
      return res.status(403).json({
        success: false,
        message: "Organization access is required",
      });
    }

    const changeId = req.params.id as string;

    // ------------------------------------------
    // GET CHANGE
    // ------------------------------------------

    const change = await getChangeById(
      changeId,
      req.user.organizationId,
      req.user.id,
      req.user.role
    );

    if (!change) {
      return res.status(404).json({
        success: false,
        message: "Change not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: change,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// UPDATE CHANGE
// ==========================================

export const updateChangeController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    // ------------------------------------------
    // AUTHENTICATION CHECK
    // ------------------------------------------

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "User authentication is required",
      });
    }

    // ------------------------------------------
    // ORGANIZATION CHECK
    // ------------------------------------------

    if (!req.user.organizationId) {
      return res.status(403).json({
        success: false,
        message: "Organization access is required",
      });
    }

    const hasStatusUpdate = Object.prototype.hasOwnProperty.call(
      req.body,
      "status"
    );
    const hasAssignmentUpdate = Object.prototype.hasOwnProperty.call(
      req.body,
      "assignedTo"
    );

    if (
      (hasStatusUpdate || hasAssignmentUpdate) &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only administrators can assign changes or change workflow status",
      });
    }

    const changeId = req.params.id as string;

    // ------------------------------------------
    // UPDATE CHANGE
    // ------------------------------------------
    // updateChange expects:
    //
    // 1. change ID
    // 2. organization ID
    // 3. authenticated user ID
    // 4. update data
    // ------------------------------------------

    const change = await updateChange(
      changeId,
      req.user.organizationId,
      req.user.id,
      req.user.role,
      req.body
    );

    if (!change) {
      return res.status(404).json({
        success: false,
        message: "Change not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Change updated successfully",
      data: change,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// DELETE CHANGE
// ADMIN ONLY
// ==========================================

export const deleteChangeController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    // ------------------------------------------
    // AUTHENTICATION CHECK
    // ------------------------------------------

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "User authentication is required",
      });
    }

    // ------------------------------------------
    // ORGANIZATION CHECK
    // ------------------------------------------

    if (!req.user.organizationId) {
      return res.status(403).json({
        success: false,
        message: "Organization access is required",
      });
    }

    const changeId = req.params.id as string;

    // ------------------------------------------
    // DELETE CHANGE
    // ------------------------------------------

    const change = await deleteChange(
      changeId,
      req.user.organizationId
    );

    if (!change) {
      return res.status(404).json({
        success: false,
        message: "Change not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Change deleted successfully",
      data: change,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
