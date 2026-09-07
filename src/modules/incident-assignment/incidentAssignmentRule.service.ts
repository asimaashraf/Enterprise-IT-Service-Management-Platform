import mongoose from "mongoose";

import {
  IncidentPriority,
  IncidentSeverity,
  IIncidentAssignmentRule,
} from "./incidentAssignmentRule.model";

import { incidentAssignmentRuleRepository } from "./incidentAssignmentRule.repository";
import { isEligibleOperationalAssignee } from "../auth/user.service";

// ==========================================
// TYPES
// ==========================================

interface CreateAssignmentRuleData {
  name: string;
  description?: string;
  ruleOrder: number;
  incidentPriority?: IncidentPriority;
  severity?: IncidentSeverity;
  targetUser: string;
  organizationId: string;
  createdBy: string;
}

interface UpdateAssignmentRuleData {
  name?: string;
  description?: string;
  ruleOrder?: number;
  incidentPriority?: IncidentPriority;
  severity?: IncidentSeverity;
  targetUser?: string;
  isActive?: boolean;
}

// ==========================================
// CREATE
// ==========================================

export const createAssignmentRule =
  async (
    data: CreateAssignmentRuleData
  ): Promise<IIncidentAssignmentRule> => {

    // --------------------------------------
    // Validate rule order
    // --------------------------------------

    if (
      !Number.isInteger(data.ruleOrder) ||
      data.ruleOrder < 1
    ) {
      throw new Error(
        "Rule order must be a positive integer"
      );
    }

    // --------------------------------------
    // Validate organization ID
    // --------------------------------------

    if (
      !mongoose.Types.ObjectId.isValid(
        data.organizationId
      )
    ) {
      throw new Error(
        "Invalid organization ID"
      );
    }

    // --------------------------------------
    // Validate target user ID
    // --------------------------------------

    if (
      !mongoose.Types.ObjectId.isValid(
        data.targetUser
      )
    ) {
      throw new Error(
        "Invalid target user ID"
      );
    }

    // --------------------------------------
    // Verify eligible operational target
    // --------------------------------------

    const isEligible = await isEligibleOperationalAssignee(
      data.targetUser,
      data.organizationId
    );

    if (!isEligible) {
      throw new Error(
        "Target user must be an eligible operational assignee"
      );
    }

    // --------------------------------------
    // Prevent duplicate rule order
    // --------------------------------------

    const existingOrder =
      await incidentAssignmentRuleRepository.findByOrganizationAndRuleOrder(
        data.organizationId,
        data.ruleOrder
      );

    if (existingOrder) {
      throw new Error(
        "A rule with this order already exists in this organization"
      );
    }

    // --------------------------------------
    // Prevent duplicate name
    // --------------------------------------

    const existingName =
      await incidentAssignmentRuleRepository.findByOrganizationAndName(
        data.organizationId,
        data.name.trim()
      );

    if (existingName) {
      throw new Error(
        "An assignment rule with this name already exists"
      );
    }

    // --------------------------------------
    // Create
    // --------------------------------------

    const rule =
      await incidentAssignmentRuleRepository.create({
        name: data.name.trim(),

        description:
          data.description?.trim(),

        ruleOrder: data.ruleOrder,

        incidentPriority:
          data.incidentPriority,

        severity:
          data.severity,

        targetUser:
          new mongoose.Types.ObjectId(
            data.targetUser
          ),

        organizationId:
          new mongoose.Types.ObjectId(
            data.organizationId
          ),

        createdBy:
          new mongoose.Types.ObjectId(
            data.createdBy
          ),

        isActive: true,
      });

    return rule as IIncidentAssignmentRule;
  };

// ==========================================
// GET ALL
// ==========================================

export const getAssignmentRules =
  async (
    organizationId: string
  ) => {

    if (
      !mongoose.Types.ObjectId.isValid(
        organizationId
      )
    ) {
      throw new Error(
        "Invalid organization ID"
      );
    }

    return incidentAssignmentRuleRepository.findAllByOrganization(
      organizationId
    );
  };

// ==========================================
// GET BY ID
// ==========================================

export const getAssignmentRuleById =
  async (
    ruleId: string,
    organizationId: string
  ) => {

    if (
      !mongoose.Types.ObjectId.isValid(
        ruleId
      )
    ) {
      throw new Error(
        "Invalid assignment rule ID"
      );
    }

    const rule =
      await incidentAssignmentRuleRepository.findByIdAndOrganization(
        ruleId,
        organizationId
      );

    if (!rule) {
      throw new Error(
        "Assignment rule not found"
      );
    }

    return rule;
  };

// ==========================================
// UPDATE
// ==========================================

