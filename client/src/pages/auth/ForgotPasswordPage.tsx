import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDispatch, useSelector } from 'react-redux'
import { Loader2, KeyRound, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { forgotPasswordThunk, clearError, type AppDispatch, type RootState } from '@/store'

const forgotSchema = z.object({
  email: z.string().min(1, 'Email address is required').email('Enter a valid email address'),
})

type ForgotFormValues = z.infer<typeof forgotSchema>

const FEATURES = [
  { label: 'Incidents', icon: KeyRound },
  { label: 'Assets', icon: KeyRound },
  { label: 'SLA Management', icon: KeyRound },
  { label: 'Knowledge Base', icon: KeyRound },
]
const CAPABILITIES = ['Secure', 'Multi-tenant', 'Role-based access']

export function ForgotPasswordPage() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { error } = useSelector((state: RootState) => state.auth)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  })

  useEffect(() => {
    dispatch(clearError())
  }, [dispatch])

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true)
    const result = await dispatch(forgotPasswordThunk({ email: values.email }))
    setSubmitting(false)
    if (forgotPasswordThunk.fulfilled.match(result)) {
      setDone(true)
      toast.success('Check your email for a reset link.')
    } else {
      toast.error(result.payload?.responseMessage ?? 'Request failed')
    }
  })

  return (
    <AuthLayout
      brandHeading="Reset your password securely."
      brandSubheading="Enter your email and we'll send you a secure, single-use link to choose a new password. The link expires in 1 hour."
      features={FEATURES}
      capabilities={CAPABILITIES}
    >
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="p-7">
          <div className="mb-6">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Forgot your password?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              We&apos;ll send a reset link to your registered email address.
            </p>
          </div>

          {done ? (
            <div className="space-y-4">
              <div
                role="status"
                className="flex items-start gap-2.5 rounded-md border border-primary/20 bg-primary/5 px-3.5 py-3"
              >
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Reset link sent</p>
                  <p className="text-xs text-muted-foreground">
                    If an account with that email is registered, a reset link has been sent.
                    It expires in 1 hour. Check your spam folder if it doesn&apos;t arrive.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate('/login', { replace: true })}
                className="h-10 w-full"
              >
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={onSubmit} noValidate className="space-y-4">
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

                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/8 px-3.5 py-3"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
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
                      Sending…
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4" aria-hidden />
                      Send reset link
                    </>
                  )}
                </Button>
              </form>

              <p className="mt-5 text-center text-sm text-muted-foreground">
                Remember your password?{' '}
                <Link
                  to="/login"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </AuthLayout>
  )
}
