import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  useSettingsScope,
  settingsQueryOptions,
} from '@/hooks/useSettingsScope'
import { organizationApi } from '@/lib/organizationApi'
import { settingsError } from '@/lib/settingsApi'
import type { UpdateOrganizationPayload } from '@/types/organization'

export function useOrganization() {
  const scope = useSettingsScope()
  return useQuery({
    ...settingsQueryOptions,
    queryKey: [...scope.key, 'organization'],
    enabled: scope.enabled,
    queryFn: async ({ signal }) => {
      const organization = await organizationApi.get(
        scope.user!.organizationId,
        signal,
      )
      if (organization && organization._id !== scope.user!.organizationId)
        throw new Error('Organization does not match the current session.')
      return organization
    },
  })
}

export function useUpdateOrganization(onSuccess?: () => void) {
  const scope = useSettingsScope()
  const client = useQueryClient()
  return useMutation({
    mutationKey: [...scope.key, 'organization'],
    mutationFn: (payload: UpdateOrganizationPayload) => {
      scope.assertAdmin()
      return organizationApi.update(scope.user!.organizationId, payload)
    },
    onSuccess: async () => {
      if (!scope.isCurrent()) return
      await client.invalidateQueries({
        queryKey: [...scope.key, 'organization'],
        exact: true,
      })
      if (!scope.isCurrent()) return
      toast.success('Organization profile updated')
      onSuccess?.()
    },
    onError: (error) => {
      if (scope.isCurrent()) toast.error(settingsError(error))
    },
  })
}