export const updateAssignmentRule =
  async (
    ruleId: string,
    organizationId: string,
    data: UpdateAssignmentRuleData
  ) => {

    // --------------------------------------
    // Validate ID
    // --------------------------------------

    if (
      !mongoose.Types.ObjectId.isValid(
        ruleId
      )
    ) {
      throw new Error(
        "Invalid assignment rule ID"
      );
    }

    // --------------------------------------
    // Find document
    // --------------------------------------

    const rule =
      await incidentAssignmentRuleRepository.findDocumentByIdAndOrganization(
        ruleId,
        organizationId
      );

    if (!rule) {
      throw new Error(
        "Assignment rule not found"
      );
    }

    // --------------------------------------
    // Rule order
    // --------------------------------------

    if (
      data.ruleOrder !== undefined
    ) {

      if (
        !Number.isInteger(
          data.ruleOrder
        ) ||
        data.ruleOrder < 1
      ) {
        throw new Error(
          "Rule order must be a positive integer"
        );
      }

      const duplicateOrder =
        await incidentAssignmentRuleRepository.findDuplicateRuleOrder(
          organizationId,
          data.ruleOrder,
          ruleId
        );

      if (duplicateOrder) {
        throw new Error(
          "A rule with this order already exists in this organization"
        );
      }

      rule.ruleOrder =
        data.ruleOrder;
    }

    // --------------------------------------
    // Name
    // --------------------------------------

    if (data.name !== undefined) {

      const name =
        data.name.trim();

      if (!name) {
        throw new Error(
          "Rule name cannot be empty"
        );
      }

      const duplicateName =
        await incidentAssignmentRuleRepository.findDuplicateName(
          organizationId,
          name,
          ruleId
        );

      if (duplicateName) {
        throw new Error(
          "An assignment rule with this name already exists"
        );
      }

      rule.name = name;
    }

    // --------------------------------------
    // Description
    // --------------------------------------

    if (
      data.description !== undefined
    ) {
      rule.description =
        data.description.trim();
    }

    // --------------------------------------
    // Priority
    // --------------------------------------

    if (
      data.incidentPriority !==
      undefined
    ) {
      rule.incidentPriority =
        data.incidentPriority;
    }

    // --------------------------------------
    // Severity
    // --------------------------------------

    if (
      data.severity !== undefined
    ) {
      rule.severity =
        data.severity;
    }

    // --------------------------------------
    // Target user
    // --------------------------------------

    if (
      data.targetUser !== undefined
    ) {

      if (
        !mongoose.Types.ObjectId.isValid(
          data.targetUser
        )
      ) {
        throw new Error(
          "Invalid target user ID"
        );
      }

      const isEligible = await isEligibleOperationalAssignee(
        data.targetUser,
        organizationId
      );

      if (!isEligible) {
        throw new Error(
          "Target user must be an eligible operational assignee"
        );
      }

      rule.targetUser =
        new mongoose.Types.ObjectId(
          data.targetUser
        );
    }

    // --------------------------------------
    // Active status
    // --------------------------------------

    if (
      data.isActive !== undefined
    ) {
      rule.isActive =
        data.isActive;
    }

    // --------------------------------------
    // Save
    // --------------------------------------

    await incidentAssignmentRuleRepository.save(
      rule
    );

    // --------------------------------------
    // Return populated document
    // --------------------------------------

    return incidentAssignmentRuleRepository.findById(
      rule._id.toString()
    );
  };

// ==========================================
// DELETE
// ==========================================

export const deleteAssignmentRule =
  async (
    ruleId: string,
    organizationId: string
  ) => {

    if (
      !mongoose.Types.ObjectId.isValid(
        ruleId
      )
    ) {
      throw new Error(
        "Invalid assignment rule ID"
      );
    }

    const rule =
      await incidentAssignmentRuleRepository.deleteByIdAndOrganization(
        ruleId,
        organizationId
      );

    if (!rule) {
      throw new Error(
        "Assignment rule not found"
      );
    }

    return rule;
  };

// ==========================================
// GET APPLICABLE RULES
// ==========================================

export const getApplicableAssignmentRules =
  async (
    organizationId: string,
    incidentPriority?: IncidentPriority,
    severity?: IncidentSeverity
  ) => {

    const query: any = {
      organizationId,
      isActive: true,
    };

    // --------------------------------------
    // Priority matching
    //
    // A rule with no priority is treated
    // as a wildcard.
    // --------------------------------------

    if (incidentPriority) {

      query.$or = [
        {
          incidentPriority,
        },
        {
          incidentPriority: {
            $exists: false,
          },
        },
        {
          incidentPriority: null,
        },
      ];
    }

    // --------------------------------------
    // Severity matching
    //
    // A rule with no severity is treated
    // as a wildcard.
    // --------------------------------------

    if (severity) {

      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            {
              severity,
            },
            {
              severity: {
                $exists: false,
              },
            },
            {
              severity: null,
            },
          ],
        },
      ];
    }

    return incidentAssignmentRuleRepository.findApplicableRules(
      query
    );
  };

// ==========================================
// GET FIRST MATCH
// ==========================================

export const findMatchingAssignmentRule =
  async (
    organizationId: string,
    incidentPriority?: IncidentPriority,
    severity?: IncidentSeverity
  ) => {

    const rules =
      await getApplicableAssignmentRules(
        organizationId,
        incidentPriority,
        severity
      );

    return rules.length > 0
      ? rules[0]
      : null;
  };
