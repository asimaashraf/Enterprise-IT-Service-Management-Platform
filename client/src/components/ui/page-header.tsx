import * as React from 'react'
import { ChevronRight, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

export interface BreadcrumbItem {
  label: string
  /** If provided, renders as a clickable link */
  href?: string
}

export interface PageHeaderProps {
  /** The page title */
  title: React.ReactNode
  /** Optional subtitle / description below the title */
  description?: React.ReactNode
  /** Optional breadcrumb trail rendered above the title */
  breadcrumbs?: BreadcrumbItem[]
  /** Optional icon rendered before the title */
  icon?: LucideIcon
  /** Slot for action buttons (e.g. "New Incident" button) */
  actions?: React.ReactNode
  className?: string
}

/**
 * PageHeader — standard page header with title, optional breadcrumbs,
 * description, icon, and an actions slot for primary CTAs.
 */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  icon: Icon,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1 text-sm text-muted-foreground"
        >
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1
            return (
              <React.Fragment key={idx}>
                {idx > 0 && (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                )}
                {crumb.href && !isLast ? (
                  <a
                    href={crumb.href}
                    className="hover:text-foreground transition-colors"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span
                    className={cn(isLast && 'text-foreground font-medium')}
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            )
          })}
        </nav>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {description && (
              <p className="text-muted-foreground">{description}</p>
            )}
          </div>
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      <Separator className="mt-2" />
    </div>
  )
}
