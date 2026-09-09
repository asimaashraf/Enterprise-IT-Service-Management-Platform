import mongoose from "mongoose";

import { serviceCatalogRepository } from "./serviceCatalog.repository";

// ==========================================
// CREATE SERVICE
// ==========================================

export const createServiceCatalog = async (
  name: string,
  description: string,
  category: string | undefined,
  organizationId: string,
  createdBy: string,
  isActive: boolean = true
) => {
  return serviceCatalogRepository.create({
    name,
    description,
    category,
    organizationId: new mongoose.Types.ObjectId(
      organizationId
    ),
    createdBy: new mongoose.Types.ObjectId(
      createdBy
    ),
    isActive,
  });
};

// ==========================================
// GET ALL SERVICES
// ==========================================

export const getServiceCatalogs = async (
  organizationId: string
) => {
  return serviceCatalogRepository.findAllByOrganization(
    organizationId
  );
};

// ==========================================
// GET SERVICE BY ID
// ==========================================

export const getServiceCatalogById = async (
  id: string,
  organizationId: string
) => {
  return serviceCatalogRepository.findByIdAndOrganization(
    id,
    organizationId
  );
};

// ==========================================
// UPDATE SERVICE
// ==========================================

export const updateServiceCatalog = async (
  id: string,
  organizationId: string,
  updateData: {
    name?: string;
    description?: string;
    category?: string;
    isActive?: boolean;
  }
) => {
  return serviceCatalogRepository.updateByIdAndOrganization(
    id,
    organizationId,
    updateData
  );
};

// ==========================================
// DELETE SERVICE
// ==========================================

export const deleteServiceCatalog = async (
  id: string,
  organizationId: string
) => {
  return serviceCatalogRepository.deleteByIdAndOrganization(
    id,
    organizationId
  );
};
