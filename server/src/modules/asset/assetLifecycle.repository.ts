import AssetLifecycle, {
  IAssetLifecycle,
} from "./assetLifecycle.model";

export const assetLifecycleRepository = {
  create: async (
    data: Partial<IAssetLifecycle>
  ): Promise<IAssetLifecycle> => AssetLifecycle.create(data),

  findByAssetAndOrganization: async (
    assetId: string,
    organizationId: string
  ): Promise<IAssetLifecycle[]> =>
    AssetLifecycle.find({ assetId, organizationId }).sort({
      changedAt: -1,
    }),

  findByOrganization: async (
    organizationId: string
  ): Promise<IAssetLifecycle[]> =>
    AssetLifecycle.find({ organizationId }).sort({
      changedAt: -1,
    }),
};