import Asset, { IAsset } from "./asset.model";

export const assetRepository = {
  // ==========================================
  // FIND ONE
  // ==========================================

  findOne: async (
    filter: Record<string, any>
  ): Promise<IAsset | null> => {
    return Asset.findOne(filter);
  },

  // ==========================================
  // CREATE
  // ==========================================

  create: async (
    data: Partial<IAsset>
  ): Promise<IAsset> => {
    return Asset.create(data);
  },

  // ==========================================
  // FIND ALL BY ORGANIZATION
  // ==========================================

  findAllByOrganization: async (
    organizationId: string
  ): Promise<IAsset[]> => {
    return Asset.find({
      organizationId,
    })
      .populate(
        "assignedTo",
        "name email role"
      )
      .sort({
        createdAt: -1,
      });
  },

  // ==========================================
  // FIND BY ORGANIZATION
  // Used by Analytics
  // ==========================================

  findByOrganization: async (
    organizationId: string
  ): Promise<IAsset[]> => {
    return Asset.find({
      organizationId,
    }).select("_id status warrantyEndDate");
  },

  // ==========================================
  // FIND MULTIPLE BY IDS + ORGANIZATION
  // Used for affected asset validation
  // ==========================================

  findByIdsAndOrganization: async (
    ids: string[],
    organizationId: string
  ): Promise<IAsset[]> => {
    return Asset.find({
      _id: {
        $in: ids,
      },
      organizationId,
    });
  },

  // ==========================================
  // FIND BY ID + ORGANIZATION
  // ==========================================

  findByIdAndOrganization: async (
    id: string,
    organizationId: string
  ): Promise<IAsset | null> => {
    return Asset.findOne({
      _id: id,
      organizationId,
    }).populate(
      "assignedTo",
      "name email role"
    );
  },

  // ==========================================
  // UPDATE BY ID + ORGANIZATION
  // ==========================================

  updateByIdAndOrganization: async (
    id: string,
    organizationId: string,
    data: Partial<IAsset>
  ): Promise<IAsset | null> => {
    return Asset.findOneAndUpdate(
      {
        _id: id,
        organizationId,
      },
      data,
      {
        returnDocument: "after",
        runValidators: true,
      }
    ).populate(
      "assignedTo",
      "name email role"
    );
  },

  // ==========================================
  // DELETE BY ID + ORGANIZATION
  // ==========================================

  deleteByIdAndOrganization: async (
    id: string,
    organizationId: string
  ): Promise<IAsset | null> => {
    return Asset.findOneAndDelete({
      _id: id,
      organizationId,
    });
  },

  // ==========================================
  // FIND BY ID
  // ==========================================

  findById: async (
    id: string
  ): Promise<IAsset | null> => {
    return Asset.findById(id).populate(
      "assignedTo",
      "name email role"
    );
  },

  // ==========================================
  // ASSIGN ASSET
  // ==========================================

  assign: async (
    id: string,
    employeeId: string
  ): Promise<IAsset | null> => {
    return Asset.findByIdAndUpdate(
      id,
      {
        assignedTo: employeeId,
        status: "Assigned",
      },
      {
        returnDocument: "after",
        runValidators: true,
      }
    ).populate(
      "assignedTo",
      "name email role"
    );
  },

  // ==========================================
  // UNASSIGN ASSET
  // ==========================================

  unassign: async (
    id: string
  ): Promise<IAsset | null> => {
    return Asset.findByIdAndUpdate(
      id,
      {
        $unset: {
          assignedTo: 1,
        },
        status: "Available",
      },
      {
        returnDocument: "after",
        runValidators: true,
      }
    ).populate(
      "assignedTo",
      "name email role"
    );
  },
};