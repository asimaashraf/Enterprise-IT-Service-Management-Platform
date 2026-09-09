import mongoose from "mongoose";
import ServiceCatalog from "./serviceCatalog.model";

// ==========================================
// SERVICE CATALOG REPOSITORY
// ==========================================

// CREATE
export const create = async (data: {
  name: string;
  description: string;
  category?: string;
  organizationId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  isActive: boolean;
}) => {
  return ServiceCatalog.create(data);
};

// FIND ALL BY ORGANIZATION
export const findAllByOrganization = async (
  organizationId: string
) => {
  return ServiceCatalog.find({
    organizationId: new mongoose.Types.ObjectId(
      organizationId
    ),
  })
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 });
};

// FIND BY ID AND ORGANIZATION
export const findByIdAndOrganization = async (
  id: string,
  organizationId: string
) => {
  return ServiceCatalog.findOne({
    _id: id,
    organizationId: new mongoose.Types.ObjectId(
      organizationId
    ),
  }).populate("createdBy", "name email");
};

// UPDATE BY ID AND ORGANIZATION
export const updateByIdAndOrganization = async (
  id: string,
  organizationId: string,
  updateData: {
    name?: string;
    description?: string;
    category?: string;
    isActive?: boolean;
  }
) => {
  return ServiceCatalog.findOneAndUpdate(
    {
      _id: id,
      organizationId: new mongoose.Types.ObjectId(
        organizationId
      ),
    },
    updateData,
    {
      new: true,
      runValidators: true,
    }
  ).populate("createdBy", "name email");
};

// DELETE BY ID AND ORGANIZATION
export const deleteByIdAndOrganization = async (
  id: string,
  organizationId: string
) => {
  return ServiceCatalog.findOneAndDelete({
    _id: id,
    organizationId: new mongoose.Types.ObjectId(
      organizationId
    ),
  });
};

export const serviceCatalogRepository = {
  create,
  findAllByOrganization,
  findByIdAndOrganization,
  updateByIdAndOrganization,
  deleteByIdAndOrganization,
};
