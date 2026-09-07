import { useQuery } from '@tanstack/react-query'

import { userApi } from '@/lib/userApi'

export const eligibleOperationalAssigneeKey = ['users', 'eligible-assignees'] as const

export function useEligibleOperationalAssignees(enabled: boolean) {
  return useQuery({
    queryKey: eligibleOperationalAssigneeKey,
    queryFn: () => userApi.eligibleAssignees(),
    enabled,
  })
}
