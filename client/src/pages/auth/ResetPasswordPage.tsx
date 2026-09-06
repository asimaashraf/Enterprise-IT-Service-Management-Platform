import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDispatch, useSelector } from 'react-redux'
import { Loader2, KeyRound, AlertCircle, AlertOctagon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { resetPasswordThunk, clearError, type AppDispatch, type RootState } from '@/store'

const resetSchema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ResetFormValues = z.infer<typeof resetSchema>

const FEATURES = [
  { label: 'Incidents', icon: KeyRound },
  { label: 'Assets', icon: KeyRound },
  { label: 'SLA Management', icon: KeyRound },
  { label: 'Knowledge Base', icon: KeyRound },
]
const CAPABILITIES = ['Secure', 'Multi-tenant', 'Role-based access']

export function ResetPasswordPage() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { error } = useSelector((state: RootState) => state.auth)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const token = searchParams.get('token') ?? ''

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  useEffect(() => {
    dispatch(clearError())
  }, [dispatch])

  const onSubmit = handleSubmit(async (values) => {
    if (!token) return
    setSubmitting(true)
    const result = await dispatch(
      resetPasswordThunk({ token, password: values.password }),
    )
    setSubmitting(false)
    if (resetPasswordThunk.fulfilled.match(result)) {
      setDone(true)
      toast.success('Password reset successfully.')
    } else {
      toast.error(result.payload?.responseMessage ?? 'Password reset failed')
    }
  })

  if (!token) {
    return (
      <AuthLayout
        brandHeading="Choose a new password."
        brandSubheading="Enter your new password below to regain access to your account."
        features={FEATURES}
        capabilities={CAPABILITIES}
      >
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="p-7">
            <div className="mb-6">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Invalid reset link
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                This link is missing the reset token.
              </p>
            </div>
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-md border border-destructive/40 bg-destructive/8 px-3.5 py-3"
            >
              <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
              <p className="text-sm text-destructive">
                Open the link directly from your email or request a new one.
              </p>
            </div>
            <p className="mt-5 text-center text-sm text-muted-foreground">
              <Link
                to="/forgot-password"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Request a new link
              </Link>
            </p>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      brandHeading="Choose a new password."
      brandSubheading="Enter your new password below to regain access to your account. This reset link is single-use and expires in 1 hour."
      features={FEATURES}
      capabilities={CAPABILITIES}
    >
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="p-7">
          <div className="mb-6">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Reset your password
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Set a new password for your account.
            </p>
          </div>

          {done ? (
            <div className="space-y-4">
              <div
                role="status"
                className="flex items-start gap-2.5 rounded-md border border-primary/20 bg-primary/5 px-3.5 py-3"
              >
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <p className="text-sm text-foreground">
                  Your password has been reset. You can now sign in.
                </p>
              </div>
              <Button
                onClick={() => navigate('/login', { replace: true })}
                className="h-10 w-full"
              >
                Continue to sign in
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  New Password
                </Label>
                <PasswordInput
                  id="password"
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : 'password-hint'}
                  disabled={submitting}
                  {...register('password')}
                />
                {errors.password ? (
                  <p
                    id="password-error"
                    role="alert"
                    className="flex items-center gap-1 text-xs text-destructive"
                  >
                    <AlertCircle className="h-3 w-3 shrink-0" />
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
                  Confirm Password
                </Label>
                <PasswordInput
                  id="confirmPassword"
                  autoComplete="new-password"
                  placeholder="Re-enter your new password"
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={
                    errors.confirmPassword ? 'confirm-error' : undefined
                  }
                  disabled={submitting}
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p
                    id="confirm-error"
                    role="alert"
                    className="flex items-center gap-1 text-xs text-destructive"
                  >
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/8 px-3.5 py-3"
                >
                  <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="mt-2 h-10 w-full gap-1.5 font-medium shadow-sm"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Resetting…
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" aria-hidden />
                    Reset password
                  </>
                )}
              </Button>
            </form>
          )}

          <p className="mt-5 text-center text-sm text-muted-foreground">
            <Link
              to="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}
