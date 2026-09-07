import { Response } from "express";

import {
  createServiceRequest,
  getServiceRequestsByOrganization,
  getServiceRequestById,
  updateServiceRequest,
  deleteServiceRequest,
} from "./serviceRequest.service";

import { AuthRequest } from "../../middleware/auth.middleware";

// ==========================================
// CREATE SERVICE REQUEST
// ADMIN + EMPLOYEE
// ==========================================

export const createServiceRequestController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    // ------------------------------------------
    // AUTHENTICATION CHECK
    // ------------------------------------------

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "User authentication is required",
      });
    }

    // ------------------------------------------
    // ORGANIZATION CHECK
    // ------------------------------------------

    if (!req.user.organizationId) {
      return res.status(403).json({
        success: false,
        message: "Organization access is required",
      });
    }

    // ------------------------------------------
    // CREATE SERVICE REQUEST
    // ------------------------------------------

    const serviceRequest = await createServiceRequest({
      ...req.body,
      requestedBy: req.user.id,
      organizationId: req.user.organizationId,
    });

    return res.status(201).json({
      success: true,
      message: "Service request created successfully",
      data: serviceRequest,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET ALL SERVICE REQUESTS
// ADMIN + EMPLOYEE
// ORGANIZATION SCOPED
// ==========================================

export const getServiceRequestsController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "User authentication is required",
      });
    }

    if (!req.user.organizationId) {
      return res.status(403).json({
        success: false,
        message: "Organization access is required",
      });
    }

    const serviceRequests =
      await getServiceRequestsByOrganization(
        req.user.organizationId
      );

    return res.status(200).json({
      success: true,
      data: serviceRequests,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET SERVICE REQUEST BY ID
// ADMIN + EMPLOYEE
// ORGANIZATION SCOPED
// ==========================================

export const getServiceRequestController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "User authentication is required",
      });
    }

    if (!req.user.organizationId) {
      return res.status(403).json({
        success: false,
        message: "Organization access is required",
      });
    }

    const serviceRequest =
      await getServiceRequestById(
        req.params.id as string,
        req.user.organizationId
      );

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: "Service request not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: serviceRequest,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// UPDATE SERVICE REQUEST
// ADMIN + EMPLOYEE
//
// ADMIN:
// - Can assign
// - Can approve
// - Can reject
// - Can update request
//
// REQUESTER:
// - Can update basic information
// - Can cancel own request
//
// ASSIGNED EMPLOYEE:
// - Can move request to In Progress
// - Can complete request
//
// EMPLOYEE:
// - Cannot assign
// - Cannot approve
// - Cannot reject
// ==========================================

export const updateServiceRequestController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    // ------------------------------------------
    // AUTHENTICATION CHECK
    // ------------------------------------------

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "User authentication is required",
      });
    }

    // ------------------------------------------
    // ORGANIZATION CHECK
    // ------------------------------------------

    if (!req.user.organizationId) {
      return res.status(403).json({
        success: false,
        message: "Organization access is required",
      });
    }

    // ------------------------------------------
    // GET EXISTING REQUEST
    // ------------------------------------------

    const existingRequest =
      await getServiceRequestById(
        req.params.id as string,
        req.user.organizationId
      );

    if (!existingRequest) {
      return res.status(404).json({
        success: false,
        message: "Service request not found",
      });
    }

    // ==========================================
    // ADMIN
    // ==========================================

    if (req.user.role === "admin") {
      const updateData = {
        ...req.body,

        // Automatically record approving admin
        ...(req.body.status === "Approved"
          ? {
              approvedBy: req.user.id,
              approvedAt: new Date(),
            }
          : {}),
      };

      const serviceRequest =
        await updateServiceRequest(
          req.params.id as string,
          req.user.organizationId,
          updateData
        );

      return res.status(200).json({
        success: true,
        message: "Service request updated successfully",
        data: serviceRequest,
      });
    }

    // ==========================================
    // EMPLOYEE
    // ==========================================

    const requestedBy =
      existingRequest.requestedBy as
        | {
            _id?: unknown;
          }
        | undefined;

    const requestedById =
      requestedBy?._id?.toString();

    const isRequester =
      requestedById === req.user.id;

    // ------------------------------------------
    // EMPLOYEE CANNOT ASSIGN
    // ------------------------------------------

    if (req.body.assignedTo !== undefined) {
      return res.status(403).json({
        success: false,
        message:
          "Employees cannot assign service requests",
      });
    }

    // ------------------------------------------
    // EMPLOYEE CANNOT APPROVE
    // ------------------------------------------

    if (req.body.status === "Approved") {
      return res.status(403).json({
        success: false,
        message:
          "Employees cannot approve service requests",
      });
    }

    // ------------------------------------------
    // EMPLOYEE CANNOT REJECT
    // ------------------------------------------

    if (req.body.status === "Rejected") {
      return res.status(403).json({
        success: false,
        message:
          "Employees cannot reject service requests",
      });
    }

    // ------------------------------------------
    // REQUESTER CAN CANCEL
    // ------------------------------------------

    if (req.body.status === "Cancelled") {
      if (!isRequester) {
        return res.status(403).json({
          success: false,
          message:
            "Only the requester can cancel this service request",
        });
      }

      if (
        existingRequest.status === "Completed" ||
        existingRequest.status === "Rejected"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "This service request cannot be cancelled",
        });
      }
    }

    // ------------------------------------------
    // EMPLOYEES ARE REQUESTERS, NOT OPERATIONAL PROCESSORS
    // ------------------------------------------

    if (
      req.body.status === "In Progress" ||
      req.body.status === "Completed"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Employees cannot perform operational service request transitions",
      });
    }

    // ------------------------------------------
    // OTHER EMPLOYEES
    // ------------------------------------------

    if (
      !isRequester
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to update this service request",
      });
    }

    // ------------------------------------------
    // UPDATE
    // ------------------------------------------

    const serviceRequest =
      await updateServiceRequest(
        req.params.id as string,
        req.user.organizationId,
        req.body
      );

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: "Service request not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Service request updated successfully",
      data: serviceRequest,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// DELETE SERVICE REQUEST
// ADMIN ONLY
// ==========================================

export const deleteServiceRequestController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    // ------------------------------------------
    // AUTHENTICATION CHECK
    // ------------------------------------------

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "User authentication is required",
      });
    }

    // ------------------------------------------
    // ADMIN CHECK
    // ------------------------------------------

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message:
          "Only administrators can delete service requests",
      });
    }

    // ------------------------------------------
    // ORGANIZATION CHECK
    // ------------------------------------------

    if (!req.user.organizationId) {
      return res.status(403).json({
        success: false,
        message: "Organization access is required",
      });
    }

    // ------------------------------------------
    // DELETE
    // ------------------------------------------

    const serviceRequest =
      await deleteServiceRequest(
        req.params.id as string,
        req.user.organizationId
      );

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: "Service request not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Service request deleted successfully",
      data: serviceRequest,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
