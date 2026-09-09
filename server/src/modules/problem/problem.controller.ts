import { Response } from "express";

import {
  createProblem,
  getProblemsByOrganization,
  getProblemById,
  updateProblem,
  deleteProblem,
} from "./problem.service";

import { AuthRequest } from "../../middleware/auth.middleware";

// ==========================================
// CREATE PROBLEM
// ==========================================

export const createProblemController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(403).json({
        success: false,
        message: "Organization access is required",
      });
    }

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "User authentication is required",
      });
    }

    const problem = await createProblem({
      ...req.body,
      reportedBy: req.user.id,
      organizationId: req.user.organizationId,
    });

    return res.status(201).json({
      success: true,
      message: "Problem created successfully",
      data: problem,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET ALL PROBLEMS
// ==========================================

export const getProblemsController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(403).json({
        success: false,
        message: "Organization access is required",
      });
    }

    const problems =
      await getProblemsByOrganization(
        req.user.organizationId
      );

    return res.status(200).json({
      success: true,
      data: problems,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET PROBLEM BY ID
// ==========================================

export const getProblemController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(403).json({
        success: false,
        message: "Organization access is required",
      });
    }

    const problem = await getProblemById(
      req.params.id as string,
      req.user.organizationId
    );

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Problem not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: problem,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// UPDATE PROBLEM
// ==========================================

export const updateProblemController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(403).json({
        success: false,
        message: "Organization access is required",
      });
    }

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "User authentication is required",
      });
    }

    // ==========================================
    // EMPLOYEE AUTHORIZATION
    // ==========================================

    if (
      req.user.role !== "admin" &&
      (req.body.assignedTo ||
        req.body.status === "Under Investigation" ||
        req.body.status === "Known Error" ||
        req.body.status === "Resolved" ||
        req.body.status === "Closed")
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to manage this problem",
      });
    }

    // ==========================================
    // UPDATE PROBLEM
    // ==========================================

    const problem = await updateProblem(
      req.params.id as string,
      req.user.organizationId,
      req.body
    );

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Problem not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Problem updated successfully",
      data: problem,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// DELETE PROBLEM
// ==========================================

export const deleteProblemController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(403).json({
        success: false,
        message: "Organization access is required",
      });
    }

    const problem = await deleteProblem(
      req.params.id as string,
      req.user.organizationId
    );

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Problem not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Problem deleted successfully",
      data: problem,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};