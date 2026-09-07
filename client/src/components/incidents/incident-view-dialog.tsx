import { useState } from 'react'
import { useSelector } from 'react-redux'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
  AlertTriangle,
  Download,
  User,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Users,
} from 'lucide-react'
import { format } from 'date-fns'

import {
  type Incident,
  getUserDisplay,
  normalizeStatusVariant,
  normalizePriorityVariant,
  normalizeSeverityVariant,
} from '@/types/incident'
import { useApplicableEscalationPolicies } from '@/hooks/useEscalationPolicies'
import { downloadIncidentPdf } from '@/hooks/useIncidents'
import { IncidentSLACard } from '@/components/incidents/incident-sla-card'
import type { RootState } from '@/store'

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—'
  try {
    return format(new Date(dateStr), 'MMM d, yyyy HH:mm')
  } catch {
    return '—'
  }
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
}) {
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

interface IncidentViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  incident: Incident | null
}

export function IncidentViewDialog({
  open,
  onOpenChange,
  incident,
}: IncidentViewDialogProps) {
  const [isExporting, setIsExporting] = useState(false)
  const isAdmin = useSelector((state: RootState) => state.auth.user?.role === 'admin')

  // Fetch escalation policies for this incident's priority
  const { data: escalationPolicies = [] } = useApplicableEscalationPolicies(
    incident?.priority ?? 'Low',
    isAdmin,
  )

  const handleExportPdf = async () => {
    if (!incident) return
    setIsExporting(true)
    try {
      await downloadIncidentPdf(incident._id, incident.incidentId)
    } finally {
      setIsExporting(false)
    }
  }

  if (!incident) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary shrink-0" />
              <DialogTitle className="font-mono text-base">
                {incident.incidentId}
              </DialogTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              disabled={isExporting}
            >
              {isExporting ? (
                <LoadingSpinner size={14} className="mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              PDF
            </Button>
          </div>
          <DialogDescription className="text-base font-medium text-foreground">
            {incident.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Classification badges */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status</span>
              <StatusBadge status={normalizeStatusVariant(incident.status)}>
                {incident.status}
              </StatusBadge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Priority</span>
              <StatusBadge status={normalizePriorityVariant(incident.priority)}>
                {incident.priority}
              </StatusBadge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Severity</span>
              <StatusBadge status={normalizeSeverityVariant(incident.severity)}>
                {incident.severity}
              </StatusBadge>
            </div>
          </div>

          {/* Description */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {incident.description}
              </p>
            </CardContent>
          </Card>

          {/* Resolution */}
          {(incident.resolution ||
            incident.status === 'Resolved' ||
            incident.status === 'Closed') && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Resolution
                </CardTitle>
                {incident.resolvedAt && (
                  <p className="text-xs text-muted-foreground">
                    Resolved on {formatDate(incident.resolvedAt)}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {incident.resolution ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {incident.resolution}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No resolution notes provided.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <IncidentSLACard incidentId={incident._id} />

          {/* People */}
          {isAdmin && <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">People</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0 divide-y">
              <InfoRow
                icon={User}
                label="Reported By"
                value={getUserDisplay(incident.reportedBy)}
              />
              <InfoRow
                icon={User}
                label="Assigned To"
                value={getUserDisplay(incident.assignedTo)}
              />
            </CardContent>
          </Card>}

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0 divide-y">
              <InfoRow
                icon={Clock}
                label="Created"
                value={formatDate(incident.createdAt)}
              />
              <InfoRow
                icon={Clock}
                label="Last Updated"
                value={formatDate(incident.updatedAt)}
              />
              {incident.resolvedAt && (
                <InfoRow
                  icon={CheckCircle}
                  label="Resolved"
                  value={formatDate(incident.resolvedAt)}
                />
              )}
              {incident.closedAt && (
                <InfoRow
                  icon={XCircle}
                  label="Closed"
                  value={formatDate(incident.closedAt)}
                />
              )}
            </CardContent>
          </Card>

          {/* Escalation Policy */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4" />
                Escalation Policy
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Escalation rules for{' '}
                <StatusBadge
                  status={normalizePriorityVariant(incident.priority)}
                  className="text-xs px-1.5 py-0.5"
                >
                  {incident.priority}
                </StatusBadge>{' '}
                priority incidents
              </p>
            </CardHeader>
            <CardContent>
              {escalationPolicies.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  No escalation policy configured for{' '}
                  <StatusBadge
                    status={normalizePriorityVariant(incident.priority)}
                    className="text-xs px-1.5 py-0.5"
                  >
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
                        <StatusBadge
                          status="default"
                          className="text-xs px-1.5 py-0.5"
                        >
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
                        ) : policy.targetType === 'SupportTeam' &&
                          policy.targetTeam ? (
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
        </div>
      </DialogContent>
    </Dialog>
  )
}
