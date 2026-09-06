import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { toast } from 'sonner'

import { incidentApi } from '@/lib/incidentApi'
import type {
  CreateIncidentPayload,
  UpdateIncidentPayload,
  Incident,
  ApiEnvelope,
} from '@/types/incident'

// Query keys
export const incidentKeys = {
  all: ['incidents'] as const,
  detail: (id: string) => ['incidents', id] as const,
}

// ---- Queries ----

/**
 * Fetch all incidents for the current organization.
 */
export function useIncidents() {
  return useQuery({
    queryKey: incidentKeys.all,
    queryFn: () => incidentApi.list(),
  })
}

/**
 * Fetch a single incident by ID.
 */
export function useIncident(id: string) {
  return useQuery({
    queryKey: incidentKeys.detail(id),
    queryFn: () => incidentApi.get(id),
    enabled: Boolean(id),
  })
}

// ---- Mutations ----

/**
 * Create a new incident.
 */
export function useCreateIncident(options?: {
  onSuccess?: (data: Incident) => void
}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateIncidentPayload) => incidentApi.create(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.all })
      toast.success('Incident created', {
        description: `Incident ${data.incidentId} has been created.`,
      })
      options?.onSuccess?.(data)
    },
    onError: (rawError: unknown) => {
      // Prefer the backend's structured message; fall back to the Axios
      // status-line text so the user always sees something actionable.
      const backendMessage =
        rawError instanceof AxiosError
          ? ((rawError.response?.data as ApiEnvelope<unknown>)?.message as string | undefined)
          : undefined
      toast.error('Failed to create incident', {
        description: backendMessage ?? (rawError instanceof Error ? rawError.message : 'Request failed'),
      })
    },
  })
}

/**
 * Update an existing incident.
 */
export function useUpdateIncident(options?: {
  onSuccess?: (data: Incident) => void
}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateIncidentPayload }) =>
      incidentApi.update(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.all })
      queryClient.setQueryData(incidentKeys.detail(data._id), data)
      toast.success('Incident updated', {
        description: `Incident ${data.incidentId} has been updated.`,
      })
      options?.onSuccess?.(data)
    },
    onError: (error: Error) => {
      toast.error('Failed to update incident', {
        description: error.message,
      })
    },
  })
}

/**
 * Delete an incident (admin only).
 */
export function useDeleteIncident(options?: {
  onSuccess?: () => void
}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => incidentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.all })
      toast.success('Incident deleted')
      options?.onSuccess?.()
    },
    onError: (error: Error) => {
      toast.error('Failed to delete incident', {
        description: error.message,
      })
    },
  })
}

/**
 * Export incident as PDF.
 */
export function useExportIncidentPdf() {
  return useMutation({
    mutationFn: (id: string) => incidentApi.exportPdf(id),
    onSuccess: (_data, _id) => {
      // The caller handles the blob download
    },
    onError: (error: Error) => {
      toast.error('Failed to export PDF', {
        description: error.message,
      })
    },
  })
}

/**
 * Download an incident PDF, given its _id and incidentId for the filename.
 */
export async function downloadIncidentPdf(id: string, incidentId: string): Promise<void> {
  const blob = await incidentApi.exportPdf(id)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `incident-${incidentId}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
