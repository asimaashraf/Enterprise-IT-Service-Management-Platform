import { Request, Response } from "express";
import {
  createServiceCatalog,
  getServiceCatalogs,
  getServiceCatalogById,
  updateServiceCatalog,
  deleteServiceCatalog,
} from "./serviceCatalog.service";

// ==========================================
// CREATE SERVICE
// ==========================================

export const createServiceCatalogController = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      name,
      description,
      category,
      isActive,
    } = req.body;

    const organizationId = (req as any).user.organizationId;
    const createdBy = (req as any).user.id;

    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: "Name and description are required",
      });
    }

    const service = await createServiceCatalog(
      name,
      description,
      category,
      organizationId,
      createdBy,
      isActive ?? true
    );

    return res.status(201).json({
      success: true,
      message: "Service catalog item created successfully",
      data: service,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET ALL SERVICES
// ==========================================

export const getServiceCatalogsController = async (
  req: Request,
  res: Response
) => {
  try {
    const organizationId = (req as any).user.organizationId;

    const services = await getServiceCatalogs(
      organizationId
    );

    return res.status(200).json({
      success: true,
      data: services,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET SERVICE BY ID
// ==========================================

export const getServiceCatalogByIdController = async (
  req: Request,
  res: Response
) => {
  try {
    const id = req.params.id as string;
    const organizationId = (req as any).user.organizationId;

    const service = await getServiceCatalogById(
      id,
      organizationId
    );

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service catalog item not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: service,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// UPDATE SERVICE
// ==========================================

export const updateServiceCatalogController = async (
  req: Request,
  res: Response
) => {
  try {
    const id = req.params.id as string;
    const organizationId = (req as any).user.organizationId;

    const service = await updateServiceCatalog(
      id,
      organizationId,
      req.body
    );

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service catalog item not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Service catalog item updated successfully",
      data: service,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// DELETE SERVICE
// ==========================================

export const deleteServiceCatalogController = async (
  req: Request,
  res: Response
) => {
  try {
    const id = req.params.id as string;
    const organizationId = (req as any).user.organizationId;

    const service = await deleteServiceCatalog(
      id,
      organizationId
    );

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service catalog item not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Service catalog item deleted successfully",
      data: service,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};