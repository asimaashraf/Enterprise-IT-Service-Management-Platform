import { type ReactNode } from 'react'
import { ShieldCheck, Users2, KeyRound, type LucideIcon } from 'lucide-react'

interface AuthLayoutProps {
  /** Heading displayed on the left brand panel. */
  brandHeading: string
  /** Supporting copy below the brand heading. */
  brandSubheading: string
  /** Compact feature highlights (label + icon). */
  features?: Array<{ label: string; icon: LucideIcon }>
  /** Bottom capability indicators. */
  capabilities?: string[]
  /** Authentication card rendered in the right panel. */
  children: ReactNode
}

const DEFAULT_FEATURES: Array<{ label: string; icon: LucideIcon }> = [
  { label: 'Incidents', icon: KeyRound },
  { label: 'Assets', icon: KeyRound },
  { label: 'SLA Management', icon: KeyRound },
  { label: 'Knowledge Base', icon: KeyRound },
]

const DEFAULT_CAPABILITIES = ['Secure', 'Multi-tenant', 'Role-based access']

/**
 * Shared authentication layout used by Login and Register.
 *
 * - Desktop (lg+): 42/58 split. Left panel hosts the brand story;
 *   right panel centers the auth card.
 * - Below lg: only the form panel renders (branding collapses).
 */
export function AuthLayout({
  brandHeading,
  brandSubheading,
  features = DEFAULT_FEATURES,
  capabilities = DEFAULT_CAPABILITIES,
  children,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-background">
      <div className="grid min-h-screen w-full lg:grid-cols-[minmax(0,_42fr)_minmax(0,_58fr)]">
        {/* Brand panel — hidden below lg */}
        <aside className="relative hidden overflow-hidden bg-sidebar text-sidebar-foreground lg:flex">
          {/* Decorative background: indigo glow + grid */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(900px circle at 18% 12%, hsla(243, 75%, 59%, 0.22), transparent 55%),' +
                'radial-gradient(700px circle at 88% 92%, hsla(245, 58%, 41%, 0.20), transparent 60%)',
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(148,163,184,0.18) 1px, transparent 1px),' +
                'linear-gradient(to bottom, rgba(148,163,184,0.18) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
              maskImage:
                'radial-gradient(ellipse 70% 60% at 50% 40%, black 35%, transparent 80%)',
              WebkitMaskImage:
                'radial-gradient(ellipse 70% 60% at 50% 40%, black 35%, transparent 80%)',
            }}
          />

          <div className="relative z-10 flex w-full flex-col justify-between p-8 xl:p-10">
            {/* Top: brand mark */}
            <header className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm shadow-primary/30">
                <span className="text-sm font-bold tracking-wide">IT</span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold tracking-wide">
                  ITSM Platform
                </span>
              </div>
            </header>

            {/* Middle: copy + features */}
            <div className="space-y-7 max-w-md">
              <div className="space-y-3">
                <h1 className="text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-sidebar-foreground xl:text-4xl">
                  {brandHeading}
                </h1>
                <p className="text-sm leading-relaxed text-sidebar-muted xl:text-[0.95rem]">
                  {brandSubheading}
                </p>
              </div>

              <ul className="grid grid-cols-2 gap-2">
                {features.map((feature) => {
                  const Icon = feature.icon
                  return (
                    <li
                      key={feature.label}
                      className="flex items-center gap-2.5 rounded-md border border-sidebar-border bg-sidebar-accent/60 px-3 py-2 text-sm text-sidebar-foreground"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/15 text-primary">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-medium">{feature.label}</span>
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* Bottom: capability indicators */}
            <footer className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {capabilities.map((cap) => (
                  <span
                    key={cap}
                    className="inline-flex items-center gap-1.5 rounded-full border border-sidebar-border bg-sidebar-accent/40 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-sidebar-muted"
                  >
                    <ShieldCheck className="h-3 w-3 text-primary" />
                    {cap}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-sidebar-muted">
                v{import.meta.env.VITE_APP_VERSION || '0.1.0'} • ITSM Platform
              </p>
            </footer>
          </div>
        </aside>

        {/* Form panel */}
        <main className="flex items-center justify-center px-5 py-8 sm:px-8 sm:py-12 lg:py-16">
          <div className="w-full max-w-[460px]">
            {/* Compact mobile brand */}
            <div className="mb-6 flex items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <span className="text-xs font-bold">IT</span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold">ITSM Platform</span>
              </div>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

/**
 * Re-export the Users2 icon so feature highlights can use it without
 * importing lucide-react in every caller. Kept here for the layout
 * consumer's convenience.
 */
export { Users2 }
