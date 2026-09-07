import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { eligibleOperationalAssigneeKey } from '@/hooks/useEligibleOperationalAssignees'
import { supportTeamApi } from '@/lib/supportTeamApi'
import type {
  CreateSupportTeamPayload,
  UpdateSupportTeamPayload,
} from '@/types/supportTeam'

export const supportTeamsKey = ['support-teams'] as const

function useInvalidateSupportTeamQueries() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: supportTeamsKey })
    queryClient.invalidateQueries({ queryKey: eligibleOperationalAssigneeKey })
  }
}

export function useSupportTeams() {
  return useQuery({
    queryKey: supportTeamsKey,
    queryFn: () => supportTeamApi.list(),
  })
}

export function useCreateSupportTeam(onSuccess?: () => void) {
  const invalidate = useInvalidateSupportTeamQueries()
  return useMutation({
    mutationFn: (payload: CreateSupportTeamPayload) => supportTeamApi.create(payload),
    onSuccess: () => {
      toast.success('Support team created')
      invalidate()
      onSuccess?.()
    },
    onError: (error: Error) => toast.error(error.message || 'Unable to create support team'),
  })
}

export function useUpdateSupportTeam(onSuccess?: () => void) {
  const invalidate = useInvalidateSupportTeamQueries()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSupportTeamPayload }) =>
      supportTeamApi.update(id, payload),
    onSuccess: () => {
      toast.success('Support team updated')
      invalidate()
      onSuccess?.()
    },
    onError: (error: Error) => toast.error(error.message || 'Unable to update support team'),
  })
}

export function useDeleteSupportTeam(onSuccess?: () => void) {
  const invalidate = useInvalidateSupportTeamQueries()
  return useMutation({
    mutationFn: (id: string) => supportTeamApi.remove(id),
    onSuccess: () => {
      toast.success('Support team deleted')
      invalidate()
      onSuccess?.()
    },
    onError: (error: Error) => toast.error(error.message || 'Unable to delete support team'),
  })
}
