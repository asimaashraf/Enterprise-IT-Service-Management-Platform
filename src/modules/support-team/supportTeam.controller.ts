import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";

import {
  createSupportTeam,
  getSupportTeams,
  getSupportTeamById,
  updateSupportTeam,
  deleteSupportTeam,
} from "./supportTeam.service";

// ==========================================
// CREATE SUPPORT TEAM
// ==========================================

export const createSupportTeamController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const team = await createSupportTeam({
      ...req.body,
      organizationId: req.user.organizationId,
    });

    return res.status(201).json({
      success: true,
      message: "Support team created successfully",
      data: team,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET ALL SUPPORT TEAMS
// ==========================================

export const getSupportTeamsController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const teams = await getSupportTeams(
      req.user.organizationId
    );

    return res.status(200).json({
      success: true,
      data: teams,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET SUPPORT TEAM BY ID
// ==========================================

export const getSupportTeamByIdController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const teamId = String(req.params.id);

    const team = await getSupportTeamById(
      teamId,
      req.user.organizationId
    );

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Support team not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: team,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// UPDATE SUPPORT TEAM
// ADMIN ONLY
// ==========================================

export const updateSupportTeamController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const teamId = String(req.params.id);

    const team = await updateSupportTeam(
      teamId,
      req.user.organizationId,
      req.body
    );

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Support team not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Support team updated successfully",
      data: team,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// DELETE SUPPORT TEAM
// ADMIN ONLY
// ==========================================

export const deleteSupportTeamController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const teamId = String(req.params.id);

    const team = await deleteSupportTeam(
      teamId,
      req.user.organizationId
    );

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Support team not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Support team deleted successfully",
      data: team,
    });
  } catch (error: any) {
    const status = error.message.includes("referenced by an escalation policy")
      ? 409
      : 400;
    return res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};