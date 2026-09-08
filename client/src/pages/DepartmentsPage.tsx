import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Building2, Pencil, Plus, Trash2 } from 'lucide-react'
import { DepartmentDialog } from '@/components/departments/department-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { useDepartments, useDepartmentMutation } from '@/hooks/useDepartments'
import { useSettingsScope } from '@/hooks/useSettingsScope'
import { settingsError } from '@/lib/settingsApi'
import type { Department } from '@/types/department'

function DepartmentManagement() {
  const query = useDepartments()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [editor, setEditor] = useState<{
    department: Department | null
  } | null>(null)
  const [deleting, setDeleting] = useState<Department | null>(null)
  const mutation = useDepartmentMutation(() => setDeleting(null))
  const departments = query.data ?? []
  const term = search.trim().toLocaleLowerCase()
  const filtered = departments.filter(
    (department) =>
      (status === 'all' || department.isActive === (status === 'active')) &&
      `${department.name} ${department.description ?? ''}`
        .toLocaleLowerCase()
        .includes(term),
  )
  const actions = (department: Department) => (
    <div className="flex flex-wrap items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        disabled={mutation.isPending}
        onClick={() =>
          mutation.mutate({
            kind: 'update',
            id: department._id,
            payload: { isActive: !department.isActive },
          })
        }
        aria-label={`${department.isActive ? 'Deactivate' : 'Activate'} ${department.name}`}
      >
        {department.isActive ? 'Deactivate' : 'Activate'}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        disabled={mutation.isPending}
        aria-label={`Edit ${department.name}`}
        onClick={() => setEditor({ department })}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        disabled={mutation.isPending}
        className="text-destructive hover:text-destructive"
        aria-label={`Delete ${department.name}`}
        onClick={() => {
          mutation.reset()
          setDeleting(department)
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
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
        title="Departments"
        description="Manage departments within your organization."
        icon={Building2}
        actions={
          <Button
            disabled={mutation.isPending}
            onClick={() => setEditor({ department: null })}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create department
          </Button>
        }
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="department-search">Search departments</Label>
          <Input
            id="department-search"
            placeholder="Search by name or description…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="space-y-2 sm:w-44">
          <Label htmlFor="department-status">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="department-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {query.isPending ? (
        <div className="rounded-lg border p-8">
          <LoadingSpinner label="Loading departments" />
        </div>
      ) : query.isError ? (
        <ErrorState
          description={settingsError(query.error)}
          onRetry={() => query.refetch()}
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground" role="status">
            {filtered.length} of {departments.length} departments ·{' '}
            {departments.filter((department) => department.isActive).length}{' '}
            active
          </p>
          {filtered.length === 0 ? (
            <EmptyState
              title={
                departments.length
                  ? 'No matching departments'
                  : 'No departments yet'
              }
              description={
                departments.length
                  ? 'Try a different search or status filter.'
                  : 'Create a department to get started.'
              }
              action={
                departments.length
                  ? {
                      label: 'Clear filters',
                      onClick: () => {
                        setSearch('')
                        setStatus('all')
                      },
                    }
                  : {
                      label: 'Create department',
                      onClick: () => setEditor({ department: null }),
                    }
              }
            />
          ) : (
            <>
              <div className="hidden rounded-lg border lg:block">
                <Table className="table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/4">Department</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead className="w-56">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((department) => (
                      <TableRow key={department._id}>
                        <TableCell className="whitespace-normal break-words font-medium">
                          {department.name}
                        </TableCell>
                        <TableCell className="whitespace-pre-wrap break-words text-muted-foreground">
                          {department.description || 'No description'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={department.isActive ? 'active' : 'inactive'}
                          />
                        </TableCell>
                        <TableCell>{actions(department)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
                {filtered.map((department) => (
                  <Card key={department._id}>
                    <CardContent className="space-y-3 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h2 className="min-w-0 break-words font-semibold">
                          {department.name}
                        </h2>
                        <StatusBadge
                          status={department.isActive ? 'active' : 'inactive'}
                        />
                      </div>
                      <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                        {department.description || 'No description'}
                      </p>
                      {actions(department)}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}
      {editor && (
        <DepartmentDialog
          department={editor.department}
          onClose={() => setEditor(null)}
        />
      )}
      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open && !mutation.isPending) setDeleting(null)
        }}
      >
        <AlertDialogContent className="max-h-[90dvh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete department?</AlertDialogTitle>
            <AlertDialogDescription className="break-words">
              This permanently deletes “{deleting?.name}”. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {mutation.isError && (
            <p role="alert" className="text-sm text-destructive">
              {settingsError(mutation.error)}
            </p>
          )}
          <AlertDialogFooter>
            <Button
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => setDeleting(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={mutation.isPending}
              onClick={() => {
                if (deleting)
                  mutation.mutate({ kind: 'delete', id: deleting._id })
              }}
            >
              {mutation.isPending ? 'Deleting…' : 'Delete department'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export function DepartmentsPage() {
  const scope = useSettingsScope()
  if (!scope.isAdmin) return null
  return <DepartmentManagement key={JSON.stringify(scope.key)} />
}
