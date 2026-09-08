import mongoose from "mongoose";

import {
  EscalationLevel,
  EscalationTargetType,
  IncidentPriority,
} from "./incidentEscalation.model";

import * as escalationRepository from "./incidentEscalation.repository";
import { authRepository } from "../auth/auth.repository";
import { supportTeamRepository } from "../support-team/supportTeam.repository";

// ==========================================
// TYPES
// ==========================================

interface CreatePolicyData {
  name: string;
  description?: string;
  organizationId: string;
  priority: IncidentPriority;
  escalationLevel: EscalationLevel;
  thresholdMinutes: number;
  targetType: EscalationTargetType;
  targetUser?: string;
  targetTeam?: string;
  createdBy: string;
}

interface UpdatePolicyData {
  name?: string;
  description?: string;
  priority?: IncidentPriority;
  escalationLevel?: EscalationLevel;
  thresholdMinutes?: number;
  targetType?: EscalationTargetType;
  targetUser?: string;
  targetTeam?: string;
  isActive?: boolean;
}

// ==========================================
// HELPERS
// ==========================================

const isValidObjectId = (id?: string) => {
  return !!id && mongoose.Types.ObjectId.isValid(id);
};

/**
 * Safely extracts an ObjectId string from:
 *
 * 1. A normal ObjectId
 * 2. A string
 * 3. A populated object containing _id
 *
 * This is important because repository methods may populate
 * targetUser / targetTeam.
 */
const extractObjectId = (
  value: unknown
): string | undefined => {
  if (!value) {
    return undefined;
  }

  // Already an ObjectId
  if (value instanceof mongoose.Types.ObjectId) {
    return value.toString();
  }

  // Normal string ObjectId
  if (typeof value === "string") {
    return value;
  }

  // Populated document/object
  if (
    typeof value === "object" &&
    value !== null &&
    "_id" in value
  ) {
    const objectId = (value as { _id?: unknown })._id;

    if (
      objectId instanceof mongoose.Types.ObjectId
    ) {
      return objectId.toString();
    }

    if (typeof objectId === "string") {
      return objectId;
    }

    if (objectId) {
      return String(objectId);
    }
  }

  return undefined;
};

/**
 * Validate target according to targetType.
 */
const validateTarget = async (
  targetType: EscalationTargetType,
  organizationId: string,
  targetUser?: string,
  targetTeam?: string
): Promise<void> => {
  if (targetType === "User") {
    if (!targetUser) {
      throw new Error(
        "targetUser is required when targetType is User"
      );
    }

    if (!isValidObjectId(targetUser)) {
      throw new Error("Invalid targetUser ID");
    }

    const user = await authRepository.findOne({
      _id: targetUser,
      organizationId,
      isActive: true,
    });

    if (!user) {
      throw new Error(
        "Target user not found, inactive, or does not belong to this organization"
      );
    }
  }

  if (targetType === "SupportTeam") {
    if (!targetTeam) {
      throw new Error(
        "targetTeam is required when targetType is SupportTeam"
      );
    }

    if (!isValidObjectId(targetTeam)) {
      throw new Error("Invalid targetTeam ID");
    }

    const team =
      await supportTeamRepository.findByIdAndOrganization(
        targetTeam,
        organizationId
      );

    if (!team || !team.isActive) {
      throw new Error(
        "Target support team not found, inactive, or does not belong to this organization"
      );
    }
  }
};

/**
 * Validate escalation threshold.
 */
const validateThreshold = (
  thresholdMinutes: number
) => {
  if (
    !Number.isFinite(thresholdMinutes) ||
    thresholdMinutes < 1
  ) {
    throw new Error(
      "thresholdMinutes must be at least 1"
    );
  }
};

// ==========================================
// CREATE POLICY
// ==========================================

export const createEscalationPolicy = async (
  data: CreatePolicyData
) => {
  // ------------------------------------------
  // BASIC VALIDATION
  // ------------------------------------------

  if (!data.name?.trim()) {
    throw new Error("Policy name is required");
  }

  if (!isValidObjectId(data.organizationId)) {
    throw new Error("Invalid organization ID");
  }

  if (!isValidObjectId(data.createdBy)) {
    throw new Error("Invalid createdBy ID");
  }

  validateThreshold(data.thresholdMinutes);

  await validateTarget(
    data.targetType,
    data.organizationId,
    data.targetUser,
    data.targetTeam
  );

  // ------------------------------------------
  // DUPLICATE POLICY CHECK
  // ------------------------------------------

  const existing =
    await escalationRepository.findByName(
      data.name.trim(),
      data.organizationId
    );

  if (existing) {
    throw new Error(
      "An escalation policy with this name already exists"
    );
  }

  // ------------------------------------------
  // CREATE
  // ------------------------------------------

  return escalationRepository.create({
    name: data.name.trim(),

    description:
      data.description?.trim() || undefined,

    organizationId:
      new mongoose.Types.ObjectId(
        data.organizationId
      ),

    priority: data.priority,

    escalationLevel:
      data.escalationLevel,

    thresholdMinutes:
      data.thresholdMinutes,

    targetType:
      data.targetType,

    targetUser:
      data.targetType === "User"
        ? new mongoose.Types.ObjectId(
            data.targetUser!
          )
        : undefined,

    targetTeam:
      data.targetType === "SupportTeam"
        ? new mongoose.Types.ObjectId(
            data.targetTeam!
          )
        : undefined,

    createdBy:
      new mongoose.Types.ObjectId(
        data.createdBy
      ),
  });
};

