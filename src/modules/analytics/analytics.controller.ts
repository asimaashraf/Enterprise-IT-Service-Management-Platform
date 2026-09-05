import { Response } from "express";

import {
  getTechnicianPerformance,
  getIncidentTrends,
  getSLACompliance,
  getResolutionTime,
  getAssetHealth,
  getChangeSuccessRate,
} from "./analytics.service";

import { AuthRequest } from "../../middleware/auth.middleware";

// ==========================================
// INCIDENT TRENDS
// ==========================================

export const getIncidentTrendsController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required",
      });
    }

    const data = await getIncidentTrends(organizationId);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("Incident Trends Analytics Error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to retrieve incident trends analytics",
    });
  }
};

// ==========================================
// SLA COMPLIANCE
// ==========================================

export const getSLAComplianceController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required",
      });
    }

    const data = await getSLACompliance(organizationId);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("SLA Compliance Analytics Error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to retrieve SLA compliance analytics",
    });
  }
};

// ==========================================
// RESOLUTION TIME
// ==========================================

export const getResolutionTimeController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required",
      });
    }

    const data = await getResolutionTime(organizationId);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("Resolution Time Analytics Error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to retrieve resolution time analytics",
    });
  }
};

// ==========================================
// TECHNICIAN PERFORMANCE
// ==========================================

export const getTechnicianPerformanceController =
  async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      const organizationId =
        req.user?.organizationId;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message:
            "Organization ID is required",
        });
      }

      const data =
        await getTechnicianPerformance(
          organizationId
        );

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      console.error(
        "Technician Performance Analytics Error:",
        error
      );

      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Failed to retrieve technician performance analytics",
      });
    }
  };

// ==========================================
// ASSET HEALTH
// ==========================================

export const getAssetHealthController =
  async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      const organizationId =
        req.user?.organizationId;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message:
            "Organization ID is required",
        });
      }

      const data =
        await getAssetHealth(
          organizationId
        );

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      console.error(
        "Asset Health Analytics Error:",
        error
      );

      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Failed to retrieve asset health analytics",
      });
    }
  };

// ==========================================
// CHANGE SUCCESS RATE
// ==========================================

export const getChangeSuccessRateController =
  async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      const organizationId =
        req.user?.organizationId;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message:
            "Organization ID is required",
        });
      }

      const data =
        await getChangeSuccessRate(
          organizationId
        );

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      console.error(
        "Change Success Rate Analytics Error:",
        error
      );

      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Failed to retrieve change success rate analytics",
      });
    }
  };