import mongoose from "mongoose";

import IncidentAssignmentRule, {
  IncidentPriority,
  IncidentSeverity,
  IIncidentAssignmentRule,
} from "./incidentAssignmentRule.model";

// ==========================================
// INCIDENT ASSIGNMENT RULE REPOSITORY
// ==========================================

// ==========================================
// FIND BY ORGANIZATION + RULE ORDER
// ==========================================

export const findByOrganizationAndRuleOrder =
  async (
    organizationId: string,
    ruleOrder: number
  ) => {
    return IncidentAssignmentRule.findOne({
      organizationId,
      ruleOrder,
    });
  };

// ==========================================
// FIND BY ORGANIZATION + NAME
// ==========================================

export const findByOrganizationAndName =
  async (
    organizationId: string,
    name: string
  ) => {
    return IncidentAssignmentRule.findOne({
      organizationId,
      name,
    });
  };

// ==========================================
// CREATE
// ==========================================

export const create = async (
  data: Partial<IIncidentAssignmentRule>
) => {
  return IncidentAssignmentRule.create(data);
};

// ==========================================
// FIND ALL BY ORGANIZATION
// ==========================================

export const findAllByOrganization = async (
  organizationId: string
) => {
  return IncidentAssignmentRule.find({
    organizationId,
  })
    .populate(
      "targetUser",
      "name email role"
    )
    .populate(
      "createdBy",
      "name email role"
    )
    .sort({
      ruleOrder: 1,
    });
};

// ==========================================
// FIND BY ID + ORGANIZATION
// ==========================================

export const findByIdAndOrganization = async (
  ruleId: string,
  organizationId: string
) => {
  return IncidentAssignmentRule.findOne({
    _id: ruleId,
    organizationId,
  })
    .populate(
      "targetUser",
      "name email role"
    )
    .populate(
      "createdBy",
      "name email role"
    );
};

// ==========================================
// FIND BY ID + ORGANIZATION WITHOUT POPULATE
// ==========================================

export const findDocumentByIdAndOrganization =
  async (
    ruleId: string,
    organizationId: string
  ) => {
    return IncidentAssignmentRule.findOne({
      _id: ruleId,
      organizationId,
    });
  };

// ==========================================
// FIND DUPLICATE RULE ORDER
// ==========================================

export const findDuplicateRuleOrder =
  async (
    organizationId: string,
    ruleOrder: number,
    excludeRuleId?: string
  ) => {
    const query: any = {
      organizationId,
      ruleOrder,
    };

    if (excludeRuleId) {
      query._id = {
        $ne: excludeRuleId,
      };
    }

    return IncidentAssignmentRule.findOne(
      query
    );
  };

// ==========================================
// FIND DUPLICATE NAME
// ==========================================

export const findDuplicateName = async (
  organizationId: string,
  name: string,
  excludeRuleId?: string
) => {
  const query: any = {
    organizationId,
    name,
  };

  if (excludeRuleId) {
    query._id = {
      $ne: excludeRuleId,
    };
  }

  return IncidentAssignmentRule.findOne(
    query
  );
};

// ==========================================
// SAVE DOCUMENT
// ==========================================

export const save = async (
  rule: IIncidentAssignmentRule
) => {
  return rule.save();
};

// ==========================================
// FIND BY ID
// ==========================================

export const findById = async (
  ruleId: string
) => {
  return IncidentAssignmentRule.findById(
    ruleId
  )
    .populate(
      "targetUser",
      "name email role"
    )
    .populate(
      "createdBy",
      "name email role"
    );
};

// ==========================================
// DELETE BY ID + ORGANIZATION
// ==========================================

export const deleteByIdAndOrganization =
  async (
    ruleId: string,
    organizationId: string
  ) => {
    return IncidentAssignmentRule.findOneAndDelete(
      {
        _id: ruleId,
        organizationId,
      }
    );
  };

// ==========================================
// FIND APPLICABLE RULES
// ==========================================

export const findApplicableRules = async (
  query: any
) => {
  return IncidentAssignmentRule.find(
    query
  )
    .populate(
      "targetUser",
      "name email role organizationId"
    )
    .sort({
      ruleOrder: 1,
    });
};

// ==========================================
// REPOSITORY OBJECT
// ==========================================

export const incidentAssignmentRuleRepository = {
  findByOrganizationAndRuleOrder,
  findByOrganizationAndName,
  create,
  findAllByOrganization,
  findByIdAndOrganization,
  findDocumentByIdAndOrganization,
  findDuplicateRuleOrder,
  findDuplicateName,
  save,
  findById,
  deleteByIdAndOrganization,
  findApplicableRules,
};
