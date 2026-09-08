import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ScrollText,
} from 'lucide-react'
import { AuditRecordDialog } from '@/components/audit/audit-record-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { PageHeader } from '@/components/ui/page-header'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuditLogs } from '@/hooks/useAuditLogs'
import { useSettingsScope } from '@/hooks/useSettingsScope'
import { filterAuditRecords, formatAuditTimestamp } from '@/lib/auditView'
import { settingsError } from '@/lib/settingsApi'
import type { AuditFilters, AuditLogRecord } from '@/types/audit'

const emptyFilters: AuditFilters = {
  search: '',
  outcome: '',
  resourceType: '',
  actorRole: '',
}
const pageSize = 25
const selectClass =
  'h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

function Outcome({ record }: { record: AuditLogRecord }) {
  return (
    <Badge variant={record.outcome === 'Failure' ? 'destructive' : 'secondary'}>
      {record.outcome}
    </Badge>
  )
}

function AuditLogsContent() {
  const query = useAuditLogs()
  const [filters, setFilters] = useState<AuditFilters>(emptyFilters)
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const records = query.data
  const resourceTypes = useMemo(
    () =>
      [...new Set((records ?? []).map((record) => record.resourceType))].sort(),
    [records],
  )
  const outcomes = useMemo(
    () => [...new Set((records ?? []).map((record) => record.outcome))].sort(),
    [records],
  )
  const roles = useMemo(
    () =>
      [
        ...new Set(
          (records ?? []).flatMap((record) =>
            record.actorRole ? [record.actorRole] : [],
          ),
        ),
      ].sort(),
    [records],
  )
  const filtered = useMemo(
    () => filterAuditRecords(records ?? [], filters),
    [records, filters],
  )
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount - 1)
  const visible = filtered.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  )
  const selected = records?.find((record) => record._id === selectedId)
  const updateFilters = (next: Partial<AuditFilters>) => {
    setFilters((previous) => ({ ...previous, ...next }))
    setPage(0)
  }
  const clearFilters = () => {
    setFilters(emptyFilters)
    setPage(0)
  }
  const hasFilters = Object.values(filters).some(Boolean)
  const detailButton = (record: AuditLogRecord) => (
    <Button
      variant="ghost"
      size="sm"
      aria-label={`View audit details for ${record.action} at ${formatAuditTimestamp(record.createdAt)}`}
      onClick={() => setSelectedId(record._id)}
    >
      Details
    </Button>
  )

  return (
    <div className="min-w-0 space-y-5">
      <Button asChild variant="ghost" size="sm">
        <Link to="/settings">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Settings
        </Link>
      </Button>
      <PageHeader
        title="Audit Logs"
        description="Review recorded activity and outcomes for your organization."
        icon={ScrollText}
        actions={
          <Button
            variant="outline"
            disabled={query.isFetching}
            onClick={() => {
              void query.refetch()
            }}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`}
            />
            {query.isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        }
      />
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="min-w-0 space-y-2">
          <Label htmlFor="audit-search">Search loaded records</Label>
          <Input
            id="audit-search"
            placeholder="Actor email, action, event, or resource..."
            value={filters.search}
            onChange={(event) => updateFilters({ search: event.target.value })}
          />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="audit-outcome">Outcome</Label>
          <select
            id="audit-outcome"
            className={selectClass}
            value={filters.outcome}
            onChange={(event) =>
              updateFilters({
                outcome: event.target.value as AuditFilters['outcome'],
              })
            }
          >
            <option value="">All outcomes</option>
            {outcomes.map((outcome) => (
              <option key={outcome} value={outcome}>
                {outcome}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="audit-resource">Resource type</Label>
          <select
            id="audit-resource"
            className={selectClass}
            value={filters.resourceType}
            onChange={(event) =>
              updateFilters({ resourceType: event.target.value })
            }
          >
            <option value="">All resources</option>
            {resourceTypes.map((resource) => (
              <option key={resource} value={resource}>
                {resource}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="audit-role">Actor role</Label>
          <select
            id="audit-role"
            className={selectClass}
            value={filters.actorRole}
            onChange={(event) =>
              updateFilters({
                actorRole: event.target.value as AuditFilters['actorRole'],
              })
            }
          >
            <option value="">All roles</option>
            {roles.map((role) => (
              <option key={role} value={role}>
                {role.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Search, filters, and pages apply to the loaded records. Refresh to
          check for new activity.
        </p>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>
      {query.isPending ? (
        <div className="rounded-lg border p-8">
          <LoadingSpinner label="Loading audit logs" />
        </div>
      ) : query.isError ? (
        <ErrorState
          title="Audit logs could not be loaded"
          description={settingsError(query.error)}
          onRetry={() => query.refetch()}
        />
      ) : !records?.length ? (
        <EmptyState
          icon={ScrollText}
          title="No audit logs yet"
          description="Recorded organization activity will appear here."
        />
      ) : !filtered.length ? (
        <EmptyState
          preset="search"
          title="No matching audit records"
          description="Try a different search or clear the filters."
          action={{ label: 'Clear filters', onClick: clearFilters }}
        />
      ) : (
        <>
          <p role="status" className="text-sm text-muted-foreground">
            Showing {currentPage * pageSize + 1}–
            {Math.min((currentPage + 1) * pageSize, filtered.length)} of{' '}
            {filtered.length} matching records · {records.length} loaded ·
            Newest first
          </p>
          <div className="hidden rounded-lg border xl:block">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">Timestamp</TableHead>
                  <TableHead>Actor / role</TableHead>
                  <TableHead>Action / event</TableHead>
                  <TableHead>Resource / ID</TableHead>
                  <TableHead className="w-24">Outcome</TableHead>
                  <TableHead className="w-20">
                    <span className="sr-only">Details</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((record) => (
                  <TableRow key={record._id}>
                    <TableCell className="whitespace-normal text-xs">
                      {formatAuditTimestamp(record.createdAt)}
                    </TableCell>
                    <TableCell className="whitespace-normal break-words">
                      <p>
                        {record.actorEmail ||
                          record.actorId ||
                          'Actor not recorded'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {record.actorRole?.toUpperCase() || 'Role not recorded'}
                      </p>
                    </TableCell>
                    <TableCell className="whitespace-normal break-words">
                      <p className="font-medium">{record.action}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {record.eventType}
                      </p>
                    </TableCell>
                    <TableCell className="whitespace-normal break-words">
                      <p>{record.resourceType}</p>
                      <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                        {record.resourceId || 'ID not recorded'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Outcome record={record} />
                    </TableCell>
                    <TableCell>{detailButton(record)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:hidden">
            {visible.map((record) => (
              <Card key={record._id} className="min-w-0">
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {formatAuditTimestamp(record.createdAt)}
                    </p>
                    <Outcome record={record} />
                  </div>
                  <div className="break-words">
                    <h2 className="font-semibold">{record.action}</h2>
                    <p className="text-xs text-muted-foreground">
                      {record.eventType}
                    </p>
                  </div>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Actor / role
                      </dt>
                      <dd className="break-words">
                        {record.actorEmail ||
                          record.actorId ||
                          'Actor not recorded'}{' '}
                        ·{' '}
                        {record.actorRole?.toUpperCase() || 'Role not recorded'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Resource
                      </dt>
                      <dd className="break-words">{record.resourceType}</dd>
                      <dd className="break-all font-mono text-xs text-muted-foreground">
                        {record.resourceId || 'ID not recorded'}
                      </dd>
                    </div>
                  </dl>
                  <div className="flex justify-end">{detailButton(record)}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          <nav
            aria-label="Audit record pages"
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <p className="text-xs text-muted-foreground">
              Page {currentPage + 1} of {pageCount} · Up to {pageSize} loaded
              records per page
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= pageCount - 1}
                onClick={() => setPage(currentPage + 1)}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </nav>
        </>
      )}
      {selected && !query.isError && (
        <AuditRecordDialog
          record={selected}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}

export function AuditLogsPage() {
  const scope = useSettingsScope()
  if (!scope.isAdmin) return null
  return <AuditLogsContent key={JSON.stringify(scope.key)} />
}
