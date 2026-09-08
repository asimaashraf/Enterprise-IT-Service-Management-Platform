import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { directoryKeys } from '@/hooks/useUsers'
import {
  useSettingsScope,
  settingsQueryOptions,
} from '@/hooks/useSettingsScope'
import { supportTeamApi } from '@/lib/supportTeamApi'
import { settingsError } from '@/lib/settingsApi'
import type {
  CreateSupportTeamPayload,
  UpdateSupportTeamPayload,
  SupportTeam,
} from '@/types/supportTeam'

export function useSupportTeams() {
  const scope = useSettingsScope()
  return useQuery({
    ...settingsQueryOptions,
    queryKey: directoryKeys.teams(scope.key),
    queryFn: ({ signal }) => supportTeamApi.list(signal),
    enabled: scope.isAdmin,
  })
}

function useSupportTeamMutation<T>(
  operation: (payload: T) => Promise<SupportTeam>,
  message: string,
  onSuccess?: () => void,
) {
  const scope = useSettingsScope()
  const client = useQueryClient()
  return useMutation({
    mutationKey: directoryKeys.teams(scope.key),
    mutationFn: (payload: T) => {
      scope.assertAdmin()
      return operation(payload)
    },
    onSuccess: async () => {
      if (!scope.isCurrent()) return
      await Promise.all([
        client.invalidateQueries({
          queryKey: directoryKeys.teams(scope.key),
          exact: true,
        }),
        client.invalidateQueries({
          queryKey: directoryKeys.assignees(scope.key),
          exact: true,
        }),
      ])
      if (!scope.isCurrent()) return
      toast.success(message)
      onSuccess?.()
    },
    onError: (error) => {
      if (scope.isCurrent()) toast.error(settingsError(error))
    },
  })
}

export function useCreateSupportTeam(onSuccess?: () => void) {
  return useSupportTeamMutation(
    (payload: CreateSupportTeamPayload) => supportTeamApi.create(payload),
    'Support team created',
    onSuccess,
  )
}
export function useUpdateSupportTeam(onSuccess?: () => void) {
  return useSupportTeamMutation(
    ({ id, payload }: { id: string; payload: UpdateSupportTeamPayload }) =>
      supportTeamApi.update(id, payload),
    'Support team updated',
    onSuccess,
  )
}
export function useDeleteSupportTeam(onSuccess?: () => void) {
  return useSupportTeamMutation(
    (id: string) => supportTeamApi.remove(id),
    'Support team deleted',
    onSuccess,
  )
}