// ==========================================
// GET ALL POLICIES
// ==========================================

export const getEscalationPolicies = async (
  organizationId: string
) => {
  if (!isValidObjectId(organizationId)) {
    throw new Error("Invalid organization ID");
  }

  return escalationRepository.findAll(
    organizationId
  );
};

// ==========================================
// GET POLICY BY ID
// ==========================================

export const getEscalationPolicyById = async (
  policyId: string,
  organizationId: string
) => {
  if (!isValidObjectId(policyId)) {
    throw new Error(
      "Invalid escalation policy ID"
    );
  }

  if (!isValidObjectId(organizationId)) {
    throw new Error("Invalid organization ID");
  }

  const policy =
    await escalationRepository.findById(
      policyId,
      organizationId
    );

  if (!policy) {
    throw new Error(
      "Escalation policy not found"
    );
  }

  return policy;
};

// ==========================================
// UPDATE POLICY
// ==========================================

export const updateEscalationPolicy = async (
  policyId: string,
  organizationId: string,
  data: UpdatePolicyData
) => {
  // ------------------------------------------
  // VALIDATE IDS
  // ------------------------------------------

  if (!isValidObjectId(policyId)) {
    throw new Error(
      "Invalid escalation policy ID"
    );
  }

  if (!isValidObjectId(organizationId)) {
    throw new Error("Invalid organization ID");
  }

  // ------------------------------------------
  // FIND EXISTING POLICY
  // ------------------------------------------

  const existing =
    await escalationRepository.findById(
      policyId,
      organizationId
    );

  if (!existing) {
    throw new Error(
      "Escalation policy not found"
    );
  }

  // ------------------------------------------
  // DETERMINE FINAL VALUES
  // ------------------------------------------

  const targetType =
    data.targetType ??
    existing.targetType;

  /**
   * IMPORTANT:
   *
   * targetUser / targetTeam can be either:
   *
   * - ObjectId
   * - string
   * - populated object
   *
   * extractObjectId() handles all cases.
   */
  const existingTargetUser =
    extractObjectId(
      existing.targetUser
    );

  const existingTargetTeam =
    extractObjectId(
      existing.targetTeam
    );

  const targetUser =
    data.targetUser ??
    existingTargetUser;

  const targetTeam =
    data.targetTeam ??
    existingTargetTeam;

  const thresholdMinutes =
    data.thresholdMinutes ??
    existing.thresholdMinutes;

  // ------------------------------------------
  // VALIDATION
  // ------------------------------------------

  validateThreshold(
    thresholdMinutes
  );

  await validateTarget(
    targetType,
    organizationId,
    targetUser,
    targetTeam
  );

  // ------------------------------------------
  // DUPLICATE NAME CHECK
  // ------------------------------------------

  if (
    data.name !== undefined &&
    data.name.trim() !== existing.name
  ) {
    const duplicate =
      await escalationRepository.findDuplicateName(
        data.name.trim(),
        organizationId,
        policyId
      );

    if (duplicate) {
      throw new Error(
        "An escalation policy with this name already exists"
      );
    }
  }

  // ------------------------------------------
  // UPDATE BASIC FIELDS
  // ------------------------------------------

  if (data.name !== undefined) {
    const trimmedName =
      data.name.trim();

    if (!trimmedName) {
      throw new Error(
        "Policy name is required"
      );
    }

    existing.name = trimmedName;
  }

  if (data.description !== undefined) {
    existing.description =
      data.description.trim();
  }

  if (data.priority !== undefined) {
    existing.priority =
      data.priority;
  }

  if (
    data.escalationLevel !== undefined
  ) {
    existing.escalationLevel =
      data.escalationLevel;
  }

  existing.thresholdMinutes =
    thresholdMinutes;

  existing.targetType =
    targetType;

  // ------------------------------------------
  // TARGET USER / TEAM
  // ------------------------------------------

  if (targetType === "User") {
    existing.targetUser =
      new mongoose.Types.ObjectId(
        targetUser!
      );

    existing.targetTeam =
      undefined;
  }

  if (targetType === "SupportTeam") {
    existing.targetTeam =
      new mongoose.Types.ObjectId(
        targetTeam!
      );

    existing.targetUser =
      undefined;
  }

  // ------------------------------------------
  // ACTIVE STATUS
  // ------------------------------------------

  if (data.isActive !== undefined) {
    existing.isActive =
      data.isActive;
  }

  // ------------------------------------------
  // SAVE
  // ------------------------------------------

  return escalationRepository.update(
    existing
  );
};

// ==========================================
// DELETE POLICY
// ==========================================

export const deleteEscalationPolicy = async (
  policyId: string,
  organizationId: string
) => {
  if (!isValidObjectId(policyId)) {
    throw new Error(
      "Invalid escalation policy ID"
    );
  }

  if (!isValidObjectId(organizationId)) {
    throw new Error("Invalid organization ID");
  }

  const policy =
    await escalationRepository.deleteById(
      policyId,
      organizationId
    );

  if (!policy) {
    throw new Error(
      "Escalation policy not found"
    );
  }

  return policy;
};

// ==========================================
// FIND APPLICABLE POLICIES
// ==========================================

export const getApplicableEscalationPolicies =
  async (
    organizationId: string,
    priority: IncidentPriority
  ) => {
    if (!isValidObjectId(organizationId)) {
      throw new Error(
        "Invalid organization ID"
      );
    }

    return escalationRepository.findApplicable(
      organizationId,
      priority
    );
  };