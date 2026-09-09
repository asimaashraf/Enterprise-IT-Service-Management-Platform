import {
  Request,
  Response,
} from "express";

import { ParsedQs } from "qs";

import {
  IncidentPriority,
  IncidentSeverity,
} from "../incident/incident.model";

import {
  createAssignmentRule,
  getAssignmentRules,
  getAssignmentRuleById,
  updateAssignmentRule,
  deleteAssignmentRule,
  getApplicableAssignmentRules,
} from "./incidentAssignmentRule.service";

// ==========================================
// HELPERS
// ==========================================

const getAuthUser = (req: Request) => {
  return (req as any).user;
};

// ==========================================
// ROUTE PARAM HELPER
// ==========================================

const getParamString = (
  value: string | string[] | undefined
): string => {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
};

// ==========================================
// QUERY PARAM HELPER
// ==========================================

const getQueryString = (
  value:
    | string
    | ParsedQs
    | (string | ParsedQs)[]
    | undefined
): string | undefined => {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    const firstValue = value[0];

    if (typeof firstValue === "string") {
      return firstValue;
    }

    return undefined;
  }

  return undefined;
};

// ==========================================
// INCIDENT PRIORITY VALIDATION
// ==========================================

const getIncidentPriority = (
  value: string
): IncidentPriority | undefined => {
  const validPriorities: IncidentPriority[] = [
    "Low",
    "Medium",
    "High",
    "Critical",
  ];

  if (
    validPriorities.includes(
      value as IncidentPriority
    )
  ) {
    return value as IncidentPriority;
  }

  return undefined;
};

// ==========================================
// INCIDENT SEVERITY VALIDATION
// ==========================================

const getIncidentSeverity = (
  value: string
): IncidentSeverity | undefined => {
  const validSeverities: IncidentSeverity[] = [
    "Minor",
    "Major",
    "Critical",
  ];

  if (
    validSeverities.includes(
      value as IncidentSeverity
    )
  ) {
    return value as IncidentSeverity;
  }

  return undefined;
};

// ==========================================
// CREATE
// ==========================================

export const createRule = async (
  req: Request,
  res: Response
) => {
  try {
    const user = getAuthUser(req);

    const {
      name,
      description,
      ruleOrder,
      incidentPriority,
      severity,
      targetUser,
    } = req.body;

    // ==========================================
    // VALIDATE NAME
    // ==========================================

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Rule name is required",
      });
    }

    // ==========================================
    // VALIDATE RULE ORDER
    // ==========================================

    if (
      !Number.isInteger(ruleOrder) ||
      ruleOrder < 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Rule order must be a positive integer",
      });
    }

    // ==========================================
    // VALIDATE TARGET USER
    // ==========================================

    if (!targetUser) {
      return res.status(400).json({
        success: false,
        message: "Target user is required",
      });
    }

    // ==========================================
    // VALIDATE PRIORITY
    // ==========================================

    if (incidentPriority !== undefined) {
      const validPriority =
        getIncidentPriority(
          incidentPriority
        );

      if (!validPriority) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid incident priority. Allowed values: Low, Medium, High, Critical",
        });
      }
    }

    // ==========================================
    // VALIDATE SEVERITY
    // ==========================================

    if (severity !== undefined) {
      const validSeverity =
        getIncidentSeverity(severity);

      if (!validSeverity) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid severity. Allowed values: Minor, Major, Critical",
        });
      }
    }

    // ==========================================
    // CREATE RULE
    // ==========================================

    const rule =
      await createAssignmentRule({
        name,
        description,
        ruleOrder,
        incidentPriority:
          incidentPriority !== undefined
            ? getIncidentPriority(
                incidentPriority
              )
            : undefined,
        severity:
          severity !== undefined
            ? getIncidentSeverity(severity)
            : undefined,
        targetUser,
        organizationId:
          user.organizationId,
        createdBy: user.id,
      });

    return res.status(201).json({
      success: true,
      message:
        "Incident assignment rule created successfully",
      data: rule,
    });
  } catch (error: any) {
    console.error(
      "Create assignment rule error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error?.message ||
        "Failed to create assignment rule",
    });
  }
};

// ==========================================
// GET ALL
// ==========================================

export const getRules = async (
  req: Request,
  res: Response
) => {
  try {
    const user = getAuthUser(req);

    const rules =
      await getAssignmentRules(
        user.organizationId
      );

    return res.status(200).json({
      success: true,
      message:
        "Assignment rules retrieved successfully",
      data: rules,
    });
  } catch (error: any) {
    console.error(
      "Get assignment rules error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error?.message ||
        "Failed to get assignment rules",
    });
  }
};

