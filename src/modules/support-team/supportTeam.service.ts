import mongoose from "mongoose";

import {
  ISupportTeam,
} from "./supportTeam.model";

import {
  supportTeamRepository,
} from "./supportTeam.repository";
import { authRepository } from "../auth/auth.repository";

interface CreateSupportTeamData {
  name: string;
  description?: string;
  organizationId: string;
  members?: string[];
}

const validateMembers = async (
  memberIds: string[],
  organizationId: string
): Promise<mongoose.Types.ObjectId[]> => {
  const uniqueIds = [...new Set(memberIds)];

  if (uniqueIds.some((memberId) => !mongoose.Types.ObjectId.isValid(memberId))) {
    throw new Error("One or more support team members have an invalid ID");
  }

  const members = await authRepository.findActiveAdminsByOrganization(
    organizationId
  );
  const activeMemberIds = new Set(
    members.map((member) => member._id.toString())
  );

  if (uniqueIds.some((memberId) => !activeMemberIds.has(memberId))) {
    throw new Error(
      "Support team members must be active admins in this organization"
    );
  }

  return uniqueIds.map((memberId) => new mongoose.Types.ObjectId(memberId));
};

// ==========================================
// CREATE SUPPORT TEAM
// ==========================================

export const createSupportTeam = async (
  data: CreateSupportTeamData
): Promise<ISupportTeam> => {
  if (!mongoose.Types.ObjectId.isValid(data.organizationId)) {
    throw new Error("Invalid organization ID");
  }

  const organizationId = new mongoose.Types.ObjectId(
    data.organizationId
  );

  const members = await validateMembers(
    data.members || [],
    data.organizationId
  );

  const existingTeam =
    await supportTeamRepository.findOne({
      name: data.name,
      organizationId,
    });

  if (existingTeam) {
    throw new Error(
      "A support team with this name already exists in this organization"
    );
  }

  return supportTeamRepository.create({
    name: data.name,
    description: data.description,
    organizationId,
    members,
  });
};

// ==========================================
// GET ALL SUPPORT TEAMS
// ==========================================

export const getSupportTeams = async (
  organizationId: string
): Promise<ISupportTeam[]> => {
  return supportTeamRepository.findAllByOrganization(
    organizationId
  );
};

// ==========================================
// GET SUPPORT TEAM BY ID
// ==========================================

export const getSupportTeamById = async (
  id: string,
  organizationId: string
): Promise<ISupportTeam | null> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  if (!mongoose.Types.ObjectId.isValid(organizationId)) {
    return null;
  }

  return supportTeamRepository.findByIdAndOrganization(
    id,
    organizationId
  );
};

// ==========================================
// UPDATE SUPPORT TEAM
// ==========================================

export const updateSupportTeam = async (
  id: string,
  organizationId: string,
  data: Partial<{
    name: string;
    description: string;
    members: string[];
    isActive: boolean;
  }>
): Promise<ISupportTeam | null> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  if (!mongoose.Types.ObjectId.isValid(organizationId)) {
    return null;
  }

  const updateData: Partial<ISupportTeam> = {
    name: data.name,
    description: data.description,
    isActive: data.isActive,
  };

  if (data.members !== undefined) {
    updateData.members = await validateMembers(
      data.members,
      organizationId
    );
  }

  return supportTeamRepository.updateByIdAndOrganization(
    id,
    organizationId,
    updateData
  );
};

// ==========================================
// DELETE SUPPORT TEAM
// ==========================================

export const deleteSupportTeam = async (
  id: string,
  organizationId: string
): Promise<ISupportTeam | null> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  if (!mongoose.Types.ObjectId.isValid(organizationId)) {
    return null;
  }

  return supportTeamRepository.deleteByIdAndOrganization(
    id,
    organizationId
  );
};
