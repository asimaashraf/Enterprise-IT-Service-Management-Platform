import * as React from 'react'
import {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button'

export interface ConfirmDialogProps {
  /** Controlled open state */
  open?: boolean
  onOpenChange?: (open: boolean) => void

  /** Dialog title */
  title: React.ReactNode
  /** Optional description text below the title */
  description?: React.ReactNode

  /** Label for the confirm (destructive) button */
  confirmLabel?: string
  /** Variant of the confirm button */
  confirmVariant?: 'default' | 'destructive'
  /** Whether the confirm button is loading */
  loading?: boolean

  /** Label for the cancel button */
  cancelLabel?: string

  /** Called when the user confirms */
  onConfirm?: () => void
  /** Called when the user cancels or dismisses */
  onCancel?: () => void
}

/**
 * ConfirmDialog — a reusable confirmation dialog built on shadcn AlertDialog.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  confirmVariant = 'default',
  loading = false,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogPortal>
        <AlertDialogOverlay />
        <AlertDialogContent asChild>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              onConfirm?.()
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>{title}</AlertDialogTitle>
              {description && (
                <AlertDialogDescription>{description}</AlertDialogDescription>
              )}
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel type="button" onClick={onCancel}>
                {cancelLabel}
              </AlertDialogCancel>
              <AlertDialogAction
                type="submit"
                className={buttonVariants({ variant: confirmVariant })}
                disabled={loading}
              >
                {loading ? 'Loading…' : confirmLabel}
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialog>
  )
}

/**
 * Trigger-based variant — use inside an AlertDialog root.
 */
export function ConfirmDialogContent({
  title,
  description,
  confirmLabel = 'Confirm',
  confirmVariant = 'default',
  loading = false,
  cancelLabel = 'Cancel',
  onConfirm,
}: Omit<ConfirmDialogProps, 'open' | 'onOpenChange' | 'onCancel'>) {
  return (
    <AlertDialogContent asChild>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onConfirm?.()
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel type="button">{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            type="submit"
            className={buttonVariants({ variant: confirmVariant })}
            disabled={loading}
          >
            {loading ? 'Loading…' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </form>
    </AlertDialogContent>
  )
}
