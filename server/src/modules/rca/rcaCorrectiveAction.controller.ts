import { inputObject } from "./rca.validation";
import { Response } from "express";

import {
  createCorrectiveAction,
  getCorrectiveActions,
  getCorrectiveActionById,
  updateCorrectiveAction,
  deleteCorrectiveAction,
} from "./rcaCorrectiveAction.service";

import { AuthRequest } from "../../middleware/auth.middleware";

// ==========================================
// CREATE
// ==========================================

export const createCorrectiveActionController =
  async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required",
        });
      }

      if (!req.user.organizationId) {
        return res.status(403).json({
          success: false,
          message:
            "Organization access is required",
        });
      }

      if (!req.user.id) {
        return res.status(401).json({
          success: false,
          message:
            "User authentication is required",
        });
      }

      inputObject(req.body);
      const rcaId = String(
        req.params.id
      );

      const action =
        await createCorrectiveAction({
          rcaId,
          title: req.body.title,
          description:
            req.body.description,
          assignedTo:
            req.body.assignedTo,
          dueDate:
            req.body.dueDate,
          createdBy:
            req.user.id,
          organizationId:
            req.user.organizationId,
        });

      return res.status(201).json({
        success: true,
        message:
          "Corrective action created successfully",
        data: action,
      });
    } catch (error: any) {
      console.error(
        "Create Corrective Action Error:",
        error
      );

      return res.status(400).json({
        success: false,
        message:
          error?.message ||
          "Failed to create corrective action",
      });
    }
  };

// ==========================================
// GET ALL
// ==========================================

export const getCorrectiveActionsController =
  async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required",
        });
      }

      if (!req.user.organizationId) {
        return res.status(403).json({
          success: false,
          message:
            "Organization access is required",
        });
      }

      const rcaId = String(
        req.params.id
      );

      const actions =
        await getCorrectiveActions(
          rcaId,
          req.user.organizationId
        );

      return res.status(200).json({
        success: true,
        count: actions.length,
        data: actions,
      });
    } catch (error: any) {
      console.error(
        "Get Corrective Actions Error:",
        error
      );

      return res.status(400).json({
        success: false,
        message:
          error?.message ||
          "Failed to get corrective actions",
      });
    }
  };

// ==========================================
// GET BY ID
// ==========================================

export const getCorrectiveActionController =
  async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required",
        });
      }

      if (!req.user.organizationId) {
        return res.status(403).json({
          success: false,
          message:
            "Organization access is required",
        });
      }

      const rcaId = String(
        req.params.id
      );

      const actionId = String(
        req.params.actionId
      );

      const action =
        await getCorrectiveActionById(
          rcaId,
          actionId,
          req.user.organizationId
        );

      if (!action) {
        return res.status(404).json({
          success: false,
          message:
            "Corrective action not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: action,
      });
    } catch (error: any) {
      console.error(
        "Get Corrective Action Error:",
        error
      );

      return res.status(400).json({
        success: false,
        message:
          error?.message ||
          "Failed to get corrective action",
      });
    }
  };

// ==========================================
// UPDATE
// ==========================================

export const updateCorrectiveActionController =
  async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required",
        });
      }

      if (!req.user.organizationId) {
        return res.status(403).json({
          success: false,
          message:
            "Organization access is required",
        });
      }

      const rcaId = String(
        req.params.id
      );

      const actionId = String(
        req.params.actionId
      );

      const action =
        await updateCorrectiveAction(
          rcaId,
          actionId,
          req.user.organizationId,
          req.body
        );

      if (!action) {
        return res.status(404).json({
          success: false,
          message:
            "Corrective action not found",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Corrective action updated successfully",
        data: action,
      });
    } catch (error: any) {
      console.error(
        "Update Corrective Action Error:",
        error
      );

      return res.status(400).json({
        success: false,
        message:
          error?.message ||
          "Failed to update corrective action",
      });
    }
  };

// ==========================================
// DELETE
// ==========================================

export const deleteCorrectiveActionController =
  async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required",
        });
      }

      if (!req.user.organizationId) {
        return res.status(403).json({
          success: false,
          message:
            "Organization access is required",
        });
      }

      const rcaId = String(
        req.params.id
      );

      const actionId = String(
        req.params.actionId
      );

      const deletedAction =
        await deleteCorrectiveAction(
          rcaId,
          actionId,
          req.user.organizationId
        );

      if (!deletedAction) {
        return res.status(404).json({
          success: false,
          message:
            "Corrective action not found",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Corrective action deleted successfully",
        data: deletedAction,
      });
    } catch (error: any) {
      console.error(
        "Delete Corrective Action Error:",
        error
      );

      return res.status(400).json({
        success: false,
        message:
          error?.message ||
          "Failed to delete corrective action",
      });
    }
  };
