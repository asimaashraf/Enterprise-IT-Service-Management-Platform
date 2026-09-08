import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatAuditTimestamp } from '@/lib/auditView'
import type { AuditLogRecord } from '@/types/audit'

export function AuditRecordDialog({
  record,
  onClose,
}: {
  record: AuditLogRecord
  onClose: () => void
}) {
  const fields = [
    ['Timestamp', formatAuditTimestamp(record.createdAt)],
    ['Outcome', record.outcome],
    ['Actor email', record.actorEmail || 'Not recorded'],
    ['Actor ID', record.actorId || 'Not recorded'],
    ['Actor role', record.actorRole?.toUpperCase() || 'Not recorded'],
    ['Action', record.action],
    ['Event', record.eventType],
    ['Resource type', record.resourceType],
    ['Resource ID', record.resourceId || 'Not recorded'],
  ]
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Audit record</DialogTitle>
          <DialogDescription>
            Read-only details from the recorded event.
          </DialogDescription>
        </DialogHeader>
        <dl className="grid min-w-0 gap-4 text-sm sm:grid-cols-2">
          {fields.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words">{value}</dd>
            </div>
          ))}
        </dl>
        <section
          aria-labelledby="audit-metadata-title"
          className="min-w-0 space-y-2 border-t pt-4"
        >
          <h3 id="audit-metadata-title" className="text-sm font-semibold">
            Metadata
          </h3>
          {record.metadata === undefined ? (
            <p className="text-sm text-muted-foreground">
              No metadata recorded.
            </p>
          ) : (
            <pre
              tabIndex={0}
              aria-label="Audit metadata"
              className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs"
            >
              {JSON.stringify(record.metadata, null, 2)}
            </pre>
          )}
        </section>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
