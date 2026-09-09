import SupportTeam, {
  ISupportTeam,
} from "./supportTeam.model";

export const supportTeamRepository = {
  findOne: async (
    filter: Record<string, any>
  ): Promise<ISupportTeam | null> => {
    return SupportTeam.findOne(filter);
  },

  create: async (
    data: Partial<ISupportTeam>
  ): Promise<ISupportTeam> => {
    return SupportTeam.create(data);
  },

  findAllByOrganization: async (
    organizationId: string
  ): Promise<ISupportTeam[]> => {
    return SupportTeam.find({
      organizationId,
    }).sort({
      createdAt: -1,
    });
  },

  findByIdAndOrganization: async (
    id: string,
    organizationId: string
  ): Promise<ISupportTeam | null> => {
    return SupportTeam.findOne({
      _id: id,
      organizationId,
    });
  },

  updateByIdAndOrganization: async (
    id: string,
    organizationId: string,
    data: Partial<ISupportTeam>
  ): Promise<ISupportTeam | null> => {
    return SupportTeam.findOneAndUpdate(
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
  ): Promise<ISupportTeam | null> => {
    return SupportTeam.findOneAndDelete({
      _id: id,
      organizationId,
    });
  },
};