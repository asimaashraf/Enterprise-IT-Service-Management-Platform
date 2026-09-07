import mongoose from "mongoose";

import {
  IncidentPriority,
  IncidentSeverity,
  IncidentStatus,
} from "./incident.model";

import { incidentRepository } from "./incident.repository";
import { authRepository } from "../auth/auth.repository";
import SLA from "../sla/sla.model";

import {
  findMatchingAssignmentRule,
} from "../incident-assignment/incidentAssignmentRule.service";
import { isEligibleOperationalAssignee } from "../auth/user.service";

import { notificationQueue } from "../../jobs/queues/notification.queue";
import { queueNotificationEvent } from "../notification/notification.service";

// ==========================================
// TYPES
// ==========================================

interface CreateIncidentData {
  incidentId?: string;
  title: string;
  description: string;
  priority?: IncidentPriority;
  severity?: IncidentSeverity;
  reportedBy: string;
  organizationId: string;
}

/**
 * Generate a human-readable incident identifier using the INC-YYYYMMDD-NNNN
 * format. The NNNN portion is a zero-padded random integer 0–9999.
 *
 * Uses a loop with a hard cap to guard against concurrent creation collisions
 * within the same organization. On the extremely rare event of 10,000
 * simultaneous collisions the loop exits and the last attempt will hit the
 * unique-index constraint and surface a descriptive 400 from the controller.
 */
const generateIncidentId = (): string => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "") // YYYYMMDD
  const seq = String(Math.floor(Math.random() * 10_000)).padStart(4, "0")
  return `INC-${dateStr}-${seq}`
}

interface UpdateIncidentData {
  title?: string;
  description?: string;
  priority?: IncidentPriority;
  severity?: IncidentSeverity;
  status?: IncidentStatus;

  /**
   * Employee ID to assign.
   *
   * null / empty string = unassign.
   */
  assignedTo?: string | null;

  resolution?: string;
}

// ==========================================
// HELPERS
// ==========================================

/**
 * Convert incident priority into the
 * notification priority format.
 */
const getNotificationPriority = (
  priority: IncidentPriority
): "Critical" | "High" | "Medium" | "Low" => {
  switch (priority) {
    case "Critical":
      return "Critical";

    case "High":
      return "High";

    case "Medium":
      return "Medium";

    default:
      return "Low";
  }
};

/**
 * Extract ObjectId string from an assignment
 * rule targetUser.
 *
 * targetUser can be:
 *
 * 1. ObjectId
 * 2. String ObjectId
 * 3. Populated user object
 */
const getTargetUserId = (
  targetUser: any
): string | undefined => {
  if (!targetUser) {
    return undefined;
  }

  if (
    typeof targetUser === "object" &&
    targetUser._id
  ) {
    return targetUser._id.toString();
  }

  return targetUser.toString();
};

/**
 * Validate and convert a value to ObjectId.
 */
const toObjectId = (
  value: string,
  fieldName: string
): mongoose.Types.ObjectId => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error(`Invalid ${fieldName}`);
  }

  return new mongoose.Types.ObjectId(value);
};

/**
 * Queue assignment notification.
 *
 * Notification failure must NEVER cause the
 * incident operation itself to fail.
 */
const queueIncidentAssignmentNotification =
  async (
    userId: string,
    organizationId: string,
    incidentId: string,
    incidentMongoId: string,
    priority: IncidentPriority,
    message: string
  ): Promise<void> => {
    try {
      await notificationQueue.add(
        "notification-created",
        {
          userId,
          organizationId,

          title: "Incident Assigned",

          message,

          type: "Incident Assigned",

          entityType: "Incident",

          entityId: incidentMongoId,

          priority:
            getNotificationPriority(priority),
        },
        {
          attempts: 3,

          backoff: {
            type: "exponential",
            delay: 2000,
          },

          removeOnComplete: true,

          removeOnFail: false,
        }
      );

      console.log(
        "=========================================="
      );

      console.log(
        "INCIDENT ASSIGNMENT NOTIFICATION QUEUED"
      );

      console.log(
        "Incident:",
        incidentId
      );

      console.log(
        "Notification recipient:",
        userId
      );

      console.log(
        "=========================================="
      );
    } catch (error: any) {
      console.error(
        "Failed to queue incident assignment notification:",
        error?.message || error
      );
    }
  };

