import mongoose from "mongoose";
import { authRepository } from "../auth/auth.repository";
import { assetRepository } from "./asset.repository";
import { AssetCategory } from "./asset.model";
import {
  AssetMaintenanceType,
  AssetMaintenanceStatus,
} from "./assetMaintenance.model";
import { assetMaintenanceRepository } from "./assetMaintenance.repository";
import { assetLifecycleRepository } from "./assetLifecycle.repository";
import AuthUser from "../auth/auth.model";

// ==========================================
// TYPES
// ==========================================

interface CreateAssetData {
  assetId: string;
  name: string;
  category: AssetCategory;
  description?: string;
  status?: "Available" | "Assigned" | "Maintenance" | "Retired";
  purchaseDate?: Date;
  purchasePrice?: number;
  warrantyProvider?: string;
  warrantyStartDate?: Date;
  warrantyEndDate?: Date;
  organizationId: string;
}

interface UpdateAssetData {
  name?: string;
  category?: AssetCategory;
  description?: string;
  status?: "Available" | "Assigned" | "Maintenance" | "Retired";
  purchaseDate?: Date;
  purchasePrice?: number;
  warrantyProvider?: string;
  warrantyStartDate?: Date;
  warrantyEndDate?: Date;
}

interface AssetReadContext {
  id: string;
  role: "admin" | "employee";
}

const lifecycleTransitions: Record<string, string[]> = {
  Available: ["Assigned", "Maintenance", "Retired"],
  Assigned: ["Available", "Maintenance", "Retired"],
  Maintenance: ["Available", "Retired"],
  Retired: [],
};

// ==========================================
// HELPERS
// ==========================================

