import { useQuery } from '@tanstack/react-query'

import { userApi } from '@/lib/userApi'
import { directoryKeys } from '@/hooks/useUsers'
import { useSettingsScope, settingsQueryOptions } from '@/hooks/useSettingsScope'

export function useEligibleOperationalAssignees(enabled: boolean) {
  const scope = useSettingsScope()
  return useQuery({
    ...settingsQueryOptions,
    queryKey: directoryKeys.assignees(scope.key),
    queryFn: ({ signal }) => userApi.eligibleAssignees(signal),
    enabled: scope.isAdmin && enabled,
  })
}
