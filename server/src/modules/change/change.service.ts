import mongoose from "mongoose";

import {
  ChangeRisk,
  ChangeType,
  ChangeStatus,
} from "./change.model";

import { authRepository } from "../auth/auth.repository";
import { assetRepository } from "../asset/asset.repository";
import { changeRepository } from "./change.repository";
import { queueNotificationEvent } from "../notification/notification.service";

// ==========================================
// TYPES
// ==========================================

interface CreateChangeData {
  changeId: string;
  title: string;
  description: string;
  type?: ChangeType;
  risk?: ChangeRisk;
  requestedBy: string;
  organizationId: string;
  affectedAssets?: string[];
  plannedStartAt?: Date;
  plannedEndAt?: Date;
  rollbackPlan?: string;
}

interface UpdateChangeData {
  title?: string;
  description?: string;
  type?: ChangeType;
  risk?: ChangeRisk;
  status?: ChangeStatus;
  assignedTo?: string;
  affectedAssets?: string[];
  plannedStartAt?: Date;
  plannedEndAt?: Date;
  rollbackPlan?: string;
  approvalReason?: string;
  failureReason?: string;
}

type ChangeActorRole = "admin" | "employee";

const editableFields = new Set<keyof UpdateChangeData>([
  "title",
  "description",
  "type",
  "risk",
  "status",
  "assignedTo",
  "affectedAssets",
  "plannedStartAt",
  "plannedEndAt",
  "rollbackPlan",
  "approvalReason",
  "failureReason",
]);

const changeStatuses = new Set<ChangeStatus>([
  "Draft",
  "Pending Approval",
  "Approved",
  "Rejected",
  "Scheduled",
  "In Progress",
  "Completed",
  "Failed",
  "Cancelled",
]);

const validTransitions: Partial<Record<ChangeStatus, ChangeStatus[]>> = {
  "Draft": ["Pending Approval", "Cancelled"],
  "Pending Approval": ["Approved", "Rejected", "Cancelled"],
  "Approved": ["Scheduled", "In Progress", "Cancelled"],
  "Scheduled": ["In Progress", "Cancelled"],
  "In Progress": ["Completed", "Failed"],
};

const hasOwn = (
  value: object,
  key: string
) => Object.prototype.hasOwnProperty.call(value, key);

const allowlistedUpdate = (
  data: Record<string, unknown>
): UpdateChangeData => {
  const unsupportedFields = Object.keys(data).filter(
    (field) => !editableFields.has(field as keyof UpdateChangeData)
  );

  if (unsupportedFields.length > 0) {
    throw new Error(
      `Unsupported change update fields: ${unsupportedFields.join(", ")}`
    );
  }

  const update: UpdateChangeData = {};

  for (const field of editableFields) {
    if (hasOwn(data, field)) {
      update[field] = data[field] as never;
    }
  }

  return update;
};

// ==========================================
// CREATE CHANGE
// ==========================================

export const createChange = async (
  data: CreateChangeData
) => {
  const existingChange =
    await changeRepository.findOne({
      changeId: data.changeId,
      organizationId: data.organizationId,
    });

  if (existingChange) {
    throw new Error(
      "A change with this ID already exists in this organization"
    );
  }

  const requester =
    await authRepository.findOne({
      _id: data.requestedBy,
      organizationId: data.organizationId,
      isActive: true,
    });

  if (!requester) {
    throw new Error(
      "Requester does not belong to this organization"
    );
  }

  // ------------------------------------------
  // VALIDATE AFFECTED ASSETS
  // ------------------------------------------

  let affectedAssets:
    | mongoose.Types.ObjectId[]
    | undefined;

  if (
    data.affectedAssets &&
    data.affectedAssets.length > 0
  ) {
    const assets =
      await assetRepository.findByIdsAndOrganization(
        data.affectedAssets,
        data.organizationId
      );

    if (
      assets.length !== data.affectedAssets.length
    ) {
      throw new Error(
        "One or more affected assets do not belong to this organization"
      );
    }

    affectedAssets = data.affectedAssets.map(
      (assetId) =>
        new mongoose.Types.ObjectId(assetId)
    );
  }

  // ------------------------------------------
  // VALIDATE SCHEDULE
  // ------------------------------------------

  if (
    data.plannedStartAt &&
    data.plannedEndAt &&
    new Date(data.plannedEndAt) <=
      new Date(data.plannedStartAt)
  ) {
    throw new Error(
      "Planned end time must be after planned start time"
    );
  }

  return changeRepository.create({
    changeId: data.changeId,
    title: data.title,
    description: data.description,
    type: data.type || "Normal",
    risk: data.risk || "Medium",
    status: "Draft",
    requestedBy: new mongoose.Types.ObjectId(
      data.requestedBy
    ),
    organizationId: new mongoose.Types.ObjectId(
      data.organizationId
    ),
    affectedAssets,
    plannedStartAt: data.plannedStartAt,
    plannedEndAt: data.plannedEndAt,
    rollbackPlan: data.rollbackPlan,
  });
};

// ==========================================
// GET ALL CHANGES
// ==========================================

export const getChangesByOrganization = async (
  organizationId: string,
  userId: string,
  role: ChangeActorRole
) => {
  if (role === "employee") {
    return changeRepository.findAllByRequesterAndOrganization(
      userId,
      organizationId
    );
  }

  return changeRepository.findAllByOrganization(
    organizationId
  );
};

// ==========================================
// GET CHANGE BY ID
// ==========================================

export const getChangeById = async (
  id: string,
  organizationId: string,
  userId: string,
  role: ChangeActorRole
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  if (role === "employee") {
    return changeRepository.findByIdAndRequesterAndOrganization(
      id,
      userId,
      organizationId
    );
  }

  return changeRepository.findByIdAndOrganization(id, organizationId);
};

// ==========================================
// UPDATE CHANGE
// ==========================================

export const updateChange = async (
  id: string,
  organizationId: string,
  userId: string,
  role: ChangeActorRole,
  rawData: Record<string, unknown>
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  const change =
    await changeRepository.findOne({
      _id: id,
      organizationId,
    });

  if (!change) {
    return null;
  }

  if (
    role === "employee" &&
    change.requestedBy.toString() !== userId
  ) {
    return null;
  }

  const data = allowlistedUpdate(rawData);
  const currentStatus = change.status;

  const requestedStatus = data.status;

  if (requestedStatus && !changeStatuses.has(requestedStatus)) {
    throw new Error("Invalid change status");
  }

  if (
    data.approvalReason !== undefined &&
    requestedStatus !== "Approved" &&
    requestedStatus !== "Rejected"
  ) {
    throw new Error(
      "Approval reason can only be provided when approving or rejecting a change"
    );
  }

  if (
    data.failureReason !== undefined &&
    requestedStatus !== "Failed"
  ) {
    throw new Error(
      "Failure reason can only be provided when failing a change"
    );
  }

  if (role === "employee") {
    if (currentStatus !== "Draft") {
      throw new Error("Employees can only edit draft changes");
    }

    if (requestedStatus) {
      throw new Error("Only administrators can change change status");
    }

    if (data.assignedTo !== undefined) {
      throw new Error("Only administrators can assign changes");
    }
  }

  const updateData: Record<string, unknown> = {};

  for (const field of editableFields) {
    if (field !== "status" && field !== "assignedTo" && hasOwn(data, field)) {
      updateData[field] = data[field];
    }
  }

  if (requestedStatus) {
    updateData.status = requestedStatus;

    const allowedNextStatuses = validTransitions[currentStatus] || [];

    if (!allowedNextStatuses.includes(requestedStatus)) {
      throw new Error(
        `Invalid change status transition: ${currentStatus} -> ${requestedStatus}`
      );
    }

    if (role !== "admin") {
      throw new Error("Only administrators can change change status");
    }
  }

  // ==========================================
  // ASSIGNMENT VALIDATION
  // ==========================================

  if (data.assignedTo !== undefined) {
    if (role !== "admin") {
      throw new Error("Only administrators can assign changes");
    }

    if (
      typeof data.assignedTo !== "string" ||
      !data.assignedTo
    ) {
      throw new Error("Invalid assigned user ID");
    }

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
        "Changes can only be assigned to employees"
      );
    }

    updateData.assignedTo = employee._id;
  }

  // ==========================================
  // AFFECTED ASSET VALIDATION
  // ==========================================

  if (data.affectedAssets !== undefined) {
    if (
      !Array.isArray(data.affectedAssets) ||
      !data.affectedAssets.every(
        (assetId) => typeof assetId === "string"
      )
    ) {
      throw new Error("Affected assets must be an array of asset IDs");
    }

    const assets =
      await assetRepository.findByIdsAndOrganization(
        data.affectedAssets,
        organizationId
      );

    if (
      assets.length !== data.affectedAssets.length
    ) {
      throw new Error(
        "One or more affected assets do not belong to this organization"
      );
    }

    updateData.affectedAssets =
      data.affectedAssets.map(
        (assetId) =>
          new mongoose.Types.ObjectId(assetId)
      );
  }

  // ==========================================
  // SCHEDULE VALIDATION
  // ==========================================

  const startDate =
    data.plannedStartAt ||
    change.plannedStartAt;

  const endDate =
    data.plannedEndAt ||
    change.plannedEndAt;

  if (
    startDate &&
    endDate &&
    new Date(endDate) <= new Date(startDate)
  ) {
    throw new Error(
      "Planned end time must be after planned start time"
    );
  }

  // ==========================================
  // APPROVAL
  // ==========================================

  if (requestedStatus === "Approved") {
    updateData.approvedBy =
      new mongoose.Types.ObjectId(userId);

    updateData.approvedAt = new Date();
  }

  // ==========================================
  // REJECTION
  // ==========================================

  if (requestedStatus === "Rejected") {
    if (!data.approvalReason) {
      throw new Error(
        "A reason is required when rejecting a change"
      );
    }

    updateData.rejectedBy =
      new mongoose.Types.ObjectId(userId);

    updateData.rejectedAt = new Date();
  }

  // ==========================================
  // START CHANGE
  // ==========================================

  if (requestedStatus === "In Progress") {
    updateData.startedAt = new Date();
  }

  // ==========================================
  // COMPLETE CHANGE
  // ==========================================

  if (requestedStatus === "Completed") {
    updateData.completedAt = new Date();
  }

  // ==========================================
  // FAILED CHANGE
  // ==========================================

  if (requestedStatus === "Failed") {
    if (!data.failureReason) {
      throw new Error(
        "Failure reason is required when marking a change as failed"
      );
    }

    updateData.failedAt = new Date();
  }

  // ==========================================
  // CANCELLED CHANGE
  // ==========================================

  if (requestedStatus === "Cancelled") {
    updateData.cancelledAt = new Date();
  }

  // ==========================================
  // UPDATE DATABASE
  // ==========================================

  const updatedChange = await changeRepository.updateByIdAndOrganization(
    id,
    organizationId,
    updateData
  );

  if (
    updatedChange &&
    (requestedStatus === "Approved" || requestedStatus === "Rejected")
  ) {
    await queueNotificationEvent({
      eventKey: `change-${requestedStatus.toLowerCase()}-${updatedChange._id.toString()}`,
      recipients: [updatedChange.requestedBy.toString()],
      organizationId,
      title: `Change Request ${requestedStatus}`,
      message: `Change request ${updatedChange.changeId} has been ${requestedStatus.toLowerCase()}.`,
      type: "Change Request Approval",
      entityType: "Change",
      entityId: updatedChange._id.toString(),
      priority: "High",
    });
  }

  return updatedChange;
};

// ==========================================
// DELETE CHANGE
// ==========================================

export const deleteChange = async (
  id: string,
  organizationId: string
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return changeRepository.deleteByIdAndOrganization(
    id,
    organizationId
  );
};
