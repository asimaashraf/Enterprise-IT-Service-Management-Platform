import { z } from 'zod'
import type { Incident } from '@/types/incident'

export const incidentPriorityOptions = [
  { label: 'Low', value: 'Low' },
  { label: 'Medium', value: 'Medium' },
  { label: 'High', value: 'High' },
  { label: 'Critical', value: 'Critical' },
] as const

export const incidentSeverityOptions = [
  { label: 'Minor', value: 'Minor' },
  { label: 'Major', value: 'Major' },
  { label: 'Critical', value: 'Critical' },
] as const

export const incidentStatusOptions = [
  { label: 'Open', value: 'Open' },
  { label: 'In Progress', value: 'In Progress' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Resolved', value: 'Resolved' },
  { label: 'Closed', value: 'Closed' },
] as const

// Create form schema
export const createIncidentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z.string().min(1, 'Description is required').max(4000, 'Description must be 4000 characters or less'),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  severity: z.enum(['Minor', 'Major', 'Critical']).optional(),
})

export type CreateIncidentFormData = z.infer<typeof createIncidentSchema>

// Update form schema (admin can update everything, including assignedTo)
export const updateIncidentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z.string().min(1, 'Description is required').max(4000, 'Description must be 4000 characters or less'),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
  severity: z.enum(['Minor', 'Major', 'Critical']),
  status: z.enum(['Open', 'In Progress', 'Pending', 'Resolved', 'Closed']),
  resolution: z.string().max(4000, 'Resolution must be 4000 characters or less').optional(),
  // Admin-only: employee user ID string, null to unassign
  assignedTo: z.string().nullable().optional(),
})

export type UpdateIncidentFormData = z.infer<typeof updateIncidentSchema>

// Default values
export const defaultCreateValues: CreateIncidentFormData = {
  title: '',
  description: '',
  priority: undefined,
  severity: undefined,
}

// Map incident to form defaults
export function incidentToFormData(incident: Incident): UpdateIncidentFormData {
  return {
    title: incident.title,
    description: incident.description,
    priority: incident.priority,
    severity: incident.severity,
    status: incident.status,
    resolution: incident.resolution ?? '',
    assignedTo: null,
  }
}
