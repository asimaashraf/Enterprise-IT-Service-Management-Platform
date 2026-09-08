import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  AlertTriangle,
  ArrowLeft,
  Pencil,
  Trash2,
  Download,
  User,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Users,
} from 'lucide-react'
import { format } from 'date-fns'

import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getUserDisplay,
  normalizeStatusVariant,
  normalizePriorityVariant,
  normalizeSeverityVariant,
} from '@/types/incident'
import { downloadIncidentPdf, useIncident, useDeleteIncident } from '@/hooks/useIncidents'
import { useApplicableEscalationPolicies } from '@/hooks/useEscalationPolicies'
import { IncidentSLACard } from '@/components/incidents/incident-sla-card'
import type { RootState } from '@/store/store'

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—'
  try {
    return format(new Date(dateStr), 'MMM d, yyyy HH:mm')
  } catch {
    return '—'
  }
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium break-words">{value ?? '—'}</p>
      </div>
    </div>
  )
}

export function IncidentDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const user = useSelector((s: RootState) => s.auth.user)
  const isAdmin = user?.role === 'admin'

  const { data: incident, isLoading, isError, refetch } = useIncident(id!)
  const deleteMutation = useDeleteIncident()

  // Escalation policies applicable to this incident's priority
  const { data: escalationPolicies = [] } = useApplicableEscalationPolicies(
    incident?.priority ?? 'Low',
    isAdmin,
  )

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(id!)
    navigate('/incidents')
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
          description="The incident may have been deleted or you may not have permission to view it."
          onRetry={refetch}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={incident.incidentId}
        description={incident.title}
        icon={AlertTriangle}
        breadcrumbs={[
          { label: 'Incidents', href: '/incidents' },
          { label: incident.incidentId },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportPdf}>
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/incidents/${incident._id}/edit`)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
            {isAdmin && (
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        }
      />

      {/* Compact scan line for the fields operators need first. */}
      <Card>
        <CardContent className="grid items-start gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {isAdmin && (
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
              <StatusBadge status={normalizeStatusVariant(incident.status)} className="text-sm px-3 py-1">
                {incident.status}
              </StatusBadge>
              {incident.closedAt && <p className="text-xs text-muted-foreground">Closed {formatDate(incident.closedAt)}</p>}
            </div>
          )}
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Priority</p>
            <StatusBadge status={normalizePriorityVariant(incident.priority)}>{incident.priority}</StatusBadge>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Severity</p>
            <StatusBadge status={normalizeSeverityVariant(incident.severity)}>{incident.severity}</StatusBadge>
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Assigned To</p>
            <p className="truncate font-medium">{getUserDisplay(incident.assignedTo)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle>Description</CardTitle></CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{incident.description}</p>
            </CardContent>
          </Card>

          {(incident.resolution || incident.status === 'Resolved' || incident.status === 'Closed') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-600" />Resolution</CardTitle>
                {incident.resolvedAt && <CardDescription>Resolved on {formatDate(incident.resolvedAt)}</CardDescription>}
              </CardHeader>
              <CardContent>
                {incident.resolution ? <p className="whitespace-pre-wrap text-sm leading-relaxed">{incident.resolution}</p> : <p className="text-sm italic text-muted-foreground">No resolution notes provided.</p>}
              </CardContent>
            </Card>
          )}

          <IncidentSLACard incidentId={incident._id} />
        </div>

        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">People</CardTitle></CardHeader>
            <CardContent className="divide-y">
              <InfoRow icon={User} label="Reported By" value={getUserDisplay(incident.reportedBy)} />
              <InfoRow icon={User} label="Assigned To" value={getUserDisplay(incident.assignedTo)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
            <CardContent className="divide-y">
              <InfoRow icon={Clock} label="Created" value={formatDate(incident.createdAt)} />
              <InfoRow icon={Clock} label="Last Updated" value={formatDate(incident.updatedAt)} />
              {incident.resolvedAt && <InfoRow icon={CheckCircle} label="Resolved" value={formatDate(incident.resolvedAt)} />}
              {incident.closedAt && <InfoRow icon={XCircle} label="Closed" value={formatDate(incident.closedAt)} />}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Escalation policy gets the full content width so its target details remain readable. */}
      <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />
                Escalation Policy
              </CardTitle>
              <CardDescription>
                Escalation rules for{' '}
                <StatusBadge status={normalizePriorityVariant(incident.priority)} className="text-xs px-1.5 py-0.5">
                  {incident.priority}
                </StatusBadge>{' '}
                priority incidents
              </CardDescription>
            </CardHeader>
            <CardContent>
              {escalationPolicies.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  No escalation policy configured for{' '}
                  <StatusBadge status={normalizePriorityVariant(incident.priority)} className="text-xs px-1.5 py-0.5">
                    {incident.priority}
                  </StatusBadge>{' '}
                  priority.
                </p>
              ) : (
                <div className="space-y-3">
                  {escalationPolicies.map((policy) => (
                    <div
                      key={policy._id}
                      className="rounded-md border p-3 text-sm space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium flex items-center gap-1.5">
                          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                          {policy.escalationLevel}
                        </span>
                        <StatusBadge status="default" className="text-xs px-1.5 py-0.5">
                          {policy.thresholdMinutes >= 60
                            ? `${Math.floor(policy.thresholdMinutes / 60)}h`
                            : `${policy.thresholdMinutes}m`}{' '}
                          threshold
                        </StatusBadge>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        {policy.targetType === 'User' && policy.targetUser ? (
                          <>
                            <User className="h-3 w-3 shrink-0" />
                            <span>
                              Escalates to{' '}
                              <span className="font-medium text-foreground">
                                {policy.targetUser.name}
                              </span>{' '}
                              ({policy.targetUser.email})
                            </span>
                          </>
                        ) : policy.targetType === 'SupportTeam' && policy.targetTeam ? (
                          <>
                            <Users className="h-3 w-3 shrink-0" />
                            <span>
                              Escalates to{' '}
                              <span className="font-medium text-foreground">
                                {policy.targetTeam.name}
                              </span>{' '}
                              team
                            </span>
                          </>
                        ) : (
                          <span>Target not configured</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Incident"
        description={`Are you sure you want to delete incident ${incident.incidentId}? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}