const validateObjectId = (
  id: string,
  fieldName: string
): void => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${fieldName}`);
  }
};

// ==========================================
// CREATE ASSET
// ==========================================

export const createAsset = async (
  data: CreateAssetData
) => {
  validateObjectId(
    data.organizationId,
    "organization ID"
  );

  const existingAsset = await assetRepository.findOne({
    assetId: data.assetId,
    organizationId: data.organizationId,
  });

  if (existingAsset) {
    throw new Error(
      "An asset with this ID already exists in this organization"
    );
  }

  if (data.status === "Assigned") {
    throw new Error(
      "An asset must be assigned through the assignment operation"
    );
  }

  return assetRepository.create({
    assetId: data.assetId,
    name: data.name,
    category: data.category,
    description: data.description,
    status: data.status || "Available",
    purchaseDate: data.purchaseDate,
    purchasePrice: data.purchasePrice,
    warrantyProvider: data.warrantyProvider,
    warrantyStartDate: data.warrantyStartDate,
    warrantyEndDate: data.warrantyEndDate,
    organizationId: new mongoose.Types.ObjectId(
      data.organizationId
    ),
  });
};

// ==========================================
// GET ALL ASSETS
// ==========================================

export const getAssetsByOrganization = async (
  organizationId: string,
  reader: AssetReadContext
) => {
  validateObjectId(
    organizationId,
    "organization ID"
  );

  if (reader.role === "employee") {
    return assetRepository.findAllAssignedToUserByOrganization(
      organizationId,
      reader.id
    );
  }

  return assetRepository.findAllByOrganization(organizationId);
};

// ==========================================
// GET ASSET BY ID
// ==========================================

export const getAssetById = async (
  id: string,
  organizationId: string,
  reader: AssetReadContext
) => {
  validateObjectId(id, "asset ID");

  validateObjectId(
    organizationId,
    "organization ID"
  );

  if (reader.role === "employee") {
    return assetRepository.findByIdAndOrganizationAndAssignedTo(
      id,
      organizationId,
      reader.id
    );
  }

  return assetRepository.findByIdAndOrganization(id, organizationId);
};

// ==========================================
// UPDATE ASSET
// ==========================================

export const updateAsset = async (
  id: string,
  organizationId: string,
  data: UpdateAssetData,
  changedBy?: string
) => {
  validateObjectId(id, "asset ID");

  validateObjectId(
    organizationId,
    "organization ID"
  );

  const existing = await assetRepository.findOne({
    _id: id,
    organizationId,
  });

  if (!existing) {
    return null;
  }

  if (data.status && data.status !== existing.status) {
    if (!lifecycleTransitions[existing.status].includes(data.status)) {
      throw new Error(
        `Invalid asset lifecycle transition: ${existing.status} to ${data.status}`
      );
    }
  }

  if (data.status === "Assigned" && !existing.assignedTo) {
    throw new Error(
      "An asset must be assigned through the assignment operation"
    );
  }

  if (data.status === "Available" && existing.assignedTo) {
    throw new Error(
      "An assigned asset must be unassigned before it becomes available"
    );
  }

  if (
    (data.status === "Maintenance" || data.status === "Retired") &&
    existing.assignedTo
  ) {
    throw new Error(
      "An assigned asset must be unassigned before entering this lifecycle state"
    );
  }

  if (data.warrantyStartDate && data.warrantyEndDate &&
      new Date(data.warrantyEndDate) < new Date(data.warrantyStartDate)) {
    throw new Error("Warranty end date must be on or after the start date");
  }

  const updated = await assetRepository.updateByIdAndOrganization(
    id,
    organizationId,
    data
  );

  if (updated && data.status && data.status !== existing.status) {
    await assetLifecycleRepository.create({
      assetId: existing._id,
      organizationId: existing.organizationId,
      previousStatus: existing.status,
      newStatus: data.status,
      changedBy: changedBy && mongoose.Types.ObjectId.isValid(changedBy)
        ? new mongoose.Types.ObjectId(changedBy)
        : undefined,
    });
  }

  return updated;
};

// ==========================================
// DELETE ASSET
// ==========================================

export const deleteAsset = async (
  id: string,
  organizationId: string
) => {
  validateObjectId(id, "asset ID");

  validateObjectId(
    organizationId,
    "organization ID"
  );

  return assetRepository.deleteByIdAndOrganization(
    id,
    organizationId
  );
};

// ==========================================
// ASSIGN ASSET
// ==========================================

export const assignAsset = async (
  assetId: string,
  employeeId: string,
  organizationId: string,
  changedBy?: string
) => {
  validateObjectId(assetId, "asset ID");

  validateObjectId(employeeId, "employee ID");

  validateObjectId(
    organizationId,
    "organization ID"
  );

  // ------------------------------------------
  // Find asset in current organization
  // ------------------------------------------

  const asset = await assetRepository.findOne({
    _id: assetId,
    organizationId,
  });

  if (!asset) {
    throw new Error("Asset not found");
  }

  // ------------------------------------------
  // Asset must be available
  // ------------------------------------------

  if (asset.status !== "Available") {
    throw new Error(
      `Asset cannot be assigned because its status is ${asset.status}`
    );
  }

  // ------------------------------------------
  // Find active employee
  // in the same organization
  // ------------------------------------------

  const employee = await authRepository.findOne({
    _id: employeeId,
    organizationId,
    role: "employee",
    isActive: true,
  });

  if (!employee) {
    throw new Error(
      "Active employee not found in this organization"
    );
  }

  // ------------------------------------------
  // Assign asset through repository
  // ------------------------------------------

  const assigned = await assetRepository.assign(
    asset._id.toString(),
    employee._id.toString()
  );

  if (assigned) {
    await assetLifecycleRepository.create({
      assetId: asset._id,
      organizationId: asset.organizationId,
      previousStatus: asset.status,
      newStatus: "Assigned",
      changedBy: changedBy && mongoose.Types.ObjectId.isValid(changedBy)
        ? new mongoose.Types.ObjectId(changedBy)
        : undefined,
    });
  }

  return assigned;
};

// ==========================================
// UNASSIGN ASSET
// ==========================================

export const unassignAsset = async (
  assetId: string,
  organizationId: string,
  changedBy?: string
) => {
  validateObjectId(assetId, "asset ID");

  validateObjectId(
    organizationId,
    "organization ID"
  );

  // ------------------------------------------
  // Find asset in current organization
  // ------------------------------------------

  const asset = await assetRepository.findOne({
    _id: assetId,
    organizationId,
  });

  if (!asset) {
    throw new Error("Asset not found");
  }

  // ------------------------------------------
  // Asset must currently be assigned
  // ------------------------------------------

  if (!asset.assignedTo) {
    throw new Error(
      "Asset is not currently assigned"
    );
  }

  // ------------------------------------------
  // Unassign asset through repository
  // ------------------------------------------

  const unassigned = await assetRepository.unassign(
    asset._id.toString()
  );

  if (unassigned) {
    await assetLifecycleRepository.create({
      assetId: asset._id,
      organizationId: asset.organizationId,
      previousStatus: asset.status,
      newStatus: "Available",
      changedBy: changedBy && mongoose.Types.ObjectId.isValid(changedBy)
        ? new mongoose.Types.ObjectId(changedBy)
        : undefined,
    });
  }

  return unassigned;
};

export const getWarrantyStatus = (
  asset: {
    warrantyStartDate?: Date;
    warrantyEndDate?: Date;
  }
): "Active" | "Expired" | "Not Covered" | "Not Started" => {
  if (!asset.warrantyEndDate) {
    return "Not Covered";
  }

  if (
    asset.warrantyStartDate &&
    new Date(asset.warrantyStartDate) > new Date()
  ) {
    return "Not Started";
  }

  return new Date(asset.warrantyEndDate) >= new Date()
    ? "Active"
    : "Expired";
};

export const createMaintenanceRecord = async (
  assetId: string,
  organizationId: string,
  data: {
    date: Date;
    type: AssetMaintenanceType;
    description: string;
    cost?: number;
    status?: AssetMaintenanceStatus;
    createdBy: string;
  }
) => {
  validateObjectId(assetId, "asset ID");
  validateObjectId(organizationId, "organization ID");
  validateObjectId(data.createdBy, "createdBy ID");

  const asset = await assetRepository.findOne({
    _id: assetId,
    organizationId,
  });
  if (!asset) {
    throw new Error("Asset not found");
  }

  const creator = await AuthUser.findOne({
    _id: data.createdBy,
    organizationId,
    isActive: true,
  });
  if (!creator) {
    throw new Error("Maintenance creator not found in this organization");
  }

  if (!data.description?.trim()) {
    throw new Error("Maintenance description is required");
  }

  const parsedDate = new Date(data.date);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("Invalid maintenance date");
  }

  return assetMaintenanceRepository.create({
    assetId: asset._id,
    organizationId: asset.organizationId,
    date: parsedDate,
    type: data.type,
    description: data.description.trim(),
    cost: data.cost,
    status: data.status,
    createdBy: creator._id,
  });
};

export const getMaintenanceHistory = async (
  assetId: string,
  organizationId: string,
  reader: AssetReadContext
) => {
  validateObjectId(assetId, "asset ID");
  validateObjectId(organizationId, "organization ID");

  const asset = await getAssetById(assetId, organizationId, reader);
  if (!asset) {
    throw new Error("Asset not found");
  }

  return assetMaintenanceRepository.findByAssetAndOrganization(
    assetId,
    organizationId
  );
};

export const getLifecycleHistory = async (
  assetId: string,
  organizationId: string,
  reader: AssetReadContext
) => {
  validateObjectId(assetId, "asset ID");
  validateObjectId(organizationId, "organization ID");

  const asset = await getAssetById(assetId, organizationId, reader);
  if (!asset) {
    throw new Error("Asset not found");
  }

  return assetLifecycleRepository.findByAssetAndOrganization(
    assetId,
    organizationId
  );
};
