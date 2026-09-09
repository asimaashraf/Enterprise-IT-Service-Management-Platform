import { allowedInput, rcaUpdateFields } from "./rca.validation";
import { Response } from "express";

import {
  createRCA,
  getRCAsByOrganization,
  getRCAById,
  getRCAByProblem,
  updateRCA,
  deleteRCA,
} from "./rca.service";

import { AuthRequest } from "../../middleware/auth.middleware";

// ==========================================
// CREATE RCA
// ==========================================

export const createRCAController = async (
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

    if (!req.user.organizationId) {
      return res.status(403).json({
        success: false,
        message: "Organization access is required",
      });
    }

    if (!req.user.id) {
      return res.status(401).json({
        success: false,
        message: "User authentication is required",
      });
    }

    const body = allowedInput(req.body, [...rcaUpdateFields, "rcaId", "identifiedBy", "organizationId"]);
    const rca = await createRCA({
      ...body,

      // Always take organization from authenticated user
      organizationId: req.user.organizationId,

      // Default identifiedBy to current authenticated user
      identifiedBy:
        body.identifiedBy === undefined ? req.user.id : body.identifiedBy,
    });

    return res.status(201).json({
      success: true,
      message: "RCA created successfully",
      data: rca,
    });
  } catch (error: any) {
    console.error("Create RCA Error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET ALL RCAs
// ==========================================

export const getRCAsController = async (
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

    if (!req.user.organizationId) {
      return res.status(403).json({
        success: false,
        message: "Organization access is required",
      });
    }

    const rcas = await getRCAsByOrganization(
      req.user.organizationId
    );

    return res.status(200).json({
      success: true,
      count: rcas.length,
      data: rcas,
    });
  } catch (error: any) {
    console.error("Get RCAs Error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET RCA BY ID
// ==========================================

export const getRCAController = async (
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

    if (!req.user.organizationId) {
      return res.status(403).json({
        success: false,
        message: "Organization access is required",
      });
    }

    const id = String(req.params.id);

    const rca = await getRCAById(
      id,
      req.user.organizationId
    );

    if (!rca) {
      return res.status(404).json({
        success: false,
        message: "RCA not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: rca,
    });
  } catch (error: any) {
    console.error("Get RCA Error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET RCA BY PROBLEM
// ==========================================

export const getRCAByProblemController = async (
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

    if (!req.user.organizationId) {
      return res.status(403).json({
        success: false,
        message: "Organization access is required",
      });
    }

    const problemId = String(
      req.params.problemId
    );

    const rca = await getRCAByProblem(
      problemId,
      req.user.organizationId
    );

    if (!rca) {
      return res.status(404).json({
        success: false,
        message: "No RCA found for this problem",
      });
    }

    return res.status(200).json({
      success: true,
      data: rca,
    });
  } catch (error: any) {
    console.error(
      "Get RCA By Problem Error:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// UPDATE RCA
// ==========================================

export const updateRCAController = async (
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

    if (!req.user.organizationId) {
      return res.status(403).json({
        success: false,
        message: "Organization access is required",
      });
    }

    if (!req.user.id) {
      return res.status(401).json({
        success: false,
        message: "User authentication is required",
      });
    }

    const id = String(req.params.id);

    // IMPORTANT:
    // updateRCA now expects:
    //
    // 1. RCA ID
    // 2. Organization ID
    // 3. Request body
    // 4. User role
    //
    const rca = await updateRCA(
      id,
      req.user.organizationId,
      req.body,
      req.user.role
    );

    if (!rca) {
      return res.status(404).json({
        success: false,
        message: "RCA not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "RCA updated successfully",
      data: rca,
    });
  } catch (error: any) {
    console.error("Update RCA Error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// DELETE RCA
// ==========================================

export const deleteRCAController = async (
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

    if (!req.user.organizationId) {
      return res.status(403).json({
        success: false,
        message: "Organization access is required",
      });
    }

    const id = String(req.params.id);

    const deletedRCA = await deleteRCA(
      id,
      req.user.organizationId
    );

    if (!deletedRCA) {
      return res.status(404).json({
        success: false,
        message: "RCA not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "RCA deleted successfully",
      data: deletedRCA,
    });
  } catch (error: any) {
    console.error("Delete RCA Error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};