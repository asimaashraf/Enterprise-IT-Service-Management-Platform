import {
  IOrganization,
} from "./organization.model";

import {
  organizationRepository,
} from "./organization.repository";

interface CreateOrganizationData {
  name: string;
  slug: string;
  description?: string;
}

const allowedUpdateFields = new Set(["name", "slug", "description"]);

const profileUpdate = (data: unknown): Partial<CreateOrganizationData> => {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Organization profile must be an object");
  }

  const update: Partial<CreateOrganizationData> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith("$") || key.includes(".") || !allowedUpdateFields.has(key)) {
      throw new Error(`Unsupported organization field: ${key}`);
    }
    if (key === "name" || key === "slug" || key === "description") {
      if (typeof value !== "string") throw new Error(`${key} must be a string`);
      update[key] = value as never;
    }
  }
  return update;
};

export const createOrganization = async (
  data: CreateOrganizationData
): Promise<IOrganization> => {
  const existingOrganization =
    await organizationRepository.findOne({
      $or: [
        { name: data.name },
        { slug: data.slug },
      ],
    });

  if (existingOrganization) {
    throw new Error(
      "An organization with this name or slug already exists"
    );
  }

  return organizationRepository.create({
    name: data.name,
    slug: data.slug,
    description: data.description,
  });
};

export const getOrganizations = async (): Promise<IOrganization[]> => {
  return organizationRepository.findAll();
};

export const getOrganizationById = async (
  id: string
): Promise<IOrganization | null> => {
  return organizationRepository.findById(id);
};

export const updateOrganization = async (
  id: string,
  data: Partial<CreateOrganizationData>
): Promise<IOrganization | null> => {
  return organizationRepository.updateById(id, profileUpdate(data));
};

export const deleteOrganization = async (
  id: string
): Promise<IOrganization | null> => {
  if (await organizationRepository.hasDependents(id)) {
    throw new Error(
      "Organization cannot be deleted while tenant-owned data exists"
    );
  }
  return organizationRepository.deleteById(id);
};
