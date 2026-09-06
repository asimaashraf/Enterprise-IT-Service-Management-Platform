import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Package, XCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { PageHeader } from '@/components/ui/page-header'
import { FilterBar } from '@/components/ui/filter-bar'
import { DataTable } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingSpinner, TableSkeleton } from '@/components/ui/loading-spinner'
import { ErrorState } from '@/components/ui/error-state'
import { StatusBadge, type StatusBadgeVariant } from '@/components/ui/status-badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

// ============================================================
// Demo data
// ============================================================
interface DemoIncident {
  id: string
  title: string
  status: string
  priority: string
  assignee: string
  created: string
}

const DEMO_INCIDENTS: DemoIncident[] = [
  { id: 'INC-001', title: 'VPN connection drops intermittently', status: 'open', priority: 'high', assignee: 'Alice Chen', created: '2026-09-04' },
  { id: 'INC-002', title: 'Email server unresponsive', status: 'in_progress', priority: 'critical', assignee: 'Bob Kim', created: '2026-09-04' },
  { id: 'INC-003', title: 'Cannot access shared drive', status: 'resolved', priority: 'medium', assignee: 'Carol Lee', created: '2026-09-03' },
  { id: 'INC-004', title: 'Printer offline in Building A', status: 'closed', priority: 'low', assignee: 'Dave Park', created: '2026-09-02' },
  { id: 'INC-005', title: 'Mobile app login broken for iOS', status: 'open', priority: 'high', assignee: 'Eve Liu', created: '2026-09-05' },
  { id: 'INC-006', title: 'Database query timeout', status: 'in_progress', priority: 'critical', assignee: 'Frank Wu', created: '2026-09-05' },
]

// ============================================================
// Demo form schema — used for runtime validation + type inference
// ============================================================
const demoFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  status: z.string().min(1, 'Please select a status'),
  priority: z.string().min(1, 'Please select a priority'),
  assignee: z.string().min(1, 'Please select an assignee'),
})

type DemoFormValues = z.infer<typeof demoFormSchema>

// Schema is used for runtime validation on submit
void demoFormSchema.safeParse

