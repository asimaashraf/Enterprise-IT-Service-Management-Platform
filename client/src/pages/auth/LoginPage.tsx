import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDispatch, useSelector } from 'react-redux'
import { Loader2, LogIn, AlertTriangle, AlertCircle, AlertOctagon, HardDrive, Clock, BookOpen } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { loginThunk, resendVerificationThunk, clearError, type AppDispatch, type RootState } from '@/store'

const loginSchema = z.object({
  email: z.string().min(1, 'Email address is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormValues = z.infer<typeof loginSchema>

const FEATURES = [
  { label: 'Incidents', icon: AlertTriangle },
  { label: 'Assets', icon: HardDrive },
  { label: 'SLA Management', icon: Clock },
  { label: 'Knowledge Base', icon: BookOpen },
]

const CAPABILITIES = ['Secure', 'Multi-tenant', 'Role-based access']

export function LoginPage() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const location = useLocation()
  const { status, error } = useSelector((state: RootState) => state.auth)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })
  const emailValue = watch('email')

  useEffect(() => {
    dispatch(clearError())
  }, [dispatch])

  useEffect(() => {
    if (status === 'authenticated') {
      const to = (location.state as { from?: { pathname?: string } } | null)
        ?.from?.pathname ?? '/'
      navigate(to, { replace: true })
    }
  }, [status, navigate, location.state])

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true)
    const result = await dispatch(loginThunk(values))
    setSubmitting(false)
    if (loginThunk.fulfilled.match(result)) {
      toast.success(`Welcome back, ${result.payload.user.name.split(' ')[0]}`)
    } else {
      toast.error(result.payload?.responseMessage ?? 'Sign in failed')
    }
  })

  // Allow the user to re-trigger the verification email from the unverified-error banner.
  // Uses the email currently in the Work Email field; backend returns the same generic
  // success for unverified, verified, and unknown accounts, so we never expose
  // whether an unrelated/nonexistent account exists.
  const [resending, setResending] = useState(false)
  const handleResendVerification = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    const trimmed = (emailValue ?? '').trim()
    if (!trimmed) {
      toast.error('Enter your email above before requesting a new link.')
      return
    }
    setResending(true)
    const result = await dispatch(resendVerificationThunk({ email: trimmed }))
    setResending(false)
    if (resendVerificationThunk.fulfilled.match(result)) {
      toast.success('Verification email sent. Please check your inbox.')
    } else {
      toast.error(result.payload?.responseMessage ?? 'Could not resend verification email')
    }
  }

  // Detect the unverified-email error from the backend.
  const isUnverified = error?.toLowerCase().includes('verify')

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
              Welcome back
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to access your ITSM workspace.
            </p>
          </div>

          <form onSubmit={onSubmit} noValidate className="space-y-4">
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
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary hover:underline underline-offset-2"
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                placeholder="Your password"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
                disabled={submitting}
                {...register('password')}
              />
              {errors.password && (
                <p
                  id="password-error"
                  role="alert"
                  className="flex items-center gap-1 text-xs text-destructive"
                >
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Unverified email banner with resend action */}
            {isUnverified && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/8 px-3.5 py-3"
              >
                <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
                <div className="flex-1 space-y-1.5">
                  <p className="text-sm text-destructive">{error}</p>
                  <button
                    type="button"
                    disabled={resending}
                    onClick={handleResendVerification}
                    className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-60"
                  >
                    {resending ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                        Sending…
                      </>
                    ) : (
                      'Resend verification email'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Generic API error (non-verification) */}
            {!isUnverified && error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/8 px-3.5 py-3"
              >
                <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              className="mt-2 h-10 w-full gap-1.5 font-medium shadow-sm"
              disabled={submitting || status === 'loading'}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" aria-hidden />
                  Sign in
                </>
              )}
            </Button>
          </form>

          {/* Sign-up messaging — invitations only */}
          <p className="mt-5 text-center text-sm text-muted-foreground">
            New to ITSM Platform?{' '}
            <span className="text-foreground">
              Ask your administrator for an invitation.
            </span>
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}
