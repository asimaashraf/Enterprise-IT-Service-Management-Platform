import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'

import { assetApi } from '@/lib/assetApi'
import { auditApi } from '@/lib/auditApi'
import type { RootState } from '@/store'
import type { CreateAssetPayload, UpdateAssetPayload } from '@/types/asset'

export const assetKeys = {
  all: (organizationId: string, userId: string) =>
    ['assets', organizationId, userId] as const,
  detail: (organizationId: string, userId: string, id: string) =>
    ['assets', organizationId, userId, id] as const,
  lifecycle: (organizationId: string, userId: string, id: string) =>
    ['assets', organizationId, userId, id, 'lifecycle'] as const,
  maintenance: (organizationId: string, userId: string, id: string) =>
    ['assets', organizationId, userId, id, 'maintenance'] as const,
  audit: (organizationId: string, userId: string, id: string) =>
    ['assets', organizationId, userId, id, 'audit'] as const,
}

function useAssetQueryScope() {
  const user = useSelector((state: RootState) => state.auth.user)
  return user
    ? { organizationId: user.organizationId, userId: user.id }
    : undefined
}

export function useAssets() {
  const scope = useAssetQueryScope()
  return useQuery({
    queryKey: scope
      ? assetKeys.all(scope.organizationId, scope.userId)
      : ['assets', 'unauthenticated'] as const,
    queryFn: assetApi.list,
    enabled: Boolean(scope),
  })
}

export function useAsset(id: string, enabled = true) {
  const scope = useAssetQueryScope()
  return useQuery({
    queryKey: scope
      ? assetKeys.detail(scope.organizationId, scope.userId, id)
      : ['assets', 'unauthenticated', id] as const,
    queryFn: () => assetApi.get(id),
    enabled: Boolean(scope && id) && enabled,
  })
}

export function useAssetLifecycleHistory(id: string, enabled = true) {
  const scope = useAssetQueryScope()
  return useQuery({
    queryKey: scope
      ? assetKeys.lifecycle(scope.organizationId, scope.userId, id)
      : ['assets', 'unauthenticated', id, 'lifecycle'] as const,
    queryFn: () => assetApi.lifecycleHistory(id),
    enabled: Boolean(scope && id) && enabled,
  })
}

export function useAssetMaintenanceHistory(id: string, enabled = true) {
  const scope = useAssetQueryScope()
  return useQuery({
    queryKey: scope
      ? assetKeys.maintenance(scope.organizationId, scope.userId, id)
      : ['assets', 'unauthenticated', id, 'maintenance'] as const,
    queryFn: () => assetApi.maintenanceHistory(id),
    enabled: Boolean(scope && id) && enabled,
  })
}

export function useAssetAudit(id: string, enabled = true) {
  const scope = useAssetQueryScope()
  return useQuery({
    queryKey: scope
      ? assetKeys.audit(scope.organizationId, scope.userId, id)
      : ['assets', 'unauthenticated', id, 'audit'] as const,
    queryFn: async () => {
      const records = await auditApi.list()
      return records.filter(
        (record) => record.resourceType === 'Asset' && record.resourceId === id,
      )
    },
    enabled: Boolean(scope && id) && enabled,
  })
}

function useAssetMutation<T>(
  mutationFn: (value: T) => Promise<{ _id: string; assetId: string }>,
  successMessage: (assetId: string) => string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (asset) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      toast.success(successMessage(asset.assetId))
    },
    onError: (error: Error) =>
      toast.error('Asset action failed', { description: error.message }),
  })
}

export function useCreateAsset() {
  return useAssetMutation(
    (payload: CreateAssetPayload) => assetApi.create(payload),
    (assetId) => `Asset ${assetId} created`,
  )
}

export function useUpdateAsset() {
  return useAssetMutation(
    ({ id, payload }: { id: string; payload: UpdateAssetPayload }) =>
      assetApi.update(id, payload),
    (assetId) => `Asset ${assetId} updated`,
  )
}

export function useAssignAsset() {
  return useAssetMutation(
    ({ id, employeeId }: { id: string; employeeId: string }) =>
      assetApi.assign(id, employeeId),
    (assetId) => `Asset ${assetId} assigned`,
  )
}

export function useUnassignAsset() {
  return useAssetMutation(
    (id: string) => assetApi.unassign(id),
    (assetId) => `Asset ${assetId} unassigned`,
  )
}
