import { cn } from '@/lib/utils'

export interface LoadingSpinnerProps {
  /** Size of the spinner in pixels (default 24) */
  size?: number
  /** Custom className */
  className?: string
  /** Optional label shown below the spinner for a11y */
  label?: string
}

/**
 * LoadingSpinner — a simple animated spinner for inline loading states.
 * Uses pure CSS (no external dependencies) to ensure it always renders.
 */
export function LoadingSpinner({
  size = 24,
  className,
  label = 'Loading…',
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn('inline-flex items-center justify-center', className)}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className="animate-spin"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  )
}

/**
 * Full-page loading overlay — dims the background and shows a centered spinner.
 */
export function LoadingOverlay({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
      role="status"
      aria-label={label}
    >
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner size={40} label={label} />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

/**
 * Inline skeleton rows — use for table/data loading states.
 */
export function TableSkeleton({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number
  columns?: number
  className?: string
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: columns }).map((_, c) => (
            <div
              key={c}
              className="h-4 flex-1 animate-pulse rounded bg-muted"
            />
          ))}
        </div>
      ))}
    </div>
  )
}
