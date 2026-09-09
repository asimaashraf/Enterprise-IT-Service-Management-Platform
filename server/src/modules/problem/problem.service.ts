import mongoose from "mongoose";

import {
  ProblemImpact,
  ProblemPriority,
  ProblemStatus,
  ProblemUrgency,
} from "./problem.model";

import { authRepository } from "../auth/auth.repository";
import { problemRepository } from "./problem.repository";

// ==========================================
// TYPES
// ==========================================

interface CreateProblemData {
  problemId: string;
  title: string;
  description: string;
  priority?: ProblemPriority;
  impact?: ProblemImpact;
  urgency?: ProblemUrgency;
  reportedBy: string;
  organizationId: string;
}

interface UpdateProblemData {
  title?: string;
  description?: string;
  priority?: ProblemPriority;
  impact?: ProblemImpact;
  urgency?: ProblemUrgency;
  status?: ProblemStatus;
  assignedTo?: string;
  rootCause?: string;
  workaround?: string;
  resolution?: string;
}

// ==========================================
// CREATE PROBLEM
// ==========================================

export const createProblem = async (
  data: CreateProblemData
) => {
  const existingProblem =
    await problemRepository.findOne({
      problemId: data.problemId,
      organizationId: data.organizationId,
    });

  if (existingProblem) {
    throw new Error(
      "A problem with this ID already exists in this organization"
    );
  }

  // ==========================================
  // VALIDATE REPORTER
  // ==========================================

  const reporter =
    await authRepository.findOne({
      _id: data.reportedBy,
      organizationId: data.organizationId,
      isActive: true,
    });

  if (!reporter) {
    throw new Error(
      "Reporter does not belong to this organization"
    );
  }

  // ==========================================
  // CREATE PROBLEM
  // ==========================================

  return problemRepository.create({
    problemId: data.problemId,
    title: data.title,
    description: data.description,
    priority: data.priority || "Medium",
    impact: data.impact || "Medium",
    urgency: data.urgency || "Medium",
    status: "Open",
    reportedBy: new mongoose.Types.ObjectId(
      data.reportedBy
    ),
    organizationId:
      new mongoose.Types.ObjectId(
        data.organizationId
      ),
  });
};

// ==========================================
// GET ALL PROBLEMS
// ==========================================

export const getProblemsByOrganization = async (
  organizationId: string
) => {
  return problemRepository.findAllByOrganization(
    organizationId
  );
};

// ==========================================
// GET PROBLEM BY ID
// ==========================================

export const getProblemById = async (
  id: string,
  organizationId: string
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return problemRepository.findByIdAndOrganization(
    id,
    organizationId
  );
};

// ==========================================
// UPDATE PROBLEM
// ==========================================

export const updateProblem = async (
  id: string,
  organizationId: string,
  data: UpdateProblemData
) => {
  // ==========================================
  // VALIDATE PROBLEM ID
  // ==========================================

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  // ==========================================
  // FIND EXISTING PROBLEM
  // ==========================================

  const problem =
    await problemRepository.findOne({
      _id: id,
      organizationId,
    });

  if (!problem) {
    return null;
  }

  // ==========================================
  // NORMALIZE STATUS
  // ==========================================

  const currentStatus = String(
    problem.status
  ).trim();

  const requestedStatus = data.status
    ? String(data.status).trim()
    : undefined;

  const updateData: Record<string, any> = {};

  for (const field of [
    "title",
    "description",
    "priority",
    "impact",
    "urgency",
    "status",
    "assignedTo",
    "rootCause",
    "workaround",
    "resolution",
  ] as const) {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  }

  if (requestedStatus) {
    updateData.status = requestedStatus;
  }

  // ==========================================
  // CLOSED PROBLEM PROTECTION
  // ==========================================

  if (
    currentStatus === "Closed" &&
    requestedStatus &&
    requestedStatus !== "Closed"
  ) {
    throw new Error(
      "Closed problems cannot be reopened or modified to another status"
    );
  }

  // ==========================================
  // ASSIGNMENT VALIDATION
  // ==========================================

  if (data.assignedTo) {
    if (
      !mongoose.Types.ObjectId.isValid(
        data.assignedTo
      )
    ) {
      throw new Error(
        "Invalid assigned user ID"
      );
    }

    const employee =
      await authRepository.findOne({
        _id: data.assignedTo,
        organizationId,
        isActive: true,
      });

    if (!employee) {
      throw new Error(
        "Assigned user does not belong to this organization"
      );
    }

    if (employee.role !== "employee") {
      throw new Error(
        "Problems can only be assigned to employees"
      );
    }

    updateData.assignedTo = employee._id;
  }

  // ==========================================
  // STATUS TRANSITIONS
  // ==========================================

  if (requestedStatus) {
    // ========================================
    // OPEN
    // ========================================

    if (requestedStatus === "Open") {
      if (currentStatus !== "Open") {
        throw new Error(
          `Problem cannot be moved from ${currentStatus} to Open`
        );
      }
    }

    // ========================================
    // UNDER INVESTIGATION
    // ========================================

    if (
      requestedStatus ===
      "Under Investigation"
    ) {
      if (
        currentStatus !== "Open" &&
        currentStatus !== "Under Investigation"
      ) {
        throw new Error(
          `Problem cannot be moved from ${currentStatus} to Under Investigation`
        );
      }
    }

    // ========================================
    // KNOWN ERROR
    // ========================================

    if (
      requestedStatus === "Known Error"
    ) {
      if (
        currentStatus !==
          "Under Investigation" &&
        currentStatus !== "Known Error"
      ) {
        throw new Error(
          `Problem cannot be marked as Known Error from ${currentStatus}`
        );
      }
    }

    // ========================================
    // RESOLVED
    // ========================================

    if (
      requestedStatus === "Resolved"
    ) {
      if (
        currentStatus !==
          "Under Investigation" &&
        currentStatus !== "Known Error"
      ) {
        throw new Error(
          `Only problems under investigation or known errors can be resolved. Current status: ${currentStatus}`
        );
      }

      if (
        !data.resolution &&
        !problem.resolution
      ) {
        throw new Error(
          "Resolution is required when resolving a problem"
        );
      }

      updateData.resolvedAt = new Date();
    }

    // ========================================
    // CLOSED
    // ========================================

    if (
      requestedStatus === "Closed"
    ) {
      if (currentStatus !== "Resolved") {
        throw new Error(
          "Only resolved problems can be closed"
        );
      }

      updateData.closedAt = new Date();
    }
  }

  // ==========================================
  // UPDATE DATABASE THROUGH REPOSITORY
  // ==========================================

  return problemRepository.updateByIdAndOrganization(
    id,
    organizationId,
    updateData
  );
};

// ==========================================
// DELETE PROBLEM
// ==========================================

export const deleteProblem = async (
  id: string,
  organizationId: string
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return problemRepository.deleteByIdAndOrganization(
    id,
    organizationId
  );
};