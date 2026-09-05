import AssetMaintenance, {
  IAssetMaintenance,
} from "./assetMaintenance.model";

export const assetMaintenanceRepository = {
  create: async (
    data: Partial<IAssetMaintenance>
  ): Promise<IAssetMaintenance> => AssetMaintenance.create(data),

  findByAssetAndOrganization: async (
    assetId: string,
    organizationId: string
  ): Promise<IAssetMaintenance[]> =>
    AssetMaintenance.find({ assetId, organizationId }).sort({
      date: -1,
      createdAt: -1,
    }),

  findByOrganization: async (
    organizationId: string
  ): Promise<IAssetMaintenance[]> =>
    AssetMaintenance.find({ organizationId }).sort({
      date: -1,
      createdAt: -1,
    }),
};
