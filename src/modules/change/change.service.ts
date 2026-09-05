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
  organizationId: string
) => {
  return changeRepository.findAllByOrganization(
    organizationId
  );
};

// ==========================================
// GET CHANGE BY ID
// ==========================================

export const getChangeById = async (
  id: string,
  organizationId: string
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return changeRepository.findByIdAndOrganization(
    id,
    organizationId
  );
};

// ==========================================
// UPDATE CHANGE
// ==========================================

export const updateChange = async (
  id: string,
  organizationId: string,
  userId: string,
  data: UpdateChangeData
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

  const currentStatus = String(
    change.status
  ).trim();

  const requestedStatus = data.status
    ? String(data.status).trim()
    : undefined;

  const updateData: Record<string, any> = {
    ...data,
  };

  if (requestedStatus) {
    updateData.status = requestedStatus;
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
        "Changes can only be assigned to employees"
      );
    }

    updateData.assignedTo = employee._id;
  }

  // ==========================================
  // AFFECTED ASSET VALIDATION
  // ==========================================

  if (data.affectedAssets) {
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
    if (
      currentStatus !== "Approved" &&
      currentStatus !== "Scheduled"
    ) {
      throw new Error(
        `Only approved or scheduled changes can be started. Current status: ${currentStatus}`
      );
    }

    updateData.startedAt = new Date();
  }

  // ==========================================
  // COMPLETE CHANGE
  // ==========================================

  if (requestedStatus === "Completed") {
    if (currentStatus !== "In Progress") {
      throw new Error(
        "Only changes in progress can be completed"
      );
    }

    updateData.completedAt = new Date();
  }

  // ==========================================
  // FAILED CHANGE
  // ==========================================

  if (requestedStatus === "Failed") {
    if (currentStatus !== "In Progress") {
      throw new Error(
        "Only changes in progress can be marked as failed"
      );
    }

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
    if (
      currentStatus === "Completed" ||
      currentStatus === "Failed"
    ) {
      throw new Error(
        "Completed or failed changes cannot be cancelled"
      );
    }

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