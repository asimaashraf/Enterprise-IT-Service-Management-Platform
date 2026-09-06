import * as React from 'react'
import { AlertCircle, RefreshCw, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface ErrorStateProps {
  /** The error message to display */
  title?: React.ReactNode
  /** Optional extended description or guidance */
  description?: React.ReactNode
  /** Optional icon (defaults to AlertCircle) */
  icon?: LucideIcon
  /** Whether to show a retry button */
  onRetry?: () => void
  /** Label for the retry button (default "Try again") */
  retryLabel?: string
  className?: string
}

/**
 * ErrorState — a consistent error placeholder for data-fetching failures.
 */
export function ErrorState({
  title = 'Something went wrong',
  description,
  icon: Icon = AlertCircle,
  onRetry,
  retryLabel = 'Try again',
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center',
        className,
      )}
      role="alert"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <Icon className="h-6 w-6 text-destructive" />
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {description}
          </p>
        )}
      </div>

      {onRetry && (
        <Button
          type="button"
          variant="outline"
          onClick={onRetry}
          className="gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {retryLabel}
        </Button>
      )}
    </div>
  )
}