// ==========================================
// CREATE INCIDENT
// ==========================================

export const createIncident = async (
  data: CreateIncidentData
) => {
  // ==========================================
  // VALIDATE IDS
  // ==========================================

  const reportedByObjectId = toObjectId(
    data.reportedBy,
    "reportedBy"
  );

  const organizationObjectId = toObjectId(
    data.organizationId,
    "organizationId"
  );

  // ==========================================
  // INCIDENT ID — generate when not supplied
  // ==========================================

  // Normalise: client may send undefined, null, or a custom string.
  // Treat empty-string as "not supplied".
  let incidentId = data.incidentId?.trim() || undefined

  if (!incidentId) {
    // Loop until a unique ID is found (or hard-cap to avoid infinite loop).
    const MAX_ATTEMPTS = 100
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      incidentId = generateIncidentId()
      const existing = await incidentRepository.findOne({
        incidentId,
        organizationId: organizationObjectId,
      })
      if (!existing) break // unique — use it
      // otherwise try again
    }
  }

  // ==========================================
  // DUPLICATE INCIDENT CHECK
  // ==========================================

  const existingIncident =
    await incidentRepository.findOne({
      incidentId,
      organizationId: organizationObjectId,
    });

  if (existingIncident) {
    throw new Error(
      "An incident with this ID already exists in this organization"
    );
  }

  // ==========================================
  // VALIDATE REPORTER
  // ==========================================

  const reporter =
    await authRepository.findOne({
      _id: reportedByObjectId,
      organizationId: organizationObjectId,
      isActive: true,
    });

  if (!reporter) {
    throw new Error(
      "Reporter does not belong to this organization"
    );
  }

  // ==========================================
  // DETERMINE PRIORITY
  // ==========================================

  const incidentPriority: IncidentPriority =
    data.priority || "Medium";

  // ==========================================
  // DETERMINE SEVERITY
  // ==========================================

  const incidentSeverity: IncidentSeverity =
    data.severity || "Minor";

  // ==========================================
  // AUTOMATIC ASSIGNMENT
  // ==========================================

  let assignedTo:
    | mongoose.Types.ObjectId
    | undefined;

  try {
    console.log(
      "=========================================="
    );

    console.log(
      "CHECKING INCIDENT ASSIGNMENT RULES"
    );

    console.log(
      "Incident:",
      incidentId
    );

    console.log(
      "Organization:",
      data.organizationId
    );

    console.log(
      "Priority:",
      incidentPriority
    );

    console.log(
      "Severity:",
      incidentSeverity
    );

    console.log(
      "=========================================="
    );

    const matchingRule =
      await findMatchingAssignmentRule(
        data.organizationId,
        incidentPriority,
        incidentSeverity
      );

    if (matchingRule) {
      console.log(
        "=========================================="
      );

      console.log(
        "INCIDENT ASSIGNMENT RULE MATCHED"
      );

      console.log(
        "Rule:",
        matchingRule.name
      );

      console.log(
        "Rule Order:",
        matchingRule.ruleOrder
      );

      console.log(
        "Target User:",
        matchingRule.targetUser
      );

      console.log(
        "=========================================="
      );

      const targetUserId =
        getTargetUserId(
          matchingRule.targetUser
        );

      if (targetUserId) {
        // --------------------------------------
        // Validate that the rule target remains eligible at assignment time.
        // --------------------------------------

        if (
          !mongoose.Types.ObjectId.isValid(
            targetUserId
          )
        ) {
          console.warn(
            "Assignment rule target user ID is invalid."
          );
        } else {
          const isEligible = await isEligibleOperationalAssignee(
            targetUserId,
            data.organizationId
          );

          if (!isEligible) {
            console.warn(
              "Assignment rule matched, but target user is no longer eligible."
            );
          } else {
            // Store ObjectId, not string.

            assignedTo = new mongoose.Types.ObjectId(targetUserId);

            console.log(
              "AUTOMATIC ASSIGNMENT SUCCESSFUL"
            );

            console.log(
              "Assigned support admin ID:",
              assignedTo.toString()
            );

            console.log(
              "Assigned support admin through an eligible assignment rule."
            );
          }
        }
      }
    } else {
      console.log(
        `No assignment rule matched incident ${incidentId}`
      );
    }
  } catch (error: any) {
    // Assignment rule failure must NOT
    // prevent incident creation.

    console.error(
      "Failed to apply incident assignment rule:",
      error?.message || error
    );

    assignedTo = undefined;
  }

  // ==========================================
  // CREATE INCIDENT
  // ==========================================

  const incident =
    await incidentRepository.create({
      incidentId,

      title: data.title,

      description: data.description,

      priority: incidentPriority,

      severity: incidentSeverity,

      status: "Open",

      reportedBy:
        reportedByObjectId,

      assignedTo,

      organizationId:
        organizationObjectId,
    });

  // ==========================================
  // AUTOMATIC ASSIGNMENT NOTIFICATION
  // ==========================================

  if (assignedTo) {
    await queueIncidentAssignmentNotification(
      assignedTo.toString(),

      data.organizationId,

      incident.incidentId,

      incident._id.toString(),

      incident.priority,

      `Incident ${incident.incidentId} has been automatically assigned to you.`
    );
  }

  const admins = await authRepository.findActiveAdminsByOrganization(
    data.organizationId
  );

  await queueNotificationEvent({
    eventKey: `incident-created-${incident._id.toString()}`,
    recipients: admins.map((admin) => admin._id.toString()),
    organizationId: data.organizationId,
    title: "New Incident",
    message: `Incident ${incident.incidentId} has been created.`,
    type: "Incident Created",
    entityType: "Incident",
    entityId: incident._id.toString(),
    priority: getNotificationPriority(incident.priority),
  });

  // ==========================================
  // RETURN POPULATED INCIDENT
  // ==========================================

  return incidentRepository.findByIdAndOrganization(
    incident._id.toString(),
    data.organizationId
  );
};

