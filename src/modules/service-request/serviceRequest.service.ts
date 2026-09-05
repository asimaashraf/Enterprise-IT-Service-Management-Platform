import mongoose from "mongoose";

import ServiceRequest, {
  ServiceRequestPriority,
  ServiceRequestStatus,
  ServiceRequestType,
} from "./serviceRequest.model";

import AuthUser from "../auth/auth.model";
import { queueNotificationEvent } from "../notification/notification.service";

// ==========================================
// TYPES
// ==========================================

interface CreateServiceRequestData {
  requestId: string;
  title: string;
  description: string;
  type: ServiceRequestType;
  priority?: ServiceRequestPriority;
  requestedBy: string;
  organizationId: string;
}

interface UpdateServiceRequestData {
  title?: string;
  description?: string;
  type?: ServiceRequestType;
  priority?: ServiceRequestPriority;
  status?: ServiceRequestStatus;
  assignedTo?: string;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
}

// ==========================================
// CREATE SERVICE REQUEST
// ==========================================

export const createServiceRequest = async (
  data: CreateServiceRequestData
) => {
  // ------------------------------------------
  // DUPLICATE REQUEST ID
  // ------------------------------------------

  const existingRequest =
    await ServiceRequest.findOne({
      requestId: data.requestId,
      organizationId: data.organizationId,
    });

  if (existingRequest) {
    throw new Error(
      "A service request with this ID already exists in this organization"
    );
  }

  // ------------------------------------------
  // VALIDATE REQUESTER
  // ------------------------------------------

  const requester = await AuthUser.findOne({
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
  // CONVERT STRING IDS TO OBJECT IDS
  // ------------------------------------------

  const requestedBy = new mongoose.Types.ObjectId(
    data.requestedBy
  );

  const organizationId =
    new mongoose.Types.ObjectId(
      data.organizationId
    );

  // ------------------------------------------
  // CREATE
  // ------------------------------------------

  return ServiceRequest.create({
    requestId: data.requestId,
    title: data.title,
    description: data.description,
    type: data.type,
    priority: data.priority || "Medium",
    status: "Pending",

    // ObjectId values
    requestedBy,
    organizationId,
  });
};

// ==========================================
// GET ALL SERVICE REQUESTS
// ==========================================

export const getServiceRequestsByOrganization =
  async (organizationId: string) => {
    return ServiceRequest.find({
      organizationId,
    })
      .populate(
        "requestedBy",
        "name email role"
      )
      .populate(
        "assignedTo",
        "name email role"
      )
      .populate(
        "approvedBy",
        "name email role"
      )
      .sort({
        createdAt: -1,
      });
  };

// ==========================================
// GET SERVICE REQUEST BY ID
// ==========================================

export const getServiceRequestById = async (
  id: string,
  organizationId: string
) => {
  return ServiceRequest.findOne({
    _id: id,
    organizationId,
  })
    .populate(
      "requestedBy",
      "name email role"
    )
    .populate(
      "assignedTo",
      "name email role"
    )
    .populate(
      "approvedBy",
      "name email role"
    );
};

// ==========================================
// UPDATE SERVICE REQUEST
// ==========================================

export const updateServiceRequest = async (
  id: string,
  organizationId: string,
  data: UpdateServiceRequestData
) => {
  const existingRequest =
    await ServiceRequest.findOne({
      _id: id,
      organizationId,
    });

  if (!existingRequest) {
    return null;
  }

  const updateData: Record<string, any> = {
    ...data,
  };

  const currentStatus =
    existingRequest.status;

  const requestedStatus = data.status;

  // ==========================================
  // ASSIGN USER
  // ==========================================

  if (data.assignedTo) {
    const employee = await AuthUser.findOne({
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
        "Service requests can only be assigned to employees"
      );
    }

    updateData.assignedTo = employee._id;
  }

  // ==========================================
  // APPROVE REQUEST
  // ==========================================

  if (requestedStatus === "Approved") {
    if (currentStatus !== "Pending") {
      throw new Error(
        `Only pending service requests can be approved. Current status: ${currentStatus}`
      );
    }

    if (!data.approvedBy) {
      throw new Error(
        "Approving administrator is required"
      );
    }

    updateData.approvedBy =
      new mongoose.Types.ObjectId(
        data.approvedBy
      );

    updateData.approvedAt =
      data.approvedAt || new Date();
  }

  // ==========================================
  // REJECT REQUEST
  // ==========================================

  if (requestedStatus === "Rejected") {
    if (currentStatus !== "Pending") {
      throw new Error(
        `Only pending service requests can be rejected. Current status: ${currentStatus}`
      );
    }

    if (!data.rejectionReason) {
      throw new Error(
        "Rejection reason is required when rejecting a service request"
      );
    }

    updateData.rejectedAt =
      new Date();
  }

  // ==========================================
  // START REQUEST
  // ==========================================

  if (requestedStatus === "In Progress") {
    if (currentStatus !== "Approved") {
      throw new Error(
        `Only approved service requests can be started. Current status: ${currentStatus}`
      );
    }

    if (!existingRequest.assignedTo) {
      throw new Error(
        "Service request must be assigned before work can begin"
      );
    }

    updateData.startedAt =
      existingRequest.startedAt ||
      new Date();
  }

  // ==========================================
  // COMPLETE REQUEST
  // ==========================================

  if (requestedStatus === "Completed") {
    if (currentStatus !== "In Progress") {
      throw new Error(
        "Only service requests in progress can be completed"
      );
    }

    if (!existingRequest.assignedTo) {
      throw new Error(
        "Service request must be assigned before completion"
      );
    }

    updateData.completedAt =
      new Date();
  }

  // ==========================================
  // CANCEL REQUEST
  // ==========================================

  if (requestedStatus === "Cancelled") {
    if (
      currentStatus === "Completed" ||
      currentStatus === "Rejected"
    ) {
      throw new Error(
        "Completed or rejected service requests cannot be cancelled"
      );
    }

    updateData.cancelledAt =
      new Date();
  }

  // ==========================================
  // UPDATE DATABASE
  // ==========================================

  const updatedRequest = await ServiceRequest.findOneAndUpdate(
    {
      _id: id,
      organizationId,
    },
    updateData,
    {
      new: true,
      runValidators: true,
    }
  )
    .populate(
      "requestedBy",
      "name email role"
    )
    .populate(
      "assignedTo",
      "name email role"
    )
    .populate(
      "approvedBy",
      "name email role"
    );

  if (
    updatedRequest &&
    (requestedStatus || data.assignedTo)
  ) {
    const requestedBy = existingRequest.requestedBy as any;
    const assignedTo = updatedRequest.assignedTo as any;
    const recipients = [
      requestedBy?._id?.toString() || requestedBy?.toString(),
      assignedTo?._id?.toString() || assignedTo?.toString(),
    ].filter((recipient): recipient is string => Boolean(recipient));

    await queueNotificationEvent({
      eventKey: `service-request-updated-${updatedRequest._id.toString()}-${requestedStatus || "assigned"}`,
      recipients,
      organizationId,
      title: "Service Request Updated",
      message: `Service request ${updatedRequest.requestId} has been updated${requestedStatus ? ` to ${requestedStatus}` : ""}.`,
      type: "Service Request Updated",
      entityType: "ServiceRequest",
      entityId: updatedRequest._id.toString(),
      priority: updatedRequest.priority,
    });
  }

  return updatedRequest;
};

// ==========================================
// DELETE SERVICE REQUEST
// ==========================================

export const deleteServiceRequest = async (
  id: string,
  organizationId: string
) => {
  return ServiceRequest.findOneAndDelete({
    _id: id,
    organizationId,
  });
};