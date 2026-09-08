import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Keep confirmation open during an asynchronous mutation. Closing is explicit
// so submitting cannot unmount the form before its event is handled.
export function RCAConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  confirmVariant = 'default',
  loading,
  onCancel,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  confirmVariant?: 'default' | 'destructive'
  loading: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!loading) onOpenChange(value)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? 'Saving…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