// ==========================================
// GET BY ID
// ==========================================

export const getRuleById = async (
  req: Request,
  res: Response
) => {
  try {
    const user = getAuthUser(req);

    const ruleId = getParamString(
      req.params.id
    );

    if (!ruleId) {
      return res.status(400).json({
        success: false,
        message:
          "Assignment rule ID is required",
      });
    }

    const rule =
      await getAssignmentRuleById(
        ruleId,
        user.organizationId
      );

    if (!rule) {
      return res.status(404).json({
        success: false,
        message:
          "Assignment rule not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Assignment rule retrieved successfully",
      data: rule,
    });
  } catch (error: any) {
    console.error(
      "Get assignment rule error:",
      error
    );

    return res.status(404).json({
      success: false,
      message:
        error?.message ||
        "Assignment rule not found",
    });
  }
};

// ==========================================
// UPDATE
// ==========================================

export const updateRule = async (
  req: Request,
  res: Response
) => {
  try {
    const user = getAuthUser(req);

    const ruleId = getParamString(
      req.params.id
    );

    if (!ruleId) {
      return res.status(400).json({
        success: false,
        message:
          "Assignment rule ID is required",
      });
    }

    const rule =
      await updateAssignmentRule(
        ruleId,
        user.organizationId,
        req.body
      );

    if (!rule) {
      return res.status(404).json({
        success: false,
        message:
          "Assignment rule not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Incident assignment rule updated successfully",
      data: rule,
    });
  } catch (error: any) {
    console.error(
      "Update assignment rule error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error?.message ||
        "Failed to update assignment rule",
    });
  }
};

// ==========================================
// DELETE
// ==========================================

export const deleteRule = async (
  req: Request,
  res: Response
) => {
  try {
    const user = getAuthUser(req);

    const ruleId = getParamString(
      req.params.id
    );

    if (!ruleId) {
      return res.status(400).json({
        success: false,
        message:
          "Assignment rule ID is required",
      });
    }

    const rule =
      await deleteAssignmentRule(
        ruleId,
        user.organizationId
      );

    if (!rule) {
      return res.status(404).json({
        success: false,
        message:
          "Assignment rule not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Incident assignment rule deleted successfully",
      data: rule,
    });
  } catch (error: any) {
    console.error(
      "Delete assignment rule error:",
      error
    );

    return res.status(404).json({
      success: false,
      message:
        error?.message ||
        "Assignment rule not found",
    });
  }
};

// ==========================================
// APPLICABLE RULES
// ==========================================
//
// Supports:
//
// GET /applicable/High/Major
//
// AND
//
// GET /applicable?incidentPriority=High&severity=Major
//
// ==========================================

export const getApplicableRules = async (
  req: Request,
  res: Response
) => {
  try {
    const user = getAuthUser(req);

    // ==========================================
    // ROUTE PARAMETERS
    // ==========================================

    const routePriority =
      getParamString(
        req.params.incidentPriority
      );

    const routeSeverity =
      getParamString(
        req.params.severity
      );

    // ==========================================
    // QUERY PARAMETERS
    // ==========================================

    const queryPriority =
      getQueryString(
        req.query.incidentPriority
      );

    const querySeverity =
      getQueryString(
        req.query.severity
      );

    // ==========================================
    // RESOLVE VALUES
    // ==========================================

    const priorityValue =
      routePriority ||
      queryPriority ||
      "";

    const severityValue =
      routeSeverity ||
      querySeverity ||
      "";

    // ==========================================
    // VALIDATE PRIORITY
    // ==========================================

    if (!priorityValue) {
      return res.status(400).json({
        success: false,
        message:
          "Incident priority is required",
      });
    }

    const incidentPriority =
      getIncidentPriority(
        priorityValue
      );

    if (!incidentPriority) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid incident priority. Allowed values: Low, Medium, High, Critical",
      });
    }

    // ==========================================
    // VALIDATE SEVERITY
    // ==========================================

    if (!severityValue) {
      return res.status(400).json({
        success: false,
        message: "Severity is required",
      });
    }

    const severity =
      getIncidentSeverity(
        severityValue
      );

    if (!severity) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid severity. Allowed values: Minor, Major, Critical",
      });
    }

    // ==========================================
    // GET APPLICABLE RULES
    // ==========================================

    const rules =
      await getApplicableAssignmentRules(
        user.organizationId,
        incidentPriority,
        severity
      );

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,
      message:
        "Applicable assignment rules retrieved successfully",
      data: rules,
    });
  } catch (error: any) {
    console.error(
      "Get applicable assignment rules error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error?.message ||
        "Failed to get applicable assignment rules",
    });
  }
};