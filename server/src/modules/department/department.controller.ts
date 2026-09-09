import { Response } from "express";

import {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
} from "./department.service";

import { AuthRequest } from "../../middleware/auth.middleware";

// ==========================================
// CREATE DEPARTMENT
// ADMIN ONLY
// ==========================================

export const createDepartmentController = async (
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

    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Department name is required",
      });
    }

    const department = await createDepartment({
      name,
      description,
      organizationId: req.user.organizationId,
    });

    return res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: department,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET ALL DEPARTMENTS
// ADMIN + EMPLOYEE
// ==========================================

export const getDepartmentsController = async (
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

    const departments = await getDepartments(
      req.user.organizationId
    );

    return res.status(200).json({
      success: true,
      data: departments,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET DEPARTMENT BY ID
// ADMIN + EMPLOYEE
// ==========================================

export const getDepartmentController = async (
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

    const department = await getDepartmentById(
      req.params.id as string,
      req.user.organizationId
    );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: department,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// UPDATE DEPARTMENT
// ADMIN ONLY
// ==========================================

export const updateDepartmentController = async (
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

    const department = await updateDepartment(
      req.params.id as string,
      req.user.organizationId,
      req.body
    );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Department updated successfully",
      data: department,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// DELETE DEPARTMENT
// ADMIN ONLY
// ==========================================

export const deleteDepartmentController = async (
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

    const department = await deleteDepartment(
      req.params.id as string,
      req.user.organizationId
    );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Department deleted successfully",
      data: department,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};