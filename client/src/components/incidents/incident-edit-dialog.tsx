import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
  incidentStatusOptions,
  incidentPriorityOptions,
  incidentSeverityOptions,
  updateIncidentSchema,
  type UpdateIncidentFormData,
} from '@/components/incidents/incident-form'
import { getUserId } from '@/types/incident'
import { userApi } from '@/lib/userApi'
import type { RootState } from '@/store/store'

interface IncidentEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  incident: { _id: string; title: string; description: string; priority: string; severity: string; status: string; resolution?: string; assignedTo?: unknown } | null
  onSubmit: (data: UpdateIncidentFormData) => Promise<void>
  isLoading?: boolean
}

export function IncidentEditDialog({
  open,
  onOpenChange,
  incident,
  onSubmit,
  isLoading = false,
}: IncidentEditDialogProps) {
  const user = useSelector((s: RootState) => s.auth.user)
  const isAdmin = user?.role === 'admin'
  const currentUserId = user?.id

  // Current assignee ID from the incident
  const currentAssigneeId = incident ? getUserId(incident.assignedTo as Parameters<typeof getUserId>[0]) : undefined

  // Determine if the current user can edit this incident
  const assignedUserId = incident ? getUserId(incident.assignedTo as Parameters<typeof getUserId>[0]) : undefined
  const canEdit =
    isAdmin || (assignedUserId === currentUserId && ['In Progress', 'Resolved'].includes(incident?.status ?? ''))

  // Track whether the admin has explicitly changed the assignment field
  const [explicitAssignment, setExplicitAssignment] = useState<UpdateIncidentFormData['assignedTo']>(undefined)

  // Fetch all users (admin-only) for the assignment dropdown
  const { data: allUsers = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => userApi.list(),
    enabled: isAdmin && open,
  })

  // Active employees only
  const employees = allUsers.filter((u) => u.role === 'employee' && u.isActive)

  const form = useForm<UpdateIncidentFormData>({
    resolver: zodResolver(updateIncidentSchema),
    defaultValues: {
      title: incident?.title ?? '',
      description: incident?.description ?? '',
      priority: incident?.priority as UpdateIncidentFormData['priority'],
      severity: incident?.severity as UpdateIncidentFormData['severity'],
      status: incident?.status as UpdateIncidentFormData['status'],
      resolution: incident?.resolution ?? '',
    },
  })

  // Reset form when dialog opens/closes or incident changes
  useEffect(() => {
    if (open && incident) {
      setExplicitAssignment(undefined)
      form.reset({
        title: incident.title,
        description: incident.description,
        priority: incident.priority as UpdateIncidentFormData['priority'],
        severity: incident.severity as UpdateIncidentFormData['severity'],
        status: incident.status as UpdateIncidentFormData['status'],
        resolution: incident.resolution ?? '',
      })
    }
  }, [open, incident, form])

  const handleSubmit = async (data: UpdateIncidentFormData) => {
    const payload: UpdateIncidentFormData = {
      ...data,
      assignedTo: explicitAssignment,
    }
    await onSubmit(payload)
    onOpenChange(false)
  }

  if (!incident) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Edit Incident
          </DialogTitle>
          <DialogDescription>
            Update the incident details below.
          </DialogDescription>
        </DialogHeader>

        {/* Permission notice for employees */}
        {!canEdit && !isAdmin && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950 p-3 text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium">Editing restrictions apply</p>
            <p className="mt-1 text-xs">
              As an employee, you can only update the status (In Progress / Resolved) and resolution
              for incidents that are assigned to you.
            </p>
          </div>
        )}

        <Form form={form} id="incident-edit-form" onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="space-y-4">
            {/* Title — admin only */}
            {isAdmin ? (
              <FormItem>
                <FormLabel required>Title</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Brief summary of the incident"
                    {...form.register('title')}
                    aria-invalid={!!form.formState.errors.title}
                  />
                </FormControl>
                {form.formState.errors.title && (
                  <FormMessage>{form.formState.errors.title.message}</FormMessage>
                )}
              </FormItem>
            ) : (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <p className="text-sm font-medium">{incident.title}</p>
              </FormItem>
            )}

            {/* Description — admin only */}
            {isAdmin ? (
              <FormItem>
                <FormLabel required>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe the incident in detail…"
                    rows={3}
                    {...form.register('description')}
                    aria-invalid={!!form.formState.errors.description}
                  />
                </FormControl>
                {form.formState.errors.description && (
                  <FormMessage>{form.formState.errors.description.message}</FormMessage>
                )}
              </FormItem>
            ) : (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <p className="text-sm whitespace-pre-wrap">{incident.description}</p>
              </FormItem>
            )}

            {/* Priority + Severity — admin only */}
            {isAdmin && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <FormControl>
                    <Select
                      value={form.watch('priority') ?? ''}
                      onValueChange={(v) => form.setValue('priority', v as UpdateIncidentFormData['priority'], { shouldValidate: true })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        {incidentPriorityOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>

                <FormItem>
                  <FormLabel>Severity</FormLabel>
                  <FormControl>
                    <Select
                      value={form.watch('severity') ?? ''}
                      onValueChange={(v) => form.setValue('severity', v as UpdateIncidentFormData['severity'], { shouldValidate: true })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                      <SelectContent>
                        {incidentSeverityOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </div>
            )}

            {/* Assigned To — admin only */}
            {isAdmin && (
              <FormItem>
                <FormLabel>Assigned To</FormLabel>
                <FormControl>
                  <Select
                    value={
                      explicitAssignment === undefined
                        ? currentAssigneeId ?? '__keep__'
                        : explicitAssignment ?? '__unassigned__'
                    }
                    onValueChange={(v) => {
                      const next: UpdateIncidentFormData['assignedTo'] =
                        v === '__keep__'
                          ? undefined
                          : v === '__unassigned__'
                            ? null
                            : v
                      setExplicitAssignment(next)
                      form.setValue('assignedTo', next, { shouldValidate: true })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          explicitAssignment === undefined && currentAssigneeId
                            ? undefined
                            : 'Select an employee…'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__keep__">
                        {currentAssigneeId
                          ? `Keep: ${allUsers.find((u) => u.id === currentAssigneeId)?.name ?? currentAssigneeId}`
                          : 'Keep Current Assignment'}
                      </SelectItem>
                      <SelectItem value="__unassigned__">Unassigned</SelectItem>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          <span>
                            {emp.name}{' '}
                            <span className="text-muted-foreground">({emp.email})</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Admins can assign, reassign, or unassign incidents.
                </p>
              </FormItem>
            )}

            {/* Status — both admin and employee (employee limited) */}
            <FormItem>
              <FormLabel required>Status</FormLabel>
              <FormControl>
                <Select
                  value={form.watch('status') ?? ''}
                  onValueChange={(v) => form.setValue('status', v as UpdateIncidentFormData['status'], { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {incidentStatusOptions
                      .filter((opt) => {
                        if (!isAdmin && !canEdit) return false
                        if (!isAdmin) {
                          return opt.value === 'In Progress' || opt.value === 'Resolved'
                        }
                        return true
                      })
                      .map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </FormControl>
              {form.formState.errors.status && (
                <FormMessage>{form.formState.errors.status.message}</FormMessage>
              )}
              {!isAdmin && (
                <p className="text-xs text-muted-foreground">
                  Employees can only set status to In Progress or Resolved.
                </p>
              )}
            </FormItem>

            {/* Resolution — both */}
            <FormItem>
              <FormLabel>
                Resolution
                {form.watch('status') === 'Resolved' && (
                  <span className="text-destructive ml-1">*</span>
                )}
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe how the incident was resolved…"
                  rows={3}
                  {...form.register('resolution')}
                  aria-invalid={!!form.formState.errors.resolution}
                />
              </FormControl>
              {form.formState.errors.resolution && (
                <FormMessage>{form.formState.errors.resolution.message}</FormMessage>
              )}
              {form.watch('status') === 'Resolved' && !form.watch('resolution') && (
                <p className="text-xs text-muted-foreground">
                  Resolution text is required when marking an incident as Resolved.
                </p>
              )}
            </FormItem>
          </div>
        </Form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="incident-edit-form"
            disabled={isLoading || !canEdit}
          >
            {isLoading && <LoadingSpinner size={16} className="mr-2" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