// ==========================================
// GET ALL INCIDENTS
// ==========================================

export const getIncidentsByOrganization =
  async (
    organizationId: string
  ) => {
    return incidentRepository.findAllByOrganization(
      organizationId
    );
  };

// ==========================================
// GET INCIDENT BY ID
// ==========================================

export const getIncidentById = async (
  id: string,
  organizationId: string
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return incidentRepository.findByIdAndOrganization(
    id,
    organizationId
  );
};

// ==========================================
// UPDATE INCIDENT
// ==========================================

export const updateIncident = async (
  id: string,
  organizationId: string,
  data: UpdateIncidentData
) => {
  // ==========================================
  // VALIDATE INCIDENT ID
  // ==========================================

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  // ==========================================
  // FIND EXISTING INCIDENT
  // ==========================================

  const existingIncident =
    await incidentRepository.findOne({
      _id: id,
      organizationId,
    });

  if (!existingIncident) {
    return null;
  }

  // ==========================================
  // REMEMBER PREVIOUS ASSIGNEE
  // ==========================================

  const previousAssignedTo =
    existingIncident.assignedTo
      ? existingIncident.assignedTo.toString()
      : undefined;

  // ==========================================
  // PREPARE UPDATE DATA
  // ==========================================

  const updateData: Record<string, any> = {};

  // Only copy fields that are actually
  // intended to be updated.

  if (data.title !== undefined) {
    updateData.title = data.title;
  }

  if (data.description !== undefined) {
    updateData.description =
      data.description;
  }

  if (data.priority !== undefined) {
    updateData.priority = data.priority;
  }

  if (data.severity !== undefined) {
    updateData.severity = data.severity;
  }

  if (data.status !== undefined) {
    updateData.status = data.status;
  }

  if (data.resolution !== undefined) {
    updateData.resolution = data.resolution;
  }

  // ==========================================
  // ASSIGNMENT VALIDATION
  // ==========================================

  if (
    data.assignedTo !== undefined &&
    data.assignedTo !== null &&
    data.assignedTo !== ""
  ) {
    // Validate ObjectId

    if (
      !mongoose.Types.ObjectId.isValid(
        data.assignedTo
      )
    ) {
      throw new Error(
        "Invalid assigned user ID"
      );
    }

    const isEligible = await isEligibleOperationalAssignee(
      data.assignedTo,
      organizationId
    );

    if (!isEligible) {
      throw new Error(
        "Assigned user must be an eligible operational assignee"
      );
    }

    // IMPORTANT:
    // Store ObjectId, not string.

    updateData.assignedTo =
      new mongoose.Types.ObjectId(data.assignedTo);
  }

  // ==========================================
  // OPTIONAL UNASSIGN
  // ==========================================

  if (
    data.assignedTo === null ||
    data.assignedTo === ""
  ) {
    updateData.assignedTo = null;
  }

  // ==========================================
  // RESOLUTION TRACKING
  // ==========================================

  if (data.status === "Resolved") {
    if (
      !data.resolution ||
      data.resolution.trim() === ""
    ) {
      throw new Error(
        "Resolution is required when resolving an incident"
      );
    }

    updateData.resolvedAt =
      existingIncident.resolvedAt ||
      new Date();
  }

  // ==========================================
  // CLOSED INCIDENT
  // ==========================================

  if (data.status === "Closed") {
    updateData.closedAt =
      existingIncident.closedAt ||
      new Date();

    if (!existingIncident.resolvedAt) {
      updateData.resolvedAt =
        new Date();
    }
  }

  // ==========================================
  // UPDATE INCIDENT
  // ==========================================

  const incident =
    await incidentRepository.updateByIdAndOrganization(
      id,
      organizationId,
      updateData
    );

  if (!incident) {
    return null;
  }

  // ==========================================
  // SLA AUTOMATION
  // ==========================================

  const sla = await SLA.findOne({
    incidentId: id,
    organizationId,
  });

  if (sla) {
    // ----------------------------------------
    // FIRST RESPONSE
    // ----------------------------------------

    if (
      data.status === "In Progress" &&
      !sla.respondedAt
    ) {
      sla.respondedAt =
        new Date();
    }

    // ----------------------------------------
    // INCIDENT RESOLVED
    // ----------------------------------------

    if (
      data.status === "Resolved" &&
      !sla.resolvedAt
    ) {
      sla.resolvedAt =
        new Date();

      sla.status =
        "Completed";
    }

    // ----------------------------------------
    // INCIDENT CLOSED
    // ----------------------------------------

    if (
      data.status === "Closed" &&
      !sla.resolvedAt
    ) {
      sla.resolvedAt =
        new Date();

      sla.status =
        "Completed";
    }

    await sla.save();
  }

  // ==========================================
  // DETERMINE WHETHER ASSIGNMENT CHANGED
  // ==========================================

  const newAssignedTo =
    updateData.assignedTo
      ? updateData.assignedTo.toString()
      : undefined;

  const isNewAssignment =
    Boolean(newAssignedTo) &&
    previousAssignedTo !==
      newAssignedTo;

  // ==========================================
  // MANUAL ASSIGNMENT NOTIFICATION
  // ==========================================

  if (
    isNewAssignment &&
    newAssignedTo
  ) {
    await queueIncidentAssignmentNotification(
      newAssignedTo,

      organizationId,

      incident.incidentId,

      incident._id.toString(),

      incident.priority,

      `Incident ${incident.incidentId} has been assigned to you.`
    );
  }

  // ==========================================
  // RETURN UPDATED INCIDENT
  // ==========================================

  return incident;
};

// ==========================================
// DELETE INCIDENT
// ==========================================

export const deleteIncident = async (
  id: string,
  organizationId: string
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return incidentRepository.deleteByIdAndOrganization(
    id,
    organizationId
  );
};
