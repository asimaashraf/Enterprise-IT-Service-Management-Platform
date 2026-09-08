import { hours, percent, number } from '@/lib/analyticsFormat'
import { useState } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { DateRangeFilter } from '@/components/analytics/date-range-filter'
import {
  QueryPanel,
  Metrics,
  ValueBars,
  IncidentTrend,
  NoData,
} from '@/components/analytics/analytics-panels'
import { useAnalytics, useAnalyticsScope } from '@/hooks/useAnalytics'
import type { AnalyticsDateParams } from '@/types/analytics'

export function AnalyticsPage() {
  const scope = useAnalyticsScope()
  return <AnalyticsWorkspace key={JSON.stringify(scope.key)} />
}
function AnalyticsWorkspace() {
  const [range, setRange] = useState<AnalyticsDateParams>({})
  const q = useAnalytics(range)
  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Service outcomes and operational performance for your organization."
      />
      <DateRangeFilter value={range} onApply={setRange} />
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <QueryPanel
          title="Incident Trends"
          description="Incidents created in the selected period, or the last 30 UTC days by default."
          query={q.incidents}
        >
          {(data) => <IncidentTrend data={data} />}
        </QueryPanel>
        <QueryPanel
          title="SLA Compliance"
          description="Current SLA state, grouped by SLA creation date when filtered. Breach categories can overlap."
          query={q.sla}
        >
          {(data) => (
            <>
              <Metrics
                items={[
                  ['Compliance', percent(data.complianceRate)],
                  ['Total SLAs', data.totalSLAs],
                  ['Compliant', data.compliant],
                  ['Distinct breached', data.totalBreached],
                  ['Response breaches', data.responseBreached],
                  ['Resolution breaches', data.resolutionBreached],
                ]}
              />
              {data.totalSLAs === 0 ? (
                <NoData />
              ) : (
                <ValueBars
                  label="Compliant and uniquely breached SLAs"
                  data={[
                    { name: 'Compliant', value: data.compliant },
                    { name: 'Breached', value: data.totalBreached },
                    {
                      name: 'Other state',
                      value: Math.max(
                        0,
                        data.totalSLAs - data.compliant - data.totalBreached,
                      ),
                    },
                  ]}
                />
              )}
            </>
          )}
        </QueryPanel>
        <QueryPanel
          title="Operational Performance"
          description="Active administrators and their currently assigned incidents. Dates filter Incident creation; assignment history is not reconstructed."
          query={q.performance}
        >
          {(rows) =>
            rows.length === 0 ? (
              <NoData description="No active administrators in this organization." />
            ) : (
              <>
                <ValueBars
                  label="Currently assigned incidents per administrator"
                  data={rows.map((row) => ({
                    name: row.technicianName,
                    value: row.totalAssigned,
                  }))}
                />
                {/* Keep the absolutely positioned sr-only caption inside the table scroll area. */}
                <div className="relative overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <caption className="sr-only">
                      Current assignment performance for every returned
                      administrator
                    </caption>
                    <thead>
                      <tr className="border-b">
                        {[
                          'Administrator',
                          'Assigned',
                          'Resolved / closed',
                          'Resolution rate',
                          'Average time',
                        ].map((label) => (
                          <th
                            key={label}
                            scope="col"
                            className="p-2 font-medium"
                          >
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.technicianId} className="border-b">
                          <th scope="row" className="p-2 font-medium">
                            {row.technicianName}
                            <span className="block text-xs font-normal text-muted-foreground">
                              {row.email}
                            </span>
                          </th>
                          <td className="p-2">{number(row.totalAssigned)}</td>
                          <td className="p-2">
                            {number(row.totalResolvedOrClosed)}
                          </td>
                          <td className="p-2">{percent(row.resolutionRate)}</td>
                          <td className="p-2">
                            {hours(row.averageResolutionTimeHours)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )
          }
        </QueryPanel>
        <QueryPanel
          title="Resolution Time"
          description="Resolved/closed incidents, filtered by resolution time (closure time when no resolution timestamp exists). Invalid durations are excluded from averages."
          query={q.resolution}
        >
          {(data) => (
            <>
              <Metrics
                items={[
                  ['Average', hours(data.averageResolutionHours)],
                  ['Median', hours(data.medianResolutionHours)],
                  ['Resolved / closed', data.totalResolvedIncidents],
                ]}
              />
              {data.averageResolutionHours === null &&
              data.medianResolutionHours === null ? (
                <NoData description="No usable resolution durations in this sample." />
              ) : (
                <ValueBars
                  label="Average and median resolution hours"
                  unit="hours"
                  data={[
                    ...(data.averageResolutionHours === null
                      ? []
                      : [
                          {
                            name: 'Average',
                            value: data.averageResolutionHours,
                          },
                        ]),
                    ...(data.medianResolutionHours === null
                      ? []
                      : [
                          { name: 'Median', value: data.medianResolutionHours },
                        ]),
                  ]}
                />
              )}
              <p className="text-sm font-medium">
                Resolved / closed counts by priority
              </p>
              <Metrics items={Object.entries(data.byPriority)} />
            </>
          )}
        </QueryPanel>
        <QueryPanel
          title="Asset Health"
          description="Asset health is a current inventory snapshot; date range only affects maintenance/lifecycle history."
          query={q.assets}
        >
          {(data) => (
            <>
              <Metrics
                items={[
                  ['Health rate', percent(data.healthRate)],
                  ['Total assets', data.totalAssets],
                  ['Available', data.available],
                  ['Assigned', data.assigned],
                  ['Maintenance', data.maintenance],
                  ['Retired', data.retired],
                  ['Warranty alerts', data.warrantyAlerts],
                  ['Maintenance alerts', data.maintenanceAlerts],
                  ['Lifecycle alerts', data.lifecycleAlerts],
                ]}
              />
              <p className="text-xs text-muted-foreground">
                Healthy means Available or Assigned. Warranty alerts include
                expired warranties and those expiring within 30 days.
                Maintenance alerts include current maintenance plus
                non-cancelled past records (90 days by default). Lifecycle
                alerts count currently retired assets, limited to retirement
                events in the selected period when filtered.
              </p>
              {data.totalAssets === 0 ? (
                <NoData description="No assets in the current inventory." />
              ) : (
                <ValueBars
                  label="Current asset status counts"
                  data={[
                    { name: 'Available', value: data.available },
                    { name: 'Assigned', value: data.assigned },
                    { name: 'Maintenance', value: data.maintenance },
                    { name: 'Retired', value: data.retired },
                  ]}
                />
              )}
            </>
          )}
        </QueryPanel>
        <QueryPanel
          title="Change Success Rate"
          description="Completed versus failed/cancelled outcomes. Dates filter each outcome timestamp; without dates, all current Changes are included."
          query={q.changes}
        >
          {(data) => (
            <>
              <Metrics
                items={[
                  ['Success rate', percent(data.successRate)],
                  ['Failure rate', percent(data.failureRate)],
                  ['Completed', data.completed],
                  ['Failed', data.failed],
                  ['Cancelled', data.cancelled],
                  ['Evaluated', data.evaluatedChanges],
                  ['Unevaluated', data.unevaluatedChanges],
                  ['Total in sample', data.totalChanges],
                ]}
              />
              <p className="text-xs text-muted-foreground">
                Failure rate includes cancellations. Unevaluated changes are not
                pending approvals.
                {range.startDate &&
                  ' A filtered sample contains evaluated outcomes only.'}
              </p>
              {data.evaluatedChanges === 0 ? (
                <NoData description="No evaluated Change outcomes in this sample." />
              ) : (
                <ValueBars
                  label="Evaluated Change outcomes"
                  data={[
                    { name: 'Completed', value: data.completed },
                    { name: 'Failed', value: data.failed },
                    { name: 'Cancelled', value: data.cancelled },
                  ]}
                />
              )}
            </>
          )}
        </QueryPanel>
      </div>
    </div>
  )
}
