import { hours, percent } from '@/lib/analyticsFormat'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { DateRangeFilter } from '@/components/analytics/date-range-filter'
import {
  QueryPanel,
  Metrics,
  IncidentTrend,
} from '@/components/analytics/analytics-panels'
import { useAnalytics, useAnalyticsScope } from '@/hooks/useAnalytics'
import type { AnalyticsDateParams } from '@/types/analytics'

export function DashboardPage() {
  const scope = useAnalyticsScope()
  return <DashboardWorkspace key={JSON.stringify(scope.key)} />
}
function DashboardWorkspace() {
  const [range, setRange] = useState<AnalyticsDateParams>({})
  const q = useAnalytics(range)
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Service health and outcomes for your current organization."
      />
      <DateRangeFilter value={range} onApply={setRange} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <QueryPanel
          title="Incident Activity"
          description="Creation cohort; last 30 UTC days by default."
          query={q.incidents}
        >
          {(data) => (
            <Metrics
              items={[
                ['Total incidents', data.totalIncidents],
                ['Open', data.open],
                ['In progress', data.inProgress],
              ]}
            />
          )}
        </QueryPanel>
        <QueryPanel
          title="SLA Compliance"
          description="Current state; filtered by SLA creation date."
          query={q.sla}
        >
          {(data) => (
            <>
              <Metrics
                items={[
                  ['Compliance', percent(data.complianceRate)],
                  ['Total SLAs', data.totalSLAs],
                ]}
              />
              {data.totalSLAs === 0 && (
                <p className="text-sm text-muted-foreground">
                  No SLA records in this sample.
                </p>
              )}
            </>
          )}
        </QueryPanel>
        <QueryPanel
          title="Resolution Time"
          description="Resolution/closure outcomes; valid durations only."
          query={q.resolution}
        >
          {(data) => (
            <Metrics
              items={[
                ['Average time', hours(data.averageResolutionHours)],
                ['Resolved / closed', data.totalResolvedIncidents],
              ]}
            />
          )}
        </QueryPanel>
        <QueryPanel
          title="Asset Health"
          description="Current inventory snapshot; dates affect history alerts only."
          query={q.assets}
        >
          {(data) => (
            <>
              <Metrics
                items={[
                  ['Health rate', percent(data.healthRate)],
                  ['Total assets', data.totalAssets],
                ]}
              />
              <p className="text-xs text-muted-foreground">
                Healthy means Available or Assigned.
                {data.totalAssets === 0 &&
                  ' No assets in the current inventory.'}
              </p>
            </>
          )}
        </QueryPanel>
        <QueryPanel
          title="Change Outcomes"
          description="Success among completed, failed, and cancelled Changes."
          query={q.changes}
        >
          {(data) => (
            <>
              <Metrics
                items={[
                  ['Success rate', percent(data.successRate)],
                  ['Evaluated', data.evaluatedChanges],
                ]}
              />
              {data.evaluatedChanges === 0 && (
                <p className="text-sm text-muted-foreground">
                  No evaluated outcomes in this sample.
                </p>
              )}
            </>
          )}
        </QueryPanel>
        <QueryPanel
          title="Operational Coverage"
          description="Active administrators; current assignments filtered by Incident creation."
          query={q.performance}
        >
          {(rows) => (
            <>
              <Metrics items={[['Administrators', rows.length]]} />
              <p className="text-sm text-muted-foreground">
                {rows.length
                  ? 'See per-administrator assignments and outcomes in Analytics.'
                  : 'No active administrators in this organization.'}
              </p>
            </>
          )}
        </QueryPanel>
      </div>
      <QueryPanel
        title="Incident Trends"
        description="Daily incident creation, in UTC."
        query={q.incidents}
      >
        {(data) => <IncidentTrend data={data} />}
      </QueryPanel>
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/analytics">Explore all analytics</Link>
        </Button>
        {[
          ['Incidents', '/incidents'],
          ['Service Requests', '/service-requests'],
          ['Assets', '/assets'],
          ['Knowledge Base', '/knowledge-base'],
        ].map(([label, to]) => (
          <Button key={to} variant="outline" asChild>
            <Link to={to}>{label}</Link>
          </Button>
        ))}
      </div>
    </div>
  )
}
