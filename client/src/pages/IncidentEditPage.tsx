import React from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, ArrowLeft } from 'lucide-react'

import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorState } from '@/components/ui/error-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useIncident, useUpdateIncident, downloadIncidentPdf } from '@/hooks/useIncidents'
import {
  incidentStatusOptions,
  incidentPriorityOptions,
  incidentSeverityOptions,
  updateIncidentSchema,
  type UpdateIncidentFormData,
} from '@/components/incidents/incident-form'
import { getUserId } from '@/types/incident'
import { userApi } from '@/lib/userApi'
import { useQuery } from '@tanstack/react-query'
import type { RootState } from '@/store/store'

export function IncidentEditPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const user = useSelector((s: RootState) => s.auth.user)
  const isAdmin = user?.role === 'admin'
  const currentUserId = user?.id

  const { data: incident, isLoading, isError, refetch } = useIncident(id!)
  const updateMutation = useUpdateIncident()

  // Fetch all users (admin-only) for the assignment dropdown
  const { data: allUsers = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => userApi.list(),
    enabled: isAdmin,
  })

  // Active employees only (admins cannot be assigned incidents)
  const employees = allUsers.filter((u) => u.role === 'employee' && u.isActive)

  // Current assignee ID from the incident
  const currentAssigneeId = incident ? getUserId(incident.assignedTo) : undefined

  // Determine if the current user can edit this incident
  const assignedUserId = incident ? getUserId(incident.assignedTo) : undefined
  const canEdit =
    isAdmin || (assignedUserId === currentUserId && ['In Progress', 'Resolved'].includes(incident?.status ?? ''))

  // Track whether the admin has explicitly changed the assignment field.
  // undefined  = keep current assignment (no change sent)
  // string     = assign/reassign to that user
  // null       = explicitly unassign
  const [explicitAssignment, setExplicitAssignment] = React.useState<UpdateIncidentFormData['assignedTo']>(undefined)

  const form = useForm<UpdateIncidentFormData>({
    resolver: zodResolver(updateIncidentSchema),
    values: incident
      ? {
          title: incident.title,
          description: incident.description,
          priority: incident.priority,
          severity: incident.severity,
          status: incident.status,
          resolution: incident.resolution ?? '',
          assignedTo: explicitAssignment,
        }
      : undefined,
  })

  const handleSubmit = async (data: UpdateIncidentFormData) => {
    if (!id) return
    try {
      const payload = {
        title: data.title,
        description: data.description,
        priority: data.priority,
        severity: data.severity,
        status: data.status,
        resolution: data.resolution || undefined,
        // undefined = keep current (no change to assignment field)
        // null      = explicitly unassign
        // string    = assign/reassign to that user
        assignedTo: explicitAssignment,
      }
      await updateMutation.mutateAsync({ id, payload })
      navigate(`/incidents/${id}`)
    } catch {
      // Error handled by hook
    }
  }

  const handleExportPdf = async () => {
    if (!incident) return
    await downloadIncidentPdf(incident._id, incident.incidentId)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner label="Loading incident…" />
      </div>
    )
  }

  if (isError || !incident) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/incidents">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Incidents
            </Link>
          </Button>
        </div>
        <ErrorState
          title="Incident not found"
          description="The incident may have been deleted."
          onRetry={refetch}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Edit — ${incident.incidentId}`}
        description={incident.title}
        icon={AlertTriangle}
        breadcrumbs={[
          { label: 'Incidents', href: '/incidents' },
          { label: incident.incidentId, href: `/incidents/${incident._id}` },
          { label: 'Edit' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportPdf}>
              Export PDF
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/incidents/${incident._id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Details
              </Link>
            </Button>
          </div>
        }
      />

      {/* Permission notice for employees */}
      {!canEdit && !isAdmin && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950 p-4 text-sm text-amber-800 dark:text-amber-200">
          <p className="font-medium">Editing restrictions apply</p>
          <p className="mt-1">
            As an employee, you can only update the status (In Progress / Resolved) and resolution
            for incidents that are assigned to you.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Incident Details</CardTitle>
          <CardDescription>
            {isAdmin
              ? 'Admin: you can update all fields and reassign the incident.'
              : 'Update the incident status and resolution.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form form={form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {/* Title — admin only */}
              {isAdmin ? (
                <FormItem>
                  <FormLabel required>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Incident title"
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
                      placeholder="Describe the incident"
                      rows={4}
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
                        value={form.watch('priority')}
                        onValueChange={(v) => form.setValue('priority', v as UpdateIncidentFormData['priority'], { shouldValidate: true })}
                      >
                        <SelectTrigger>
                          <SelectValue />
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
                        value={form.watch('severity')}
                        onValueChange={(v) => form.setValue('severity', v as UpdateIncidentFormData['severity'], { shouldValidate: true })}
                      >
                        <SelectTrigger>
                          <SelectValue />
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
                      // Show current assignee's name when no explicit change has been made;
                      // show the explicit value once the admin has interacted with the field.
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
                    Admins can assign, reassign, or unassign incidents. Use "Keep" to leave the current assignment unchanged.
                  </p>
                </FormItem>
              )}

              {/* Status — both admin and employee (employee limited) */}
              <FormItem>
                <FormLabel required>Status</FormLabel>
                <FormControl>
                  <Select
                    value={form.watch('status')}
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

              <div className="flex items-center gap-2 pt-2">
                <Button type="submit" disabled={updateMutation.isPending || !canEdit}>
                  {updateMutation.isPending && <LoadingSpinner size={16} className="mr-2" />}
                  Save Changes
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  asChild
                  disabled={updateMutation.isPending}
                >
                  <Link to={`/incidents/${incident._id}`}>Cancel</Link>
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
