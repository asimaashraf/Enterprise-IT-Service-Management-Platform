import AuthUser, { IAuthUser } from "./auth.model";

export const authRepository = {
  countUsers: async (): Promise<number> => {
    return AuthUser.countDocuments({});
  },

  // ==========================================
  // FIND ONE
  // ==========================================

  findOne: async (
    filter: Record<string, any>
  ): Promise<IAuthUser | null> => {
    return AuthUser.findOne(filter);
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
};