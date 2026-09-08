import { number } from '@/lib/analyticsFormat'
import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import type { IncidentTrendsAnalytics } from '@/types/analytics'

export function QueryPanel<T>({
  title,
  description,
  query,
  children,
}: {
  title: string
  description: string
  query: UseQueryResult<T, Error>
  children: (data: T) => ReactNode
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4" aria-busy={query.isFetching}>
        {query.isPending ? (
          <div
            role="status"
            aria-label={`Loading ${title}`}
            className="space-y-3"
          >
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : query.isError ? (
          <ErrorState
            title={`Unable to load ${title.toLowerCase()}`}
            description={query.error.message}
            onRetry={() => {
              void query.refetch()
            }}
          />
        ) : (
          <>
            {query.isFetching && (
              <p role="status" className="text-xs text-muted-foreground">
                Refreshing...
              </p>
            )}
            {children(query.data)}
          </>
        )}
      </CardContent>
    </Card>
  )
}
export function Metrics({ items }: { items: [string, string | number][] }) {
  return (
    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="break-words text-lg font-semibold tabular-nums">
            {typeof value === 'number' ? number(value) : value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
export function NoData({
  description = 'No records in this reporting sample.',
}: {
  description?: string
}) {
  return <EmptyState title="No data" description={description} />
}
const tooltipStyle = {
  background: 'hsl(var(--popover))',
  color: 'hsl(var(--popover-foreground))',
  border: '1px solid hsl(var(--border))',
}
export function ValueBars({
  data,
  label,
  unit = 'count',
}: {
  data: { name: string; value: number }[]
  label: string
  unit?: 'count' | 'hours'
}) {
  if (!data.length) return <NoData />
  return (
    <div className="space-y-2">
      <div className="min-w-0" role="group" aria-label={label}>
        <div
          style={{ height: Math.max(220, data.length * 42) }}
          className="w-full min-w-0"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ left: 0, right: 24, top: 8, bottom: 8 }}
              accessibilityLayer
            >
              <CartesianGrid stroke="hsl(var(--border))" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 'auto']}
                allowDecimals={unit === 'hours'}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={110}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickFormatter={(value: string) =>
                  value.length > 16 ? `${value.slice(0, 15)}...` : value
                }
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: 'hsl(var(--muted))' }}
              />
              <Legend />
              <Bar
                dataKey="value"
                name={unit === 'hours' ? 'Hours' : 'Count'}
                fill="hsl(var(--primary))"
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">
          View chart values
        </summary>
        <dl className="mt-2 space-y-1">
          {data.map((row, index) => (
            <div
              key={`${row.name}-${index}`}
              className="flex justify-between gap-4"
            >
              <dt>{row.name}</dt>
              <dd>
                {number(row.value)}
                {unit === 'hours' ? ' h' : ''}
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  )
}
export function IncidentTrend({ data }: { data: IncidentTrendsAnalytics }) {
  return (
    <>
      <Metrics
        items={[
          ['Total incidents', data.totalIncidents],
          ['Open', data.open],
          ['In progress', data.inProgress],
        ]}
      />
      {data.totalIncidents === 0 && (
        <p className="text-sm text-muted-foreground">
          No incidents were created in this period.
        </p>
      )}
      <div
        className="h-64 w-full min-w-0"
        role="group"
        aria-label="Incidents created per UTC day"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data.trend}
            margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
            accessibilityLayer
          >
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              minTickGap={35}
              tickFormatter={(value: string) => value.slice(5)}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis
              allowDecimals={false}
              domain={[0, 'auto']}
              width={40}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Area
              type="linear"
              dataKey="count"
              name="Incidents created"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.15}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">
          View daily counts (UTC)
        </summary>
        <div className="mt-2">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Incidents</th>
              </tr>
            </thead>
            <tbody>
              {data.trend.map((row) => (
                <tr key={row.date}>
                  <td>{row.date}</td>
                  <td>{number(row.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  )
}
