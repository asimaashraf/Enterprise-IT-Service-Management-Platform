import { useEffect, useState } from 'react'
import { AlertTriangle, Clock, Timer } from 'lucide-react'
import { format } from 'date-fns'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { StatusBadge } from '@/components/ui/status-badge'
import { useSLAForIncident } from '@/hooks/useSlas'

const formatDate = (value: string) => format(new Date(value), 'MMM d, yyyy HH:mm')

const formatMinutes = (minutes: number) =>
  minutes >= 60
    ? `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`
    : `${minutes}m`

const remainingTime = (deadline: string, now: number) => {
  const milliseconds = new Date(deadline).getTime() - now
  const absoluteMinutes = Math.ceil(Math.abs(milliseconds) / 60000)
  const label = formatMinutes(absoluteMinutes)
  return milliseconds <= 0 ? `Overdue by ${label}` : `${label} remaining`
}

export function IncidentSLACard({ incidentId }: { incidentId: string }) {
  const { data: sla, isLoading, isError } = useSLAForIncident(incidentId)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60000)
    return () => window.clearInterval(interval)
  }, [])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-6">
          <LoadingSpinner size={16} />
          <span className="text-sm text-muted-foreground">Loading SLA status…</span>
        </CardContent>
      </Card>
    )
  }

  if (isError || !sla) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">SLA</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">No SLA record is available for this incident.</p></CardContent>
      </Card>
    )
  }

  const hasBreach = sla.responseBreached || sla.resolutionBreached
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><Timer className="h-4 w-4" />SLA</CardTitle>
        <CardDescription className="flex items-center gap-2">
          <StatusBadge status={hasBreach ? 'critical' : sla.status === 'Completed' ? 'resolved' : 'default'}>{sla.status}</StatusBadge>
          {hasBreach && <span className="flex items-center gap-1 text-destructive"><AlertTriangle className="h-3.5 w-3.5" />Breach warning</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border p-3"><p className="text-muted-foreground">Response target</p><p className="font-medium">{formatMinutes(sla.responseTimeMinutes)}</p><p className="mt-1 text-xs text-muted-foreground">Due {formatDate(sla.responseDueAt)}</p><p className={sla.responseBreached ? 'mt-1 text-xs font-medium text-destructive' : 'mt-1 text-xs text-muted-foreground'}>{sla.respondedAt ? `Responded ${formatDate(sla.respondedAt)}` : remainingTime(sla.responseDueAt, now)}</p></div>
          <div className="rounded-md border p-3"><p className="text-muted-foreground">Resolution target</p><p className="font-medium">{formatMinutes(sla.resolutionTimeMinutes)}</p><p className="mt-1 text-xs text-muted-foreground">Due {formatDate(sla.resolutionDueAt)}</p><p className={sla.resolutionBreached ? 'mt-1 text-xs font-medium text-destructive' : 'mt-1 text-xs text-muted-foreground'}>{sla.resolvedAt ? `Resolved ${formatDate(sla.resolvedAt)}` : remainingTime(sla.resolutionDueAt, now)}</p></div>
        </div>
        <p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" />Business hours: {String(sla.businessHours.startHour).padStart(2, '0')}:{String(sla.businessHours.startMinute).padStart(2, '0')}–{String(sla.businessHours.endHour).padStart(2, '0')}:{String(sla.businessHours.endMinute).padStart(2, '0')} ({sla.businessHours.timezone})</p>
      </CardContent>
    </Card>
  )
}

