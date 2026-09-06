import * as React from 'react'
import { type LucideIcon, FolderOpen, Search, Inbox } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface EmptyStateProps {
  /** The primary icon */
  icon?: LucideIcon
  /** Icon to show before the title */
  iconBefore?: LucideIcon
  /** Icon to show after the title */
  iconAfter?: LucideIcon
  /** The main message (optional when using presets) */
  title?: React.ReactNode
  /** Optional extended description */
  description?: React.ReactNode
  /** Optional CTA button */
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'secondary' | 'outline' | 'ghost'
  }
  /** Optional retry callback (used by DataTable for error recovery) */
  onRetry?: () => void
  /** One of the preset styles */
  preset?: 'generic' | 'search' | 'inbox'
  className?: string
}

const presetDefaults: Record<
  NonNullable<EmptyStateProps['preset']>,
  { icon: LucideIcon; title: string; description: string }
> = {
  generic: {
    icon: FolderOpen,
    title: 'No items found',
    description: 'There is nothing to display here yet.',
  },
  search: {
    icon: Search,
    title: 'No results',
    description: 'Try adjusting your search or filter to find what you are looking for.',
  },
  inbox: {
    icon: Inbox,
    title: 'Inbox zero',
    description: 'You are all caught up!',
  },
}

/**
 * EmptyState — a consistent placeholder shown when a list or data
 * region has no content to display.
 */
export function EmptyState({
  icon,
  iconBefore,
  iconAfter,
  title,
  description,
  action,
  onRetry,
  preset,
  className,
}: EmptyStateProps) {
  const resolved = preset ? presetDefaults[preset] : null
  const Icon = icon ?? resolved?.icon ?? FolderOpen
  const IconBefore = iconBefore
  const IconAfter = iconAfter
  const resolvedTitle = title ?? resolved?.title ?? 'No items found'
  const resolvedDescription = description ?? resolved?.description

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center',
        className,
      )}
    >
      {IconBefore && (
        <IconBefore className="h-10 w-10 text-muted-foreground/60" />
      )}

      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>

      {IconAfter && (
        <IconAfter className="h-10 w-10 text-muted-foreground/60" />
      )}

      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">{resolvedTitle}</h3>
        {resolvedDescription && (
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            {resolvedDescription}
          </p>
        )}
      </div>

      {action && (
        <Button
          type="button"
          variant={action.variant ?? 'default'}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
        >
          Try again
        </Button>
      )}
    </div>
  )
}
