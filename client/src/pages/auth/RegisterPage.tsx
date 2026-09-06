import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDispatch, useSelector } from 'react-redux'
import { Loader2, UserPlus, AlertCircle, AlertOctagon, Info, AlertTriangle, HardDrive, Clock, BookOpen, MailCheck } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { registerAndVerifyThunk, clearError, type AppDispatch, type RootState } from '@/store'

const registerSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().min(1, 'Email address is required').email('Enter a valid email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters'),
  organizationId: z
    .string()
    .min(1, 'Organization ID is required')
    .regex(/^[a-fA-F0-9]{24}$/, 'Enter a valid 24-character Organization ID'),
})

type RegisterFormValues = z.infer<typeof registerSchema>

const FEATURES = [
  { label: 'Incidents', icon: AlertTriangle },
  { label: 'Assets', icon: HardDrive },
  { label: 'SLA Management', icon: Clock },
  { label: 'Knowledge Base', icon: BookOpen },
]

const CAPABILITIES = ['Secure', 'Multi-tenant', 'Role-based access']

export function RegisterPage() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { error } = useSelector((state: RootState) => state.auth)
  const [submitting, setSubmitting] = useState(false)
  const [createdEmail, setCreatedEmail] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', organizationId: '' },
  })

  useEffect(() => {
    dispatch(clearError())
  }, [dispatch])

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true)
    const result = await dispatch(registerAndVerifyThunk(values))
    setSubmitting(false)
    if (registerAndVerifyThunk.fulfilled.match(result)) {
      setCreatedEmail(values.email)
    } else {
      toast.error(result.payload?.responseMessage ?? 'Registration failed')
    }
  })

  if (createdEmail) {
    return (
      <AuthLayout
        brandHeading="You're almost there."
        brandSubheading="Your account has been created. To keep your workspace secure, we verify every new sign-in by email."
        features={FEATURES}
        capabilities={CAPABILITIES}
      >
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="p-7">
            <div className="mb-6">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Check your email
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                We&apos;ve sent a verification link to{' '}
                <span className="font-medium text-foreground">{createdEmail}</span>.
              </p>
            </div>

            <div
              role="status"
              className="flex items-start gap-2.5 rounded-md border border-primary/20 bg-primary/5 px-3.5 py-3"
            >
              <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Verify your email to sign in
                </p>
                <p className="text-xs text-muted-foreground">
                  Click the link in the email to activate your account. The link expires
                  in 24 hours. If you don&apos;t see the email, check your spam folder.
                </p>
              </div>
            </div>

            <Button
              onClick={() => navigate('/login', { replace: true })}
              className="mt-5 h-10 w-full"
            >
              Back to sign in
            </Button>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Wrong address?{' '}
              <button
                type="button"
                onClick={() => {
                  setCreatedEmail(null)
                  dispatch(clearError())
                }}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Register again
              </button>
            </p>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      brandHeading="Manage IT operations from one workspace."
      brandSubheading={
        'Centralize incidents, service requests, assets, SLA tracking, change management, ' +
        'and the knowledge base — built for enterprise IT teams who need structure, visibility, and control.'
      }
      features={FEATURES}
      capabilities={CAPABILITIES}
    >
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="p-7">
          {/* Heading */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Create your account
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Join your organization&apos;s ITSM workspace.
            </p>
          </div>

          <form onSubmit={onSubmit} noValidate className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium text-foreground">
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Jane Doe"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
                disabled={submitting}
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

            {/* Work Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Work Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
                disabled={submitting}
                className="h-10"
                {...register('email')}
              />
              {errors.email && (
                <p
                  id="email-error"
                  role="alert"
                  className="flex items-center gap-1 text-xs text-destructive"
                >
                  <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
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
                disabled={submitting}
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

            {/* Organization ID */}
            <div className="space-y-1.5">
              <Label htmlFor="organizationId" className="text-sm font-medium text-foreground">
                Organization ID
              </Label>
              <Input
                id="organizationId"
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="e.g. 507f1f77bcf86cd799439011"
                aria-invalid={!!errors.organizationId}
                aria-describedby={
                  errors.organizationId
                    ? 'orgId-error'
                    : 'orgId-hint'
                }
                disabled={submitting}
                className="h-10 font-mono text-xs tracking-wider"
                {...register('organizationId')}
              />
              {errors.organizationId ? (
                <p
                  id="orgId-error"
                  role="alert"
                  className="flex items-center gap-1 text-xs text-destructive"
                >
                  <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
                  {errors.organizationId.message}
                </p>
              ) : (
                <p id="orgId-hint" className="text-xs text-muted-foreground">
                  24-character Organization ID
                </p>
              )}
            </div>

            {/* Info box */}
            <div
              role="note"
              className="flex items-start gap-2.5 rounded-md border border-primary/20 bg-primary/5 px-3.5 py-3"
            >
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Enter the Organization ID provided by your administrator.
                New registrations are automatically created as{' '}
                <strong className="font-medium text-foreground">employee</strong>{' '}
                accounts and must verify their email before signing in.
              </p>
            </div>

            {/* API error */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/8 px-3.5 py-3"
              >
                <AlertOctagon
                  className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
                  aria-hidden
                />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              className="mt-2 h-10 w-full gap-1.5 font-medium shadow-sm"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Creating account…
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" aria-hidden />
                  Create account
                </>
              )}
            </Button>
          </form>

          {/* Sign in link */}
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
