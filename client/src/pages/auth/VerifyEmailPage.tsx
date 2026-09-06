import { useEffect, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { MailCheck, AlertOctagon, Loader2, MailPlus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthLayout } from '@/components/auth/AuthLayout'
import {
  verifyEmailThunk,
  resendVerificationThunk,
  clearError,
  type AppDispatch,
  type RootState,
} from '@/store'

const FEATURES = [
  { label: 'Incidents', icon: MailCheck },
  { label: 'Assets', icon: MailCheck },
  { label: 'SLA Management', icon: MailCheck },
  { label: 'Knowledge Base', icon: MailCheck },
]
const CAPABILITIES = ['Secure', 'Multi-tenant', 'Role-based access']

type Status = 'verifying' | 'success' | 'failed' | 'awaiting'

export function VerifyEmailPage() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { error } = useSelector((state: RootState) => state.auth)
  const [status, setStatus] = useState<Status>('awaiting')
  const [resendEmail, setResendEmail] = useState('')
  const [resending, setResending] = useState(false)

  const token = searchParams.get('token') ?? ''

  useEffect(() => {
    dispatch(clearError())
  }, [dispatch])

  useEffect(() => {
    if (!token) {
      setStatus('failed')
      return
    }
    setStatus('verifying')
    let cancelled = false
    dispatch(verifyEmailThunk({ token })).then((result) => {
      if (cancelled) return
      if (verifyEmailThunk.fulfilled.match(result)) {
        setStatus('success')
        toast.success(result.payload)
      } else {
        setStatus('failed')
      }
    })
    return () => {
      cancelled = true
    }
  }, [token, dispatch])

  const onResend = async () => {
    if (!resendEmail) return
    setResending(true)
    const result = await dispatch(
      resendVerificationThunk({ email: resendEmail }),
    )
    setResending(false)
    if (resendVerificationThunk.fulfilled.match(result)) {
      toast.success('If that address is registered and unverified, a new link has been sent.')
    } else {
      toast.error(result.payload?.responseMessage ?? 'Could not resend email')
    }
  }

  return (
    <AuthLayout
      brandHeading="Confirm your email to get started."
      brandSubheading="Verifying your email address activates your account and unlocks sign-in. The link in your email is single-use and expires automatically."
      features={FEATURES}
      capabilities={CAPABILITIES}
    >
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="p-7">
          <div className="mb-6">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Verify your email
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              We&apos;ll activate your account as soon as the link is confirmed.
            </p>
          </div>

          {status === 'verifying' && (
            <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-3.5 py-3 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
              <p className="text-muted-foreground">Verifying your link…</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div
                role="status"
                className="flex items-start gap-2.5 rounded-md border border-primary/20 bg-primary/5 px-3.5 py-3"
              >
                <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <p className="text-sm text-foreground">
                  Your email is verified. You can now sign in.
                </p>
              </div>
              <Button
                onClick={() => navigate('/login', { replace: true })}
                className="h-10 w-full"
              >
                Continue to sign in
              </Button>
            </div>
          )}

          {status === 'failed' && (
            <div className="space-y-5">
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-md border border-destructive/40 bg-destructive/8 px-3.5 py-3"
              >
                <AlertOctagon
                  className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
                  aria-hidden
                />
                <p className="text-sm text-destructive">
                  {error ?? 'This verification link is invalid or has expired.'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resendEmail" className="text-sm font-medium text-foreground">
                  Resend to a different email
                </Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="resendEmail"
                    type="email"
                    placeholder="you@company.com"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    disabled={resending}
                    className="h-10"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onResend}
                    disabled={resending || !resendEmail}
                    className="h-10 gap-1.5 sm:w-auto"
                  >
                    {resending ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <MailPlus className="h-4 w-4" aria-hidden />
                    )}
                    Resend link
                  </Button>
                </div>
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
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
