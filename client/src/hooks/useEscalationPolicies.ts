import { useQuery } from '@tanstack/react-query'

import { escalationApi } from '@/lib/escalationApi'
import type { IncidentPriority } from '@/types/incident'

// Query keys
export const escalationKeys = {
  all: ['escalation-policies'] as const,
  applicable: (priority: IncidentPriority) => ['escalation-policies', 'applicable', priority] as const,
}

/**
 * Fetch all escalation policies for the organization.
 */
export function useEscalationPolicies() {
  return useQuery({
    queryKey: escalationKeys.all,
    queryFn: () => escalationApi.list(),
  })
}

/**
 * Fetch escalation policies applicable to a specific priority.
 */
export function useApplicableEscalationPolicies(priority: IncidentPriority) {
  return useQuery({
    queryKey: escalationKeys.applicable(priority),
    queryFn: () => escalationApi.getApplicable(priority),
    enabled: Boolean(priority),
  })
}