// ============================================================
// ShowcasePage
// ============================================================
export function ShowcasePage() {
  // ---- DataTable demo state ----
  const [incidents, setIncidents] = React.useState<DemoIncident[]>(DEMO_INCIDENTS)
  const loading = false
  const [showTable, setShowTable] = React.useState(true)

  // ---- Filter state ----
  const [filters, setFilters] = React.useState<Record<string, string>>({})

  // ---- ConfirmDialog state ----
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [pendingDelete, setPendingDelete] = React.useState<string | null>(null)

  // ---- Form state ----
  const [formLoading, setFormLoading] = React.useState(false)

  // ---- Filtered data ----
  const filteredIncidents = React.useMemo(() => {
    return incidents.filter((inc) => {
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (
          !inc.title.toLowerCase().includes(q) &&
          !inc.id.toLowerCase().includes(q)
        )
          return false
      }
      if (filters.status && inc.status !== filters.status) return false
      if (filters.priority && inc.priority !== filters.priority) return false
      return true
    })
  }, [incidents, filters])

  // ---- Columns ----
  const columns: ColumnDef<DemoIncident>[] = React.useMemo(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.id}
          </span>
        ),
      },
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }) => (
          <span className="font-medium">{row.original.title}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.status}
            className="capitalize"
          />
        ),
        filterFn: (row, _id, value) => {
          return row.original.status === value
        },
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: ({ row }) => {
          const variantMap: Record<string, StatusBadgeVariant> = {
            critical: 'critical',
            high: 'high',
            medium: 'medium',
            low: 'low',
          }
          return (
            <StatusBadge
              variant={variantMap[row.original.priority]}
              className="capitalize"
            >
              {row.original.priority}
            </StatusBadge>
          )
        },
        filterFn: (row, _id, value) => {
          return row.original.priority === value
        },
      },
      {
        accessorKey: 'assignee',
        header: 'Assignee',
        cell: ({ row }) => row.original.assignee,
      },
      {
        accessorKey: 'created',
        header: 'Created',
        cell: ({ row }) => row.original.created,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              setPendingDelete(row.original.id)
              setDeleteDialogOpen(true)
            }}
          >
            Delete
          </Button>
        ),
      },
    ],
    [],
  )

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleFilterReset = () => setFilters({})

  const handleDeleteConfirm = () => {
    if (pendingDelete) {
      setIncidents((prev) => prev.filter((i) => i.id !== pendingDelete))
      setPendingDelete(null)
    }
    setDeleteDialogOpen(false)
  }

  // ---- Form ----
  const form = useForm<DemoFormValues>({
    defaultValues: {
      title: '',
      status: '',
      priority: '',
      assignee: '',
    },
  })

  const handleFormSubmit = async (values: DemoFormValues) => {
    setFormLoading(true)
    await new Promise((r) => setTimeout(r, 1200))
    const newIncident: DemoIncident = {
      id: `INC-${String(incidents.length + 1).padStart(3, '0')}`,
      title: values.title,
      status: values.status,
      priority: values.priority,
      assignee: values.assignee,
      created: new Date().toISOString().slice(0, 10),
    }
    setIncidents((prev) => [newIncident, ...prev])
    setFormLoading(false)
    form.reset()
  }

  const filterFields = [
    {
      key: 'search',
      type: 'search' as const,
      label: 'Search',
      placeholder: 'Search incidents…',
    },
    {
      key: 'status',
      type: 'select' as const,
      label: 'Status',
      options: [
        { label: 'Open', value: 'open' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Resolved', value: 'resolved' },
        { label: 'Closed', value: 'closed' },
      ],
    },
    {
      key: 'priority',
      type: 'select' as const,
      label: 'Priority',
      options: [
        { label: 'Critical', value: 'critical' },
        { label: 'High', value: 'high' },
        { label: 'Medium', value: 'medium' },
        { label: 'Low', value: 'low' },
      ],
    },
  ]

  return (
    <div className="space-y-8">
      {/* ── Page Header ──────────────────────────────── */}
      <PageHeader
        title="Component Showcase"
        description="Phase 3 reusable component library — demonstration and testing page."
        icon={Package}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Showcase' },
        ]}
        actions={
          <Button variant="outline" onClick={() => setShowTable((p) => !p)}>
            {showTable ? 'Hide Table' : 'Show Table'}
          </Button>
        }
      />

      {/* ── StatusBadge ─────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">StatusBadge</h2>
        <div className="flex flex-wrap gap-2">
          {[
            'new', 'assigned', 'in_progress', 'resolved', 'closed',
            'critical', 'high', 'medium', 'low',
            'pending', 'approved', 'rejected',
            'open', 'fulfilled', 'cancelled',
            'on_track', 'at_risk', 'breached',
            'available', 'assigned_asset', 'maintenance', 'retired',
            'active', 'inactive', 'blocked', 'pending_invite',
          ].map((s) => (
            <StatusBadge key={s} status={s} className="capitalize">
              {s.replace(/_/g, ' ')}
            </StatusBadge>
          ))}
        </div>
      </section>

      {/* ── EmptyState ─────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">EmptyState</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <EmptyState
            preset="generic"
            action={{ label: 'Create new', onClick: () => {} }}
          />
          <EmptyState
            preset="search"
            action={{ label: 'Clear search', onClick: () => {} }}
          />
          <EmptyState
            preset="inbox"
            description="Check back later for new notifications."
            action={{ label: 'Refresh', onClick: () => {} }}
          />
        </div>
      </section>

      {/* ── ErrorState ─────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">ErrorState</h2>
        <ErrorState
          title="Failed to load incidents"
          description="There was a problem fetching the incident list. Check your connection and try again."
          onRetry={() => alert('Retrying…')}
        />
      </section>

      {/* ── LoadingSpinner ─────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">LoadingSpinner</h2>
        <div className="flex items-center gap-6">
          <LoadingSpinner size={16} />
          <LoadingSpinner size={24} label="Loading data…" />
          <LoadingSpinner size={40} />
        </div>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Table skeleton:</p>
          <TableSkeleton rows={4} columns={5} />
        </div>
      </section>

      {/* ── ConfirmDialog ─────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">ConfirmDialog</h2>
        <div className="flex gap-3">
          <Button
            variant="destructive"
            onClick={() => {
              setPendingDelete('INC-001')
              setDeleteDialogOpen(true)
            }}
          >
            Open Confirm Dialog (Destructive)
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setPendingDelete('INC-002')
              setDeleteDialogOpen(true)
            }}
          >
            Open Confirm Dialog (Default)
          </Button>
        </div>

        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title={
            <span className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Delete incident?
            </span>
          }
          description={`Are you sure you want to permanently delete incident ${pendingDelete}? This action cannot be undone.`}
          confirmLabel="Delete"
          confirmVariant="destructive"
          cancelLabel="Keep"
          onConfirm={handleDeleteConfirm}
        />
      </section>

      {/* ── FilterBar ─────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">FilterBar</h2>
        <FilterBar
          fields={filterFields}
          values={filters}
          onChange={handleFilterChange}
          onReset={handleFilterReset}
        />
        <p className="text-sm text-muted-foreground">
          {filteredIncidents.length} incident{filteredIncidents.length !== 1 ? 's' : ''} match the active filters.
        </p>
      </section>

      {/* ── DataTable ─────────────────────────────── */}
      {showTable && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">DataTable (TanStack Table)</h2>
          <DataTable
            columns={columns}
            data={filteredIncidents}
            loading={loading}
            emptyTitle="No incidents found"
            emptyDescription="No incidents match your current filters."
            onRetry={handleFilterReset}
          />
        </section>
      )}

      {/* ── Form demo ─────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Form — React Hook Form + Zod + shadcn
        </h2>
        <div className="max-w-lg rounded-lg border bg-card p-6">
          <Form form={form} onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            {/* Title */}
            <FormItem>
                <FormLabel required>Title</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Brief description of the incident"
                    {...form.register('title')}
                  />
                </FormControl>
                <FormMessage>
                  {form.formState.errors.title?.message}
                </FormMessage>
              </FormItem>

              {/* Status */}
              <FormItem>
                <FormLabel required>Status</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={(v) => form.setValue('status', v)}
                    value={form.watch('status')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage>
                  {form.formState.errors.status?.message}
                </FormMessage>
              </FormItem>

              {/* Priority */}
              <FormItem>
                <FormLabel required>Priority</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={(v) => form.setValue('priority', v)}
                    value={form.watch('priority')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage>
                  {form.formState.errors.priority?.message}
                </FormMessage>
              </FormItem>

              {/* Assignee */}
              <FormItem>
                <FormLabel required>Assignee</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={(v) => form.setValue('assignee', v)}
                    value={form.watch('assignee')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Alice Chen">Alice Chen</SelectItem>
                      <SelectItem value="Bob Kim">Bob Kim</SelectItem>
                      <SelectItem value="Carol Lee">Carol Lee</SelectItem>
                      <SelectItem value="Dave Park">Dave Park</SelectItem>
                      <SelectItem value="Eve Liu">Eve Liu</SelectItem>
                      <SelectItem value="Frank Wu">Frank Wu</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage>
                  {form.formState.errors.assignee?.message}
                </FormMessage>
              </FormItem>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={formLoading}>
                  {formLoading ? 'Creating…' : 'Create Incident'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset()}
                >
                  Reset
                </Button>
              </div>
          </Form>
        </div>
      </section>
    </div>
  )
}
