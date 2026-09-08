import { IDepartment } from "./department.model";
import { departmentRepository } from "./department.repository";

interface CreateDepartmentData {
  name: string;
  description?: string;
  organizationId: string;
}

const departmentUpdateFields = new Set(["name", "description", "isActive"]);

const sanitizeDepartmentUpdate = (data: unknown) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Department update must be an object");
  }

  const update: Partial<{ name: string; description: string; isActive: boolean }> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith("$") || key.includes(".") || !departmentUpdateFields.has(key)) {
      throw new Error(`Unsupported department field: ${key}`);
    }
    if (key === "name" || key === "description") {
      if (typeof value !== "string") throw new Error(`${key} must be a string`);
      update[key] = value;
    } else {
      if (typeof value !== "boolean") throw new Error("isActive must be a boolean");
      update.isActive = value;
    }
  }
  return update;
};

// ==========================================
// CREATE DEPARTMENT
// ==========================================

export const createDepartment = async (
  data: CreateDepartmentData
): Promise<IDepartment> => {
  const existingDepartment = await departmentRepository.findOne({
    name: data.name,
    organizationId: data.organizationId,
  });

  if (existingDepartment) {
    throw new Error(
      "A department with this name already exists in this organization"
    );
  }

  return departmentRepository.create({
    name: data.name,
    description: data.description,
    organizationId: data.organizationId,
  });
};

// ==========================================
// GET ALL DEPARTMENTS
// ==========================================

export const getDepartments = async (
  organizationId: string
): Promise<IDepartment[]> => {
  return departmentRepository.findAllByOrganization(
    organizationId
  );
};

// ==========================================
// GET DEPARTMENT BY ID
// ==========================================

export const getDepartmentById = async (
  id: string,
  organizationId: string
): Promise<IDepartment | null> => {
  return departmentRepository.findByIdAndOrganization(
    id,
    organizationId
  );
};

// ==========================================
// UPDATE DEPARTMENT
// ==========================================

export const updateDepartment = async (
  id: string,
  organizationId: string,
  data: Partial<{
    name: string;
    description: string;
    isActive: boolean;
  }>
): Promise<IDepartment | null> => {
  return departmentRepository.updateByIdAndOrganization(
    id,
    organizationId,
    sanitizeDepartmentUpdate(data)
  );
};

// ==========================================
// DELETE DEPARTMENT
// ==========================================

export const deleteDepartment = async (
  id: string,
  organizationId: string
): Promise<IDepartment | null> => {
  return departmentRepository.deleteByIdAndOrganization(
    id,
    organizationId
  );
};
