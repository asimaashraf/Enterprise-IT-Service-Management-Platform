import { Response } from "express";

import {
  createSLAForIncident,
  getSLAByIncident,
  getSLAsByOrganization,
  checkSLABreach,
  recordSLAResponse,
  recordSLAResolution,
} from "./sla.service";

import { AuthRequest } from "../../middleware/auth.middleware";

// ==========================================
// CREATE SLA FOR INCIDENT
// ==========================================

export const createSLAController = async (
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

    const sla = await createSLAForIncident(
      req.params.incidentId as string,
      req.user.organizationId,
      {
        businessHours: req.body?.businessHours,
      }
    );

    res.status(201).json({
      success: true,
      message: "SLA created successfully",
      data: sla,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET SLA BY INCIDENT
// ==========================================

export const getSLAController = async (
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

    const sla = await getSLAByIncident(
      req.params.incidentId as string,
      req.user.organizationId
    );

    if (!sla) {
      return res.status(404).json({
        success: false,
        message: "SLA not found",
      });
    }

    res.status(200).json({
      success: true,
      data: sla,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET ALL SLAS
// ==========================================

export const getSLAsController = async (
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

    const slas = await getSLAsByOrganization(
      req.user.organizationId
    );

    res.status(200).json({
      success: true,
      data: slas,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// CHECK SLA BREACH
// ==========================================

export const checkSLABreachController = async (
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

    const sla = await checkSLABreach(
      req.params.id as string,
      req.user.organizationId
    );

    res.status(200).json({
      success: true,
      message: "SLA breach status checked successfully",
      data: sla,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// RECORD RESPONSE
// ==========================================

export const recordSLAResponseController = async (
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

    const sla = await recordSLAResponse(
      req.params.id as string,
      req.user.organizationId
    );

    res.status(200).json({
      success: true,
      message: "SLA response recorded successfully",
      data: sla,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// RECORD RESOLUTION
// ==========================================

export const recordSLAResolutionController = async (
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

    const sla = await recordSLAResolution(
      req.params.id as string,
      req.user.organizationId
    );

    res.status(200).json({
      success: true,
      message:
        "SLA resolution recorded successfully",
      data: sla,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};