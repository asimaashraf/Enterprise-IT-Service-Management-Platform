import { useMemo, useState } from 'react'
import { Clock, Plus, Settings2 } from 'lucide-react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'

import { SLACreateDialog } from '@/components/sla/sla-create-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { useIncidents } from '@/hooks/useIncidents'
import { useCreateSLA, useSlas } from '@/hooks/useSlas'
import type { RootState } from '@/store'
import { getSLAIncident, slaTargetsByPriority } from '@/types/sla'

const formatMinutes = (minutes: number) => minutes >= 60 ? `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}` : `${minutes}m`
const formatHours = (hour: number, minute: number) => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

export function SLAPage() {
  const user = useSelector((state: RootState) => state.auth.user)
  const isAdmin = user?.role === 'admin'
  const slasQuery = useSlas()
  const incidentsQuery = useIncidents()
  const [dialogOpen, setDialogOpen] = useState(false)
  const createMutation = useCreateSLA({ onSuccess: () => setDialogOpen(false) })
  const configuredIncidentIds = useMemo(() => new Set((slasQuery.data ?? []).map((sla) => typeof sla.incidentId === 'string' ? sla.incidentId : sla.incidentId._id)), [slasQuery.data])
  const configurableIncidents = useMemo(() => (incidentsQuery.data ?? []).filter((incident) => !configuredIncidentIds.has(incident._id)), [configuredIncidentIds, incidentsQuery.data])

  if (slasQuery.isLoading) return <div className="flex justify-center py-20"><LoadingSpinner label="Loading SLAs…" /></div>
  if (slasQuery.isError) return <ErrorState title="SLAs could not be loaded" description={slasQuery.error instanceof Error ? slasQuery.error.message : undefined} onRetry={() => slasQuery.refetch()} />

  return <div className="space-y-6"><PageHeader title="SLA Management" description={isAdmin ? 'Configure incident business hours and monitor tenant SLA state.' : 'Monitor SLA state for incidents you are authorized to access.'} icon={Clock} actions={isAdmin ? <div className="flex gap-2"><Button variant="outline" asChild><Link to="/sla/escalations">Escalation Policies</Link></Button><Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Configure SLA</Button></div> : undefined} />
    <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Settings2 className="h-4 w-4" />Priority targets</CardTitle><CardDescription>Targets are fixed by the existing backend SLA rules.</CardDescription></CardHeader><CardContent className="grid grid-cols-2 gap-3 text-sm">{Object.entries(slaTargetsByPriority).map(([priority, target]) => <div key={priority} className="rounded-md border p-3"><p className="font-medium">{priority}</p><p className="text-muted-foreground">Response: {formatMinutes(target.responseTimeMinutes)}</p><p className="text-muted-foreground">Resolution: {formatMinutes(target.resolutionTimeMinutes)}</p></div>)}</CardContent></Card><Card><CardHeader><CardTitle className="text-base">Configuration scope</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{isAdmin ? 'Create one SLA for an incident and set its timezone, daily hours, and working days. The backend derives response and resolution targets from priority.' : 'SLA configuration is available to administrators only. SLA state below is read-only.'}</CardContent></Card></div>
    <Card><CardHeader><CardTitle>Incident SLAs</CardTitle><CardDescription>Current targets, deadlines, and breach state.</CardDescription></CardHeader><CardContent>{(slasQuery.data ?? []).length === 0 ? <EmptyState title="No SLAs configured" description={isAdmin ? 'Configure an SLA for an incident to begin tracking deadlines.' : 'There are no SLA records available.'} action={isAdmin ? { label: 'Configure SLA', onClick: () => setDialogOpen(true) } : undefined} /> : <div className="space-y-3">{(slasQuery.data ?? []).map((sla) => { const incident = getSLAIncident(sla.incidentId); return <div key={sla._id} className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{incident ? `${incident.incidentId} — ${incident.title}` : 'Incident SLA'}</p><p className="text-sm text-muted-foreground">{sla.priority} · Response {formatMinutes(sla.responseTimeMinutes)} · Resolution {formatMinutes(sla.resolutionTimeMinutes)}</p><p className="mt-1 text-xs text-muted-foreground">Business hours {formatHours(sla.businessHours.startHour, sla.businessHours.startMinute)}–{formatHours(sla.businessHours.endHour, sla.businessHours.endMinute)} ({sla.businessHours.timezone})</p></div><StatusBadge status={sla.responseBreached || sla.resolutionBreached ? 'critical' : sla.status === 'Completed' ? 'resolved' : 'default'}>{sla.status}</StatusBadge></div> })}</div>}</CardContent></Card>
    {isAdmin && <SLACreateDialog open={dialogOpen} onOpenChange={setDialogOpen} incidents={configurableIncidents} submitting={createMutation.isPending} onSubmit={(payload) => createMutation.mutate(payload)} />}
  </div>
}
