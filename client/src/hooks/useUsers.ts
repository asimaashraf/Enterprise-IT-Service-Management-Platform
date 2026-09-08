import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  useSettingsScope,
  settingsQueryOptions,
} from '@/hooks/useSettingsScope'
import { userApi, invitationApi } from '@/lib/userApi'
import type { UserListItem } from '@/types/auth'

// Share the existing session counter; all directory consumers use these keys.
export const directoryKeys = {
  users: (scope: readonly unknown[]) => [...scope, 'users', 'list'] as const,
  invitations: (scope: readonly unknown[]) =>
    [...scope, 'invitations', 'list'] as const,
  assignees: (scope: readonly unknown[]) =>
    [...scope, 'users', 'eligible-assignees'] as const,
  teams: (scope: readonly unknown[]) =>
    [...scope, 'support-teams', 'list'] as const,
}

export function useUsers(
  enabled = true,
  select?: (users: UserListItem[]) => UserListItem[],
) {
  const scope = useSettingsScope()
  return useQuery({
    ...settingsQueryOptions,
    queryKey: directoryKeys.users(scope.key),
    queryFn: ({ signal }) => userApi.list(signal),
    enabled: scope.isAdmin && enabled,
    select,
  })
}

export function useInvitations() {
  const scope = useSettingsScope()
  return useQuery({
    ...settingsQueryOptions,
    queryKey: directoryKeys.invitations(scope.key),
    queryFn: ({ signal }) => invitationApi.list(signal),
    enabled: scope.isAdmin,
  })
}

export function useInvalidateUsers() {
  const scope = useSettingsScope()
  const client = useQueryClient()
  return async () => {
    if (!scope.isCurrent()) return
    // Profile edits also refresh names/emails in operational candidate pickers.
    await Promise.all([
      client.invalidateQueries({
        queryKey: directoryKeys.users(scope.key),
        exact: true,
      }),
      client.invalidateQueries({
        queryKey: directoryKeys.assignees(scope.key),
        exact: true,
      }),
    ])
  }
}
