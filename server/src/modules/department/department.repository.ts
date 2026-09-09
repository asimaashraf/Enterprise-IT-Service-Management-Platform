import mongoose from "mongoose";
import Department, { IDepartment } from "./department.model";

export const departmentRepository = {
  findOne: async (
    filter: Record<string, any>
  ): Promise<IDepartment | null> => {
    return Department.findOne(filter);
  },

  create: async (
    data: {
      name: string;
      description?: string;
      organizationId: string;
    }
  ): Promise<IDepartment> => {
    return Department.create({
      name: data.name,
      description: data.description,
      organizationId: new mongoose.Types.ObjectId(
        data.organizationId
      ),
    });
  },

  findAllByOrganization: async (
    organizationId: string
  ): Promise<IDepartment[]> => {
    return Department.find({
      organizationId,
    }).sort({ createdAt: -1 });
  },

  findByIdAndOrganization: async (
    id: string,
    organizationId: string
  ): Promise<IDepartment | null> => {
    return Department.findOne({
      _id: id,
      organizationId,
    });
  },

  updateByIdAndOrganization: async (
    id: string,
    organizationId: string,
    data: Partial<IDepartment>
  ): Promise<IDepartment | null> => {
    return Department.findOneAndUpdate(
      {
        _id: id,
        organizationId,
      },
      data,
      {
        returnDocument: "after",
        runValidators: true,
      }
    );
  },

  deleteByIdAndOrganization: async (
    id: string,
    organizationId: string
  ): Promise<IDepartment | null> => {
    return Department.findOneAndDelete({
      _id: id,
      organizationId,
    });
  },
};
