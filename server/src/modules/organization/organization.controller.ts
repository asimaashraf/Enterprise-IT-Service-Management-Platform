import { Request, Response } from "express";

import {
  createOrganization,
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
} from "./organization.service";

import { AuthRequest } from "../../middleware/auth.middleware";

// ==========================================
// CREATE ORGANIZATION
// ==========================================

export const createOrganizationController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const organization = await createOrganization(req.body);

    res.status(201).json({
      success: true,
      message: "Organization created successfully",
      data: organization,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET ALL ORGANIZATIONS
// ==========================================

export const getOrganizationsController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(403).json({
        success: false,
        message: "Organization access is required",
      });
    }

    const organization = await getOrganizationById(req.user.organizationId);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    res.status(200).json({
      success: true,
      data: [organization],
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET ORGANIZATION BY ID
// ==========================================

export const getOrganizationByIdController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(403).json({
        success: false,
        message: "Organization access is required",
      });
    }

    const organizationId = req.params.id as string;

    if (organizationId !== req.user.organizationId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this organization",
      });
    }

    const organization = await getOrganizationById(
      organizationId
    );

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    res.status(200).json({
      success: true,
      data: organization,
    });
  } catch (error: any) {
    const status = error.message.includes("cannot be deleted") ? 409 : 500;
    res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// UPDATE ORGANIZATION
// ==========================================

export const updateOrganizationController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(403).json({
        success: false,
        message: "Organization access is required",
      });
    }

    const organizationId = req.params.id as string;

    if (organizationId !== req.user.organizationId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to modify this organization",
      });
    }

    const organization = await updateOrganization(
      organizationId,
      req.body
    );

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Organization updated successfully",
      data: organization,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// DELETE ORGANIZATION
// ==========================================

export const deleteOrganizationController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(403).json({
        success: false,
        message: "Organization access is required",
      });
    }

    const organizationId = req.params.id as string;

    if (organizationId !== req.user.organizationId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this organization",
      });
    }

    const organization = await deleteOrganization(
      organizationId
    );

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Organization deleted successfully",
      data: organization,
    });
  } catch (error: any) {
    const status = error.message.includes("tenant-owned data exists")
      ? 409
      : 500;
    res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};