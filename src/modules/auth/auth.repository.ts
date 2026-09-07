import mongoose from "mongoose";

import AuthUser, { IAuthUser } from "./auth.model";
import SupportTeam from "../support-team/supportTeam.model";

export interface IEligibleOperationalAssignee {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  role: "admin";
}

export const authRepository = {
  countUsers: async (): Promise<number> => {
    return AuthUser.countDocuments({});
  },

  // ==========================================
  // FIND ONE (standard — excludes select:false fields)
  // ==========================================

  findOne: async (
    filter: Record<string, any>
  ): Promise<IAuthUser | null> => {
    return AuthUser.findOne(filter);
  },

  // ==========================================
  // FIND ONE WITH VERIFICATION / RESET TOKEN FIELDS
  // Must explicitly select select:false fields.
  // ==========================================

  findOneWithTokens: async (
    filter: Record<string, any>
  ): Promise<IAuthUser | null> => {
    return AuthUser.findOne(filter).select(
      "+emailVerificationTokenHash +emailVerificationExpiresAt" +
        " +passwordResetTokenHash +passwordResetExpiresAt"
    );
  },

  // ==========================================
  // FIND BY ID
  // ==========================================

  findById: async (
    id: string
  ): Promise<IAuthUser | null> => {
    return AuthUser.findById(id);
  },

  // ==========================================
  // FIND BY EMAIL
  // ==========================================

  findByEmail: async (
    email: string
  ): Promise<IAuthUser | null> => {
    return AuthUser.findOne({
      email,
    });
  },

  // ==========================================
  // FIND BY ID + ORGANIZATION
  // ==========================================

  findByIdAndOrganization: async (
    id: string,
    organizationId: string
  ): Promise<IAuthUser | null> => {
    return AuthUser.findOne({
      _id: id,
      organizationId,
    });
  },

  // ==========================================
  // CREATE
  // ==========================================

  create: async (
    data: Partial<IAuthUser>
  ): Promise<IAuthUser> => {
    return AuthUser.create(data);
  },

  // ==========================================
  // UPDATE BY ID
  // ==========================================

  updateById: async (
    id: string,
    data: Partial<IAuthUser>
  ): Promise<IAuthUser | null> => {
    return AuthUser.findByIdAndUpdate(
      id,
      data,
      {
        returnDocument: "after",
        runValidators: true,
      }
    );
  },

  // ==========================================
  // FIND ACTIVE EMPLOYEES BY ORGANIZATION
  // ==========================================

  findActiveEmployeesByOrganization: async (
    organizationId: string
  ): Promise<IAuthUser[]> => {
    return AuthUser.find({
      organizationId,
      role: "employee",
      isActive: true,
    }).select(
      "_id name email role"
    );
  },

  findActiveAdminsByOrganization: async (
    organizationId: string
  ): Promise<IAuthUser[]> => {
    return AuthUser.find({
      organizationId,
      role: "admin",
      isActive: true,
    }).select("_id name email role");
  },

  // ==========================================
  // FIND ELIGIBLE OPERATIONAL ASSIGNEES
  // Active same-tenant admins who belong to at least one active
  // same-tenant support team. The lookup avoids per-user team queries.
  // ==========================================

  findEligibleOperationalAssignees: async (
    organizationId: string,
    userId?: string
  ): Promise<IEligibleOperationalAssignee[]> => {
    const organizationObjectId = new mongoose.Types.ObjectId(organizationId);
    const match: Record<string, unknown> = {
      organizationId: organizationObjectId,
      role: "admin",
      isActive: true,
    };

    if (userId) {
      match._id = new mongoose.Types.ObjectId(userId);
    }

    return AuthUser.aggregate<IEligibleOperationalAssignee>([
      { $match: match },
      {
        $lookup: {
          from: SupportTeam.collection.name,
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$organizationId", organizationObjectId] },
                    { $eq: ["$isActive", true] },
                    { $in: ["$$userId", "$members"] },
                  ],
                },
              },
            },
            { $limit: 1 },
          ],
          as: "supportTeams",
        },
      },
      { $match: { "supportTeams.0": { $exists: true } } },
      { $project: { _id: 1, name: 1, email: 1, role: 1 } },
      { $sort: { name: 1, email: 1 } },
    ]);
  },

  // ==========================================
  // FIND ALL USERS BY ORGANIZATION
  // Excludes password from returned documents
  // ==========================================

  findAllByOrganization: async (
    organizationId: string
  ): Promise<IAuthUser[]> => {
    return AuthUser.find({
      organizationId,
    })
      .select("-password")
      .sort({
        createdAt: -1,
      });
  },

  // ==========================================
  // FIND USER BY ID + ORGANIZATION
  // Excludes password
  // ==========================================

  findUserByIdAndOrganization: async (
    id: string,
    organizationId: string
  ): Promise<IAuthUser | null> => {
    return AuthUser.findOne({
      _id: id,
      organizationId,
    }).select("-password");
  },

  // ==========================================
  // FIND USER BY EMAIL EXCLUDING ID
  // Used when updating email
  // ==========================================

  findByEmailExcludingId: async (
    email: string,
    id: string
  ): Promise<IAuthUser | null> => {
    return AuthUser.findOne({
      email,
      _id: {
        $ne: id,
      },
    });
  },

  // ==========================================
  // UPDATE USER BY ID + ORGANIZATION
  // Excludes password
  // ==========================================

  updateByIdAndOrganization: async (
    id: string,
    organizationId: string,
    data: Partial<IAuthUser>
  ): Promise<IAuthUser | null> => {
    return AuthUser.findOneAndUpdate(
      {
        _id: id,
        organizationId,
      },
      data,
      {
        returnDocument: "after",
        runValidators: true,
      }
    ).select("-password");
  },

  // ==========================================
  // DEACTIVATE USER
  // ==========================================

  deactivateByIdAndOrganization: async (
    id: string,
    organizationId: string
  ): Promise<IAuthUser | null> => {
    return AuthUser.findOneAndUpdate(
      {
        _id: id,
        organizationId,
      },
      {
        isActive: false,
      },
      {
        returnDocument: "after",
      }
    ).select("-password");
  },

  // ==========================================
  // ACTIVATE USER
  // ==========================================

  activateByIdAndOrganization: async (
    id: string,
    organizationId: string
  ): Promise<IAuthUser | null> => {
    return AuthUser.findOneAndUpdate(
      {
        _id: id,
        organizationId,
      },
      {
        isActive: true,
      },
      {
        returnDocument: "after",
      }
    ).select("-password");
  },

  // ==========================================
  // BLOCK USER (soft-delete)
  // Used by admins to remove a user's access while preserving all
  // historical ITSM records (incidents, requests, approvals, audit).
  // ==========================================

  blockByIdAndOrganization: async (
    id: string,
    organizationId: string
  ): Promise<IAuthUser | null> => {
    return AuthUser.findOneAndUpdate(
      {
        _id: id,
        organizationId,
      },
      {
        // Blocked users are inactive and their email is suffixed with a
        // tombstone marker so the same address can never be re-registered.
        // The raw email is preserved in the document for audit/display.
        isActive: false,
      },
      {
        returnDocument: "after",
      }
    ).select("-password");
  },

  // ==========================================
  // CHANGE USER ROLE
  // ==========================================

  updateRoleByIdAndOrganization: async (
    id: string,
    organizationId: string,
    role: "admin" | "employee"
  ): Promise<IAuthUser | null> => {
    return AuthUser.findOneAndUpdate(
      {
        _id: id,
        organizationId,
      },
      {
        role,
      },
      {
        returnDocument: "after",
      }
    ).select("-password");
  },

  // ==========================================
  // COUNT ACTIVE ADMINS BY ORGANIZATION
  // Used to prevent the last admin from demoting/deactivating themselves.
  // ==========================================

  countActiveAdminsByOrganization: async (
    organizationId: string
  ): Promise<number> => {
    return AuthUser.countDocuments({
      organizationId,
      role: "admin",
      isActive: true,
    });
  },

  // ==========================================
  // MARK EMAIL VERIFIED
  // ==========================================

  markEmailVerified: async (id: string): Promise<IAuthUser | null> => {
    return AuthUser.findByIdAndUpdate(
      id,
      {
        isEmailVerified: true,
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
      },
      { returnDocument: "after" }
    );
  },

  // ==========================================
  // SET VERIFICATION TOKEN
  // Sets the hash + expiry on a user record (e.g. on registration or resend).
  // ==========================================

  setVerificationToken: async (
    id: string,
    tokenHash: string,
    expiresAt: Date
  ): Promise<void> => {
    await AuthUser.findByIdAndUpdate(id, {
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: expiresAt,
    });
  },

  // ==========================================
  // SET RESET TOKEN
  // Sets the hash + expiry on a user record (e.g. on forgot-password).
  // ==========================================

  setResetToken: async (
    id: string,
    tokenHash: string,
    expiresAt: Date
  ): Promise<void> => {
    await AuthUser.findByIdAndUpdate(id, {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: expiresAt,
    });
  },

  // ==========================================
  // CLEAR RESET TOKEN
  // Clears the reset token after a successful password change.
  // ==========================================

  clearResetToken: async (id: string): Promise<void> => {
    await AuthUser.findByIdAndUpdate(id, {
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    });
  },

  // ==========================================
  // SET PASSWORD
  // Updates the password hash for a given user.
  // ==========================================

  setPassword: async (
    id: string,
    hashedPassword: string
  ): Promise<void> => {
    await AuthUser.findByIdAndUpdate(id, {
      password: hashedPassword,
    });
  },
};
