import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import {
  Loader2,
  Users,
  ShieldCheck,
  UserPlus,
  ShieldAlert,
  Mail,
  Search,
  AlertOctagon,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useSelector } from 'react-redux'

import { userApi, invitationApi } from '@/lib/userApi'
import type { RootState } from '@/store'
import type { InvitationDetail, UserListItem, UserRole } from '@/types/auth'

type StatusFilter = 'all' | 'active' | 'inactive'

function StatusBadge({ user }: { user: UserListItem }) {
  if (!user.isActive) {
    return <Badge variant="destructive">Disabled</Badge>
  }
  return (
    <Badge variant="secondary" className="bg-green-100 text-green-800">
      Active
    </Badge>
  )
}

function RoleBadge({ role }: { role: UserRole }) {
  if (role === 'admin') {
    return <Badge variant="default">Admin</Badge>
  }
  return <Badge variant="outline">Employee</Badge>
}

function VerificationBadge({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
        Verified
      </Badge>
    )
  }
  return <Badge variant="outline">Unverified</Badge>
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function UserManagementPage() {
  const queryClient = useQueryClient()
  const currentUser = useSelector((state: RootState) => state.auth.user)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('employee')

  const [pendingUserAction, setPendingUserAction] = useState<{
    user: UserListItem
    action:
      | 'deactivate'
      | 'activate'
      | 'block'
      | 'make-admin'
      | 'make-employee'
  } | null>(null)

  const [pendingInviteRevoke, setPendingInviteRevoke] =
    useState<InvitationDetail | null>(null)

  // ==========================================
  // DATA FETCHING
  // ==========================================

  const usersQuery = useQuery({
    queryKey: ['users', 'list'],
    queryFn: () => userApi.list(),
  })

  const invitationsQuery = useQuery({
    queryKey: ['invitations', 'list'],
    queryFn: () => invitationApi.list(),
  })

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['users', 'list'] })
    queryClient.invalidateQueries({ queryKey: ['invitations', 'list'] })
  }

  // ==========================================
  // MUTATIONS
  // ==========================================

  const inviteMutation = useMutation({
    mutationFn: (vars: { email: string; role: UserRole }) =>
      invitationApi.create(vars.email, vars.role),
    onSuccess: (data) => {
      toast.success(`Invitation sent to ${data.email}`)
      setShowInvite(false)
      setInviteEmail('')
      setInviteRole('employee')
      queryClient.invalidateQueries({ queryKey: ['invitations', 'list'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to send invitation')
    },
  })

  const revokeInvitationMutation = useMutation({
    mutationFn: (id: string) => invitationApi.revoke(id),
    onSuccess: () => {
      toast.success('Invitation revoked')
      setPendingInviteRevoke(null)
      queryClient.invalidateQueries({ queryKey: ['invitations', 'list'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to revoke invitation')
    },
  })

  const activateMutation = useMutation({
    mutationFn: (id: string) => userApi.activate(id),
    onSuccess: () => {
      toast.success('User activated')
      setPendingUserAction(null)
      invalidateAll()
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to activate user')
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => userApi.deactivate(id),
    onSuccess: () => {
      toast.success('User deactivated')
      setPendingUserAction(null)
      invalidateAll()
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to deactivate user')
    },
  })

  const blockMutation = useMutation({
    mutationFn: (id: string) => userApi.block(id),
    onSuccess: () => {
      toast.success('User blocked')
      setPendingUserAction(null)
      invalidateAll()
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to block user')
    },
  })

  const changeRoleMutation = useMutation({
    mutationFn: (vars: { id: string; role: UserRole }) =>
      userApi.changeRole(vars.id, vars.role),
    onSuccess: (_data, vars) => {
      toast.success(
        vars.role === 'admin'
          ? 'User promoted to admin'
          : 'User demoted to employee',
      )
      setPendingUserAction(null)
      invalidateAll()
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to change role')
    },
  })

  // ==========================================
  // DERIVED DATA
  // ==========================================

  const users = usersQuery.data ?? []
  const invitations = invitationsQuery.data ?? []

  const stats = useMemo(() => {
    const active = users.filter((u) => u.isActive).length
    const admins = users.filter((u) => u.role === 'admin' && u.isActive).length
    const pendingInvites = invitations.filter(
      (i) => i.status === 'pending',
    ).length
    return { total: users.length, active, admins, pendingInvites }
  }, [users, invitations])

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false
      if (statusFilter === 'active' && !u.isActive) return false
      if (statusFilter === 'inactive' && u.isActive) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !u.name.toLowerCase().includes(q) &&
          !u.email.toLowerCase().includes(q)
        ) {
          return false
        }
      }
      return true
    })
  }, [users, search, roleFilter, statusFilter])

  // ==========================================
  // ACTIONS
  // ==========================================

  const performUserAction = () => {
    if (!pendingUserAction) return
    const { user, action } = pendingUserAction
    switch (action) {
      case 'activate':
        activateMutation.mutate(user.id)
        break
      case 'deactivate':
        deactivateMutation.mutate(user.id)
        break
      case 'block':
        blockMutation.mutate(user.id)
        break
      case 'make-admin':
        changeRoleMutation.mutate({ id: user.id, role: 'admin' })
        break
      case 'make-employee':
        changeRoleMutation.mutate({ id: user.id, role: 'employee' })
        break
    }
  }

  const isPerforming =
    activateMutation.isPending ||
    deactivateMutation.isPending ||
    blockMutation.isPending ||
    changeRoleMutation.isPending

  // Reset confirmation dialog when the underlying target changes.
  useEffect(() => {
    if (pendingUserAction && !users.find((u) => u.id === pendingUserAction.user.id)) {
      setPendingUserAction(null)
    }
  }, [users, pendingUserAction])

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage people, access, and invitations for your organization.
          </p>
        </div>
        <Button
          onClick={() => setShowInvite(true)}
          className="h-10 gap-1.5 shadow-sm"
        >
          <UserPlus className="h-4 w-4" aria-hidden />
          Invite Employee
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-muted-foreground">Total Users</p>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-muted-foreground">Active</p>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-muted-foreground">Admins</p>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{stats.admins}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-muted-foreground">
              Pending Invites
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">
              {stats.pendingInvites}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) =>
              setRoleFilter(e.target.value as 'all' | UserRole)
            }
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            aria-label="Filter by role"
          >
            <option value="all">All roles</option>
            <option value="admin">Admin</option>
            <option value="employee">Employee</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Disabled</option>
          </select>
        </div>
      </div>

      {/* Users table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" aria-hidden />
            Organization Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          {usersQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading
              users…
            </div>
          ) : usersQuery.isError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/8 px-3.5 py-3"
            >
              <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
              <p className="text-sm text-destructive">
                {(usersQuery.error as Error)?.message ??
                  'Failed to load users'}
              </p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No users match the current filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Role</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Verification</th>
                    <th className="px-3 py-2 font-medium">Joined</th>
                    <th className="px-3 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const isSelf = currentUser?.id === user.id
                    return (
                      <tr
                        key={user.id}
                        className="border-b last:border-b-0 hover:bg-muted/40"
                      >
                        <td className="px-3 py-3 font-medium text-foreground">
                          {user.name}
                          {isSelf && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (you)
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {user.email}
                        </td>
                        <td className="px-3 py-3">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge user={user} />
                        </td>
                        <td className="px-3 py-3">
                          <VerificationBadge verified={user.isEmailVerified} />
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2"
                                disabled={isSelf}
                                title={
                                  isSelf
                                    ? 'You cannot perform this action on yourself'
                                    : 'Open actions'
                                }
                              >
                                Actions
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Manage</DropdownMenuLabel>
                              {user.role === 'employee' ? (
                                <DropdownMenuItem
                                  onSelect={() =>
                                    setPendingUserAction({
                                      user,
                                      action: 'make-admin',
                                    })
                                  }
                                >
                                  <ShieldCheck className="mr-2 h-4 w-4" /> Promote
                                  to admin
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onSelect={() =>
                                    setPendingUserAction({
                                      user,
                                      action: 'make-employee',
                                    })
                                  }
                                >
                                  <ShieldAlert className="mr-2 h-4 w-4" /> Demote
                                  to employee
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {user.isActive ? (
                                <DropdownMenuItem
                                  onSelect={() =>
                                    setPendingUserAction({
                                      user,
                                      action: 'deactivate',
                                    })
                                  }
                                >
                                  Deactivate
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onSelect={() =>
                                    setPendingUserAction({
                                      user,
                                      action: 'activate',
                                    })
                                  }
                                >
                                  Activate
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onSelect={() =>
                                  setPendingUserAction({ user, action: 'block' })
                                }
                                className="text-destructive focus:text-destructive"
                              >
                                Block / remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending invitations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" aria-hidden />
            Pending Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invitationsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading
              invitations…
            </div>
          ) : invitationsQuery.isError ? (
            <p className="text-sm text-destructive">
              {(invitationsQuery.error as Error)?.message ??
                'Failed to load invitations'}
            </p>
          ) : invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No invitations have been sent yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Role</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Expires</th>
                    <th className="px-3 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b last:border-b-0 hover:bg-muted/40"
                    >
                      <td className="px-3 py-3 text-foreground">{inv.email}</td>
                      <td className="px-3 py-3">
                        <RoleBadge role={inv.role} />
                      </td>
                      <td className="px-3 py-3">
                        <InvitationStatusBadge status={inv.status} />
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {formatDate(inv.expiresAt)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {inv.status === 'pending' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-destructive"
                            onClick={() => setPendingInviteRevoke(inv)}
                          >
                            Revoke
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite dialog */}
      {showInvite && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !inviteMutation.isPending && setShowInvite(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold tracking-tight">
              Invite a new user
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              An invitation email will be sent. The recipient must accept it
              within 48 hours.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!inviteEmail) return
                inviteMutation.mutate({ email: inviteEmail, role: inviteRole })
              }}
              className="mt-4 space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  required
                  placeholder="user@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={inviteMutation.isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-role">Role</Label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  disabled={inviteMutation.isPending}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={inviteMutation.isPending}
                  onClick={() => setShowInvite(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
                    </>
                  ) : (
                    'Send invitation'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User action confirmation dialog */}
      {pendingUserAction && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !isPerforming && setPendingUserAction(null)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <AlertCircle className="h-5 w-5 text-destructive" aria-hidden />
              {pendingUserAction.action === 'block'
                ? 'Block / remove user'
                : pendingUserAction.action === 'deactivate'
                ? 'Deactivate user'
                : pendingUserAction.action === 'activate'
                ? 'Activate user'
                : pendingUserAction.action === 'make-admin'
                ? 'Promote to admin'
                : 'Demote to employee'}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {pendingUserAction.action === 'block'
                ? `${pendingUserAction.user.name} will be removed from active use. Their email will be tombstoned and historical records (incidents, requests, approvals, audit) will be preserved.`
                : pendingUserAction.action === 'deactivate'
                ? `${pendingUserAction.user.name} will no longer be able to sign in.`
                : pendingUserAction.action === 'activate'
                ? `${pendingUserAction.user.name} will regain sign-in access.`
                : pendingUserAction.action === 'make-admin'
                ? `${pendingUserAction.user.name} will be granted administrator privileges.`
                : `${pendingUserAction.user.name} will be demoted to employee.`}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setPendingUserAction(null)}
                disabled={isPerforming}
              >
                Cancel
              </Button>
              <Button
                variant={
                  pendingUserAction.action === 'block' ? 'destructive' : 'default'
                }
                onClick={performUserAction}
                disabled={isPerforming}
              >
                {isPerforming ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  'Confirm'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invitation revoke dialog */}
      {pendingInviteRevoke && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() =>
            !revokeInvitationMutation.isPending && setPendingInviteRevoke(null)
          }
        >
          <div
            className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <AlertCircle className="h-5 w-5 text-destructive" aria-hidden />
              Revoke invitation
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              The invitation to <strong>{pendingInviteRevoke.email}</strong>{' '}
              will be revoked and can no longer be accepted.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setPendingInviteRevoke(null)}
                disabled={revokeInvitationMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  revokeInvitationMutation.mutate(pendingInviteRevoke.id)
                }
                disabled={revokeInvitationMutation.isPending}
              >
                {revokeInvitationMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  'Revoke'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InvitationStatusBadge({
  status,
}: {
  status: InvitationDetail['status']
}) {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
          Pending
        </Badge>
      )
    case 'accepted':
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          Accepted
        </Badge>
      )
    case 'revoked':
      return <Badge variant="destructive">Revoked</Badge>
    case 'expired':
      return <Badge variant="outline">Expired</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}
