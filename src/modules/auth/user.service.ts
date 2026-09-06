import bcrypt from "bcrypt";
import mongoose from "mongoose";

import { authRepository } from "./auth.repository";

// ==========================================
// TYPES
// ==========================================

interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role?: "admin" | "employee";
  organizationId: string;
}

interface UpdateUserData {
  name?: string;
  email?: string;
  role?: "admin" | "employee";
  isActive?: boolean;
}

// ==========================================
// CREATE USER
//
// NOTE: This endpoint exists for parity with prior versions of the
// public API. New tenants should use the invitation flow
// (POST /api/v1/invitations) which is the secure, enterprise path.
// ==========================================

export const createUser = async (data: CreateUserData) => {
  if (!mongoose.Types.ObjectId.isValid(data.organizationId)) {
    throw new Error("Invalid organization ID");
  }
  const organizationObjectId = new mongoose.Types.ObjectId(
    data.organizationId
  );

  const email = data.email.toLowerCase().trim();

  const existingUser = await authRepository.findByEmail(email);
  if (existingUser) {
    throw new Error("A user with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  return authRepository.create({
    name: data.name,
    email,
    password: hashedPassword,
    role: data.role || "employee",
    organizationId: organizationObjectId,
  });
};

// ==========================================
// GET USERS BY ORGANIZATION
// ==========================================

export const getUsersByOrganization = async (organizationId: string) => {
  if (!mongoose.Types.ObjectId.isValid(organizationId)) {
    throw new Error("Invalid organization ID");
  }
  return authRepository.findAllByOrganization(organizationId);
};

// ==========================================
// GET USER BY ID
// ==========================================

export const getUserById = async (id: string, organizationId: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }
  if (!mongoose.Types.ObjectId.isValid(organizationId)) {
    throw new Error("Invalid organization ID");
  }
  return authRepository.findUserByIdAndOrganization(id, organizationId);
};

// ==========================================
// UPDATE USER
// ==========================================

export const updateUser = async (
  id: string,
  organizationId: string,
  data: UpdateUserData
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }
  if (!mongoose.Types.ObjectId.isValid(organizationId)) {
    throw new Error("Invalid organization ID");
  }

  const updateData: UpdateUserData = { ...data };

  if (updateData.email) {
    updateData.email = updateData.email.toLowerCase().trim();
    const existingUser = await authRepository.findByEmailExcludingId(
      updateData.email,
      id
    );
    if (existingUser) {
      throw new Error("A user with this email already exists");
    }
  }

  return authRepository.updateByIdAndOrganization(id, organizationId, updateData);
};

// ==========================================
// DEACTIVATE USER
// Includes safety check against the last active admin.
// ==========================================

export const deactivateUser = async (
  id: string,
  organizationId: string
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }
  if (!mongoose.Types.ObjectId.isValid(organizationId)) {
    throw new Error("Invalid organization ID");
  }

  const target = await authRepository.findUserByIdAndOrganization(
    id,
    organizationId
  );
  if (!target) {
    return null;
  }
  if (target.isActive === false) {
    // Already inactive — return current state.
    return target;
  }
  if (target.role === "admin") {
    const activeAdminCount =
      await authRepository.countActiveAdminsByOrganization(organizationId);
    if (activeAdminCount <= 1) {
      throw new Error(
        "Cannot deactivate the last active administrator in the organization"
      );
    }
  }

  return authRepository.deactivateByIdAndOrganization(id, organizationId);
};

// ==========================================
// ACTIVATE USER
// ==========================================

export const activateUser = async (
  id: string,
  organizationId: string
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }
  if (!mongoose.Types.ObjectId.isValid(organizationId)) {
    throw new Error("Invalid organization ID");
  }
  return authRepository.activateByIdAndOrganization(id, organizationId);
};

// ==========================================
// BLOCK USER (soft-delete)
//
// Blocked users are marked inactive and a tombstone marker is appended
// to the email so the same address cannot be re-registered. This
// preserves all historical ITSM data (incidents, requests, approvals,
// audit, RCA) tied to the original email.
//
// Safety: cannot block the last active admin.
// ==========================================

export const blockUser = async (
  id: string,
  organizationId: string
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }
  if (!mongoose.Types.ObjectId.isValid(organizationId)) {
    throw new Error("Invalid organization ID");
  }

  const target = await authRepository.findUserByIdAndOrganization(
    id,
    organizationId
  );
  if (!target) {
    return null;
  }
  if (target.role === "admin") {
    const activeAdminCount =
      await authRepository.countActiveAdminsByOrganization(organizationId);
    if (activeAdminCount <= 1) {
      throw new Error(
        "Cannot block the last active administrator in the organization"
      );
    }
  }

  // Soft-delete: keep the email in the document but append a tombstone
  // marker so the same address cannot be reused for a new account.
  // The display name is preserved for audit.
  const tombstones = "@removed.invalid";
  if (!target.email.endsWith(tombstones)) {
    const tombstonedEmail = `${target.email}${tombstones}`;
    // Lowercase/trim preserved by schema; ensure uniqueness by
    // short-circuiting on duplicate-key errors.
    return authRepository.updateByIdAndOrganization(
      id,
      organizationId,
      {
        isActive: false,
        email: tombstonedEmail,
      }
    );
  }

  return authRepository.blockByIdAndOrganization(id, organizationId);
};

// ==========================================
// CHANGE USER ROLE
// Safety: cannot demote the last active admin.
// ==========================================

export const changeUserRole = async (
  id: string,
  organizationId: string,
  newRole: "admin" | "employee"
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }
  if (!mongoose.Types.ObjectId.isValid(organizationId)) {
    throw new Error("Invalid organization ID");
  }
  if (newRole !== "admin" && newRole !== "employee") {
    throw new Error("Invalid role");
  }

  const target = await authRepository.findUserByIdAndOrganization(
    id,
    organizationId
  );
  if (!target) {
    return null;
  }
  if (target.role === newRole) {
    return target;
  }
  // Prevent demoting the last active admin.
  if (target.role === "admin" && newRole === "employee") {
    const activeAdminCount =
      await authRepository.countActiveAdminsByOrganization(organizationId);
    if (activeAdminCount <= 1) {
      throw new Error(
        "Cannot demote the last active administrator in the organization"
      );
    }
  }

  return authRepository.updateRoleByIdAndOrganization(
    id,
    organizationId,
    newRole
  );
};
