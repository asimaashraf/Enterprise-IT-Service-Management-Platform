import mongoose from "mongoose";

import IncidentEscalationPolicy, {
  IIncidentEscalationPolicy,
  IncidentPriority,
} from "./incidentEscalation.model";

// ==========================================
// CREATE
// ==========================================

export const create = async (
  data: Partial<IIncidentEscalationPolicy>
) => {
  return IncidentEscalationPolicy.create(data);
};

// ==========================================
// FIND BY NAME
// ==========================================

export const findByName = async (
  name: string,
  organizationId: string
) => {
  return IncidentEscalationPolicy.findOne({
    name,
    organizationId,
  });
};

export const existsByTargetTeam = async (
  targetTeam: string,
  organizationId: string
): Promise<boolean> => {
  return Boolean(
    await IncidentEscalationPolicy.exists({
      targetTeam,
      organizationId,
    })
  );
};

// ==========================================
// FIND ALL
// ==========================================

export const findAll = async (
  organizationId: string
) => {
  return IncidentEscalationPolicy.find({
    organizationId,
  })
    .populate("createdBy", "name email role")
    .populate("targetUser", "name email role")
    .populate("targetTeam", "name description")
    .sort({
      priority: 1,
      thresholdMinutes: 1,
      escalationLevel: 1,
    });
};

// ==========================================
// FIND BY ID
// ==========================================

export const findById = async (
  policyId: string,
  organizationId: string
) => {
  return IncidentEscalationPolicy.findOne({
    _id: policyId,
    organizationId,
  })
    .populate("createdBy", "name email role")
    .populate("targetUser", "name email role")
    .populate("targetTeam", "name description");
};

// ==========================================
// FIND DUPLICATE NAME
// ==========================================

export const findDuplicateName = async (
  name: string,
  organizationId: string,
  policyId: string
) => {
  return IncidentEscalationPolicy.findOne({
    name,
    organizationId,
    _id: {
      $ne: policyId,
    },
  });
};

// ==========================================
// DELETE
// ==========================================

export const deleteById = async (
  policyId: string,
  organizationId: string
) => {
  return IncidentEscalationPolicy.findOneAndDelete({
    _id: policyId,
    organizationId,
  });
};

// ==========================================
// FIND APPLICABLE POLICIES
// ==========================================

export const findApplicable = async (
  organizationId: string,
  priority: IncidentPriority
) => {
  return IncidentEscalationPolicy.find({
    organizationId,
    priority,
    isActive: true,
  })
    .populate("targetUser", "name email role")
    .populate("targetTeam", "name description")
    .sort({
      thresholdMinutes: 1,
      escalationLevel: 1,
    });
};

export const findApplicableForThreshold = async (
  organizationId: string,
  priority: IncidentPriority,
  thresholdMinutes: number
) => {
  return IncidentEscalationPolicy.find({
    organizationId,
    priority,
    isActive: true,
    thresholdMinutes: {
      $lte: thresholdMinutes,
    },
  }).sort({
    thresholdMinutes: 1,
    escalationLevel: 1,
  });
};

// ==========================================
// UPDATE
// ==========================================

export const update = async (
  policy: IIncidentEscalationPolicy
) => {
  return policy.save();
};
