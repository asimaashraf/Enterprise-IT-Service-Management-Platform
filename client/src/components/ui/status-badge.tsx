import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/**
 * StatusBadge — a Badge with pre-defined status-driven variants.
 * Maps common ITSM status strings to appropriate visual styles.
 */

const statusVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        // Generic / informational
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'text-foreground',

        // Status-specific
        // Incident statuses
        new: 'border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        assigned: 'border-transparent bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
        in_progress: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
        resolved: 'border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        closed: 'border-transparent bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',

        // Priority / severity
        critical: 'border-transparent bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        high: 'border-transparent bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
        medium: 'border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        low: 'border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',

        // Change statuses
        pending: 'border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        approved: 'border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        rejected: 'border-transparent bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        implemented: 'border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',

        // Service request statuses
        open: 'border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        fulfilled: 'border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        cancelled: 'border-transparent bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',

        // SLA
        on_track: 'border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        at_risk: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
        breached: 'border-transparent bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',

        // Asset lifecycle
        available: 'border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        assigned_asset: 'border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        maintenance: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
        retired: 'border-transparent bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',

        // User statuses
        active: 'border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        inactive: 'border-transparent bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
        blocked: 'border-transparent bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        pending_invite: 'border-transparent bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',

        // Destructive
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type StatusBadgeVariant = VariantProps<typeof statusVariants>['variant']

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusVariants> {
  /**
   * One of the predefined variant keys above, or a custom className.
   * When omitted the badge renders with the `default` variant.
   */
  status?: string
}

function StatusBadge({ className, variant, status, ...props }: StatusBadgeProps) {
  // If status is provided, normalize it to a variant key
  const resolvedVariant = status
    ? ((status in variants ? status : 'default') as VariantProps<typeof statusVariants>['variant'])
    : variant

  return (
    <div
      className={cn(statusVariants({ variant: resolvedVariant }), className)}
      {...props}
    />
  )
}

/**
 * Helper to map a raw status string to a StatusBadge variant.
 * Falls back to 'default' for unknown statuses.
 */
export function resolveStatusVariant(
  status: string | undefined,
): VariantProps<typeof statusVariants>['variant'] {
  if (!status) return 'default'
  return (status in variants ? status : 'default') as VariantProps<typeof statusVariants>['variant']
}

// Keep a map of known variants for resolveStatusVariant
const variants = {
  default: true,
  secondary: true,
  outline: true,
  destructive: true,
  new: true,
  assigned: true,
  in_progress: true,
  resolved: true,
  closed: true,
  critical: true,
  high: true,
  medium: true,
  low: true,
  pending: true,
  approved: true,
  rejected: true,
  implemented: true,
  open: true,
  fulfilled: true,
  cancelled: true,
  on_track: true,
  at_risk: true,
  breached: true,
  available: true,
  assigned_asset: true,
  maintenance: true,
  retired: true,
  active: true,
  inactive: true,
  blocked: true,
  pending_invite: true,
} as const

export { StatusBadge, statusVariants }
