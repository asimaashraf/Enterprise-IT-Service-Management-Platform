
import { Request, Response } from "express";

import {
  createEscalationPolicy,
  getEscalationPolicies,
  getEscalationPolicyById,
  updateEscalationPolicy,
  deleteEscalationPolicy,
  getApplicableEscalationPolicies,
} from "./incidentEscalation.service";

import { IncidentPriority } from "./incidentEscalation.model";

// ==========================================
// AUTHENTICATED REQUEST TYPE
// ==========================================

interface AuthenticatedUser {
  id: string;
  organizationId: string;
  role: string;
  email?: string;
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

// ==========================================
// CREATE POLICY
// ==========================================

export const createPolicy = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!user.organizationId) {
      return res.status(403).json({
        success: false,
        message: "Organization access is required",
      });
    }

    if (!user.id) {
      return res.status(401).json({
        success: false,
        message: "User authentication is required",
      });
    }

    const {
      name,
      description,
      priority,
      escalationLevel,
      thresholdMinutes,
      targetType,
      targetUser,
      targetTeam,
    } = req.body;

    // ==========================================
    // REQUIRED FIELD VALIDATION
    // ==========================================

    if (
      !name ||
      !priority ||
      !escalationLevel ||
      thresholdMinutes === undefined ||
      !targetType
    ) {
      return res.status(400).json({
        success: false,
        message:
          "name, priority, escalationLevel, thresholdMinutes and targetType are required",
      });
    }

    // ==========================================
    // CREATE POLICY
    // ==========================================

    const policy = await createEscalationPolicy({
      name,
      description,
      organizationId: user.organizationId,
      priority,
      escalationLevel,
      thresholdMinutes,
      targetType,
      targetUser,
      targetTeam,
      createdBy: user.id,
    });

    return res.status(201).json({
      success: true,
      message:
        "Incident escalation policy created successfully",
      data: policy,
    });
  } catch (error: any) {
    console.error(
      "Create escalation policy error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to create escalation policy",
    });
  }
};

// ==========================================
// GET ALL POLICIES
// ==========================================

export const getPolicies = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!user.organizationId) {
      return res.status(403).json({
        success: false,
        message: "Organization access is required",
      });
    }

    const policies = await getEscalationPolicies(
      user.organizationId
    );

    return res.status(200).json({
      success: true,
      count: policies.length,
      data: policies,
    });
  } catch (error: any) {
    console.error(
      "Get escalation policies error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get escalation policies",
    });
  }
};

// ==========================================
// GET APPLICABLE POLICIES
// ==========================================

export const getApplicablePolicies = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!user.organizationId) {
      return res.status(403).json({
        success: false,
        message: "Organization access is required",
      });
    }

    const priority = String(
      req.params.priority
    ) as IncidentPriority;

    // ==========================================
    // PRIORITY VALIDATION
    // ==========================================

    const allowedPriorities: IncidentPriority[] = [
      "Low",
      "Medium",
      "High",
      "Critical",
    ];

    if (!allowedPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid incident priority. Expected Low, Medium, High, or Critical",
      });
    }

    // ==========================================
    // GET APPLICABLE POLICIES
    // ==========================================

    const policies =
      await getApplicableEscalationPolicies(
        user.organizationId,
        priority
      );

    return res.status(200).json({
      success: true,
      count: policies.length,
      data: policies,
    });
  } catch (error: any) {
    console.error(
      "Get applicable escalation policies error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get applicable escalation policies",
    });
  }
};

// ==========================================
// GET POLICY BY ID
// ==========================================

export const getPolicyById = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!user.organizationId) {
      return res.status(403).json({
        success: false,
        message: "Organization access is required",
      });
    }

    const policyId = String(req.params.id);

    if (!policyId || policyId === "undefined") {
      return res.status(400).json({
        success: false,
        message: "Invalid escalation policy ID",
      });
    }

    const policy = await getEscalationPolicyById(
      policyId,
      user.organizationId
    );

    return res.status(200).json({
      success: true,
      data: policy,
    });
  } catch (error: any) {
    console.error(
      "Get escalation policy error:",
      error
    );

    const status =
      error.message ===
      "Escalation policy not found"
        ? 404
        : 400;

    return res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// UPDATE POLICY
// ==========================================

export const updatePolicy = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!user.organizationId) {
      return res.status(403).json({
        success: false,
        message: "Organization access is required",
      });
    }

    const policyId = String(req.params.id);

    if (!policyId || policyId === "undefined") {
      return res.status(400).json({
        success: false,
        message: "Invalid escalation policy ID",
      });
    }

    const policy = await updateEscalationPolicy(
      policyId,
      user.organizationId,
      req.body
    );

    return res.status(200).json({
      success: true,
      message:
        "Incident escalation policy updated successfully",
      data: policy,
    });
  } catch (error: any) {
    console.error(
      "Update escalation policy error:",
      error
    );

    const status =
      error.message ===
      "Escalation policy not found"
        ? 404
        : 400;

    return res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// DELETE POLICY
// ==========================================

export const deletePolicy = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!user.organizationId) {
      return res.status(403).json({
        success: false,
        message: "Organization access is required",
      });
    }

    const policyId = String(req.params.id);

    if (!policyId || policyId === "undefined") {
      return res.status(400).json({
        success: false,
        message: "Invalid escalation policy ID",
      });
    }

    const policy = await deleteEscalationPolicy(
      policyId,
      user.organizationId
    );

    return res.status(200).json({
      success: true,
      message:
        "Incident escalation policy deleted successfully",
      data: policy,
    });
  } catch (error: any) {
    console.error(
      "Delete escalation policy error:",
      error
    );

    const status =
      error.message ===
      "Escalation policy not found"
        ? 404
        : 400;

    return res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};
