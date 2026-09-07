import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { escalationApi } from '@/lib/escalationApi'
import type { CreateEscalationPolicyPayload, IncidentPriority, UpdateEscalationPolicyPayload } from '@/types/incident'

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
export function useApplicableEscalationPolicies(
  priority: IncidentPriority,
  enabled = true,
) {
  return useQuery({
    queryKey: escalationKeys.applicable(priority),
    queryFn: () => escalationApi.getApplicable(priority),
    enabled: Boolean(priority) && enabled,
  })
}

function useEscalationMutation<T>(
  mutationFn: (payload: T) => Promise<unknown>,
  successMessage: string,
  onSuccess?: () => void,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: escalationKeys.all })
      toast.success(successMessage)
      onSuccess?.()
    },
    onError: (error: Error) => toast.error('Escalation policy action failed', { description: error.message }),
  })
}

export function useCreateEscalationPolicy(onSuccess?: () => void) {
  return useEscalationMutation(
    (payload: CreateEscalationPolicyPayload) => escalationApi.create(payload),
    'Escalation policy created',
    onSuccess,
  )
}

export function useUpdateEscalationPolicy(onSuccess?: () => void) {
  return useEscalationMutation(
    ({ id, payload }: { id: string; payload: UpdateEscalationPolicyPayload }) => escalationApi.update(id, payload),
    'Escalation policy updated',
    onSuccess,
  )
}

export function useDeleteEscalationPolicy(onSuccess?: () => void) {
  return useEscalationMutation(
    (id: string) => escalationApi.remove(id),
    'Escalation policy deleted',
    onSuccess,
  )
}
