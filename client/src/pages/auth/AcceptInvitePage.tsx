import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Loader2,
  UserPlus,
  AlertCircle,
  AlertOctagon,
  Building2,
  Info,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { invitationApi } from '@/lib/userApi'
import type { InvitationValidation } from '@/types/auth'

const acceptSchema = z
  .object({
    name: z.string().min(2, 'Full name must be at least 2 characters'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Please confirm your password'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

type AcceptFormValues = z.infer<typeof acceptSchema>

const FEATURES = [
  { label: 'Incidents', icon: AlertCircle },
  { label: 'Assets', icon: Building2 },
  { label: 'SLA Management', icon: Info },
  { label: 'Knowledge Base', icon: Info },
]

const CAPABILITIES = ['Secure', 'Multi-tenant', 'Role-based access']

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''
  const [accepted, setAccepted] = useState<{
    name: string
    email: string
  } | null>(null)

  // ==========================================
  // VALIDATE INVITATION
  // ==========================================

  const validationQuery = useQuery<InvitationValidation, Error>({
    queryKey: ['invitation-validate', token],
    queryFn: () => invitationApi.validate(token),
    enabled: Boolean(token),
    retry: false,
    staleTime: 1000 * 60,
  })

  // ==========================================
  // FORM
  // ==========================================

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AcceptFormValues>({
    resolver: zodResolver(acceptSchema),
    defaultValues: { name: '', password: '', confirmPassword: '' },
  })

  const acceptMutation = useMutation({
    mutationFn: (vars: { name: string; password: string }) =>
      invitationApi.accept({ token, name: vars.name, password: vars.password }),
    onSuccess: (data) => {
      setAccepted({ name: data.user.name, email: data.user.email })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Could not accept invitation')
    },
  })

  useEffect(() => {
    // If the token is missing entirely, surface a clear error.
    if (!token) {
      // no-op; the rendered "no token" branch handles this.
    }
  }, [token])

  // ==========================================
  // RENDER: missing token
  // ==========================================

  if (!token) {
    return (
      <AuthLayout
        brandHeading="Join your team's ITSM workspace."
        brandSubheading="Invitations are sent to your work email by an administrator. Use the link in the email to get started."
        features={FEATURES}
        capabilities={CAPABILITIES}
      >
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="p-7">
            <div className="mb-4">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Invalid invitation
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                This page requires an invitation link. Please use the link from
                your invitation email.
              </p>
            </div>
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/8 px-3.5 py-3"
            >
              <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
              <p className="text-sm text-destructive">
                No invitation token was found in the URL.
              </p>
            </div>
            <Button
              onClick={() => navigate('/login', { replace: true })}
              className="mt-5 h-10 w-full"
            >
              Back to sign in
            </Button>
          </div>
        </div>
      </AuthLayout>
    )
  }

  // ==========================================
  // RENDER: success state
  // ==========================================

  if (accepted) {
    return (
      <AuthLayout
        brandHeading="You're part of the team."
        brandSubheading="Your account has been created. Sign in to access your ITSM workspace."
        features={FEATURES}
        capabilities={CAPABILITIES}
      >
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="p-7">
            <div className="mb-4">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Account created
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Welcome, <strong>{accepted.name}</strong>. Your account is ready.
              </p>
            </div>
            <div
              role="status"
              className="flex items-start gap-2.5 rounded-md border border-primary/20 bg-primary/5 px-3.5 py-3"
            >
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Sign in to continue
                </p>
                <p className="text-xs text-muted-foreground">
                  You can now sign in with <strong>{accepted.email}</strong> and
                  the password you just created.
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/login', { replace: true })}
              className="mt-5 h-10 w-full"
            >
              Go to sign in
            </Button>
          </div>
        </div>
      </AuthLayout>
    )
  }

  // ==========================================
  // RENDER: validation pending
  // ==========================================

  if (validationQuery.isLoading) {
    return (
      <AuthLayout
        brandHeading="Join your team's ITSM workspace."
        brandSubheading="Validating your invitation…"
        features={FEATURES}
        capabilities={CAPABILITIES}
      >
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2 p-7 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Checking your invitation…
          </div>
        </div>
      </AuthLayout>
    )
  }

  // ==========================================
  // RENDER: validation error
  // ==========================================

  if (validationQuery.isError || !validationQuery.data) {
    const message =
      (validationQuery.error as Error | null)?.message ??
      'This invitation is no longer valid.'
    return (
      <AuthLayout
        brandHeading="This invitation is no longer valid."
        brandSubheading="Please contact the administrator who invited you to receive a new link."
        features={FEATURES}
        capabilities={CAPABILITIES}
      >
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="p-7">
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/8 px-3.5 py-3"
            >
              <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
              <p className="text-sm text-destructive">{message}</p>
            </div>
            <Button
              onClick={() => navigate('/login', { replace: true })}
              className="mt-5 h-10 w-full"
            >
              Back to sign in
            </Button>
          </div>
        </div>
      </AuthLayout>
    )
  }

  const invitation = validationQuery.data

  // ==========================================
  // RENDER: accept form
  // ==========================================

  const onSubmit = handleSubmit(async (values) => {
    acceptMutation.mutate({ name: values.name, password: values.password })
  })

  return (
    <AuthLayout
      brandHeading="Join your team's ITSM workspace."
      brandSubheading="You've been invited to join your organization's ITSM platform. Set a name and password to activate your account."
      features={FEATURES}
      capabilities={CAPABILITIES}
    >
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="p-7">
          <div className="mb-6">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Accept invitation
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You're joining{' '}
              <span className="font-medium text-foreground">
                {invitation.organizationName}
              </span>
              .
            </p>
          </div>

          {/* Invitation summary */}
          <div
            role="note"
            className="mb-5 flex items-start gap-2.5 rounded-md border border-primary/20 bg-primary/5 px-3.5 py-3"
          >
            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <div className="space-y-1 text-sm">
              <p className="text-foreground">
                <span className="text-muted-foreground">Organization: </span>
                <strong>{invitation.organizationName}</strong>
              </p>
              <p className="text-foreground">
                <span className="text-muted-foreground">Email: </span>
                <strong>{invitation.email}</strong>
              </p>
              <p className="text-foreground">
                <span className="text-muted-foreground">Role: </span>
                <strong>
                  {invitation.role === 'admin' ? 'Administrator' : 'Employee'}
                </strong>
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium text-foreground">
                Full name
              </Label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Jane Doe"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
                disabled={acceptMutation.isPending}
                className="h-10"
                {...register('name')}
              />
              {errors.name && (
                <p
                  id="name-error"
                  role="alert"
                  className="flex items-center gap-1 text-xs text-destructive"
                >
                  <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email-readonly" className="text-sm font-medium text-foreground">
                Work email
              </Label>
              <Input
                id="email-readonly"
                type="email"
                readOnly
                value={invitation.email}
                className="h-10 bg-muted/40 text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">
                This email is set by the invitation and cannot be changed here.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </Label>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                placeholder="At least 6 characters"
                aria-invalid={!!errors.password}
                aria-describedby={
                  errors.password ? 'password-error' : 'password-hint'
                }
                disabled={acceptMutation.isPending}
                {...register('password')}
              />
              {errors.password ? (
                <p
                  id="password-error"
                  role="alert"
                  className="flex items-center gap-1 text-xs text-destructive"
                >
                  <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
                  {errors.password.message}
                </p>
              ) : (
                <p id="password-hint" className="text-xs text-muted-foreground">
                  Minimum 6 characters.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                Confirm password
              </Label>
              <PasswordInput
                id="confirmPassword"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={
                  errors.confirmPassword ? 'confirm-error' : undefined
                }
                disabled={acceptMutation.isPending}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p
                  id="confirm-error"
                  role="alert"
                  className="flex items-center gap-1 text-xs text-destructive"
                >
                  <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {acceptMutation.isError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/8 px-3.5 py-3"
              >
                <AlertOctagon
                  className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
                  aria-hidden
                />
                <p className="text-sm text-destructive">
                  {(acceptMutation.error as Error | null)?.message ??
                    'Could not accept invitation'}
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="mt-2 h-10 w-full gap-1.5 font-medium shadow-sm"
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Creating account…
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" aria-hidden />
                  Activate account
                </>
              )}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}
