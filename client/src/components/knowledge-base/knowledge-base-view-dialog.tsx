import { useState } from 'react'
import { FileText, Paperclip, Pencil, Plus } from 'lucide-react'

import { KnowledgeBaseAttachmentDialog } from '@/components/knowledge-base/knowledge-base-attachment-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { StatusBadge } from '@/components/ui/status-badge'
import { useKnowledgeBaseArticle, useKnowledgeBaseAttachments } from '@/hooks/useKnowledgeBase'
import { getKnowledgeBaseCreatorDisplay, type CreateKnowledgeBaseAttachmentPayload, type KnowledgeBaseArticle } from '@/types/knowledgeBase'

const displayDate = (value?: string) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

const displaySize = (size: number) => `${size.toLocaleString()} bytes`

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-start justify-between gap-4 py-2 text-sm"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>
)

interface KnowledgeBaseViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  article: KnowledgeBaseArticle | null
  isAdmin: boolean
  attachmentSubmitting: boolean
  onEdit: (article: KnowledgeBaseArticle) => void
  onDelete: (article: KnowledgeBaseArticle) => void
  onTogglePublished: (article: KnowledgeBaseArticle) => void
  onAddAttachment: (id: string, payload: CreateKnowledgeBaseAttachmentPayload) => Promise<void>
}

export function KnowledgeBaseViewDialog({ open, onOpenChange, article, isAdmin, attachmentSubmitting, onEdit, onDelete, onTogglePublished, onAddAttachment }: KnowledgeBaseViewDialogProps) {
  const [attachmentOpen, setAttachmentOpen] = useState(false)
  const articleId = article?._id ?? ''
  const detailQuery = useKnowledgeBaseArticle(articleId, open)
  const attachmentsQuery = useKnowledgeBaseAttachments(articleId, open)
  const detail = detailQuery.data ?? article

  const handleAddAttachment = async (payload: CreateKnowledgeBaseAttachmentPayload) => {
    if (!detail) return
    await onAddAttachment(detail._id, payload)
    setAttachmentOpen(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          {detailQuery.isLoading || !detail ? <div className="flex min-h-48 items-center justify-center"><LoadingSpinner /></div> : detailQuery.isError ? (
            <ErrorState description={detailQuery.error instanceof Error ? detailQuery.error.message : 'Knowledge article details could not be loaded.'} onRetry={() => detailQuery.refetch()} />
          ) : <>
            <DialogHeader>
              <div className="flex flex-wrap items-start justify-between gap-3 pr-6">
                <div><DialogTitle>{detail.title}</DialogTitle><DialogDescription>{detail.articleType}{detail.category ? ` · ${detail.category}` : ''}</DialogDescription></div>
                <StatusBadge status={detail.isPublished ? 'resolved' : 'secondary'}>{detail.isPublished ? 'Published' : 'Unpublished'}</StatusBadge>
              </div>
            </DialogHeader>
            <div className="space-y-4">
              {isAdmin && <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => onEdit(detail)}><Pencil className="mr-2 h-4 w-4" />Edit</Button><Button size="sm" variant="outline" onClick={() => onTogglePublished(detail)}>{detail.isPublished ? 'Unpublish' : 'Publish'}</Button><Button size="sm" variant="destructive" onClick={() => onDelete(detail)}>Delete</Button></div>}
              <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4" />Content</CardTitle></CardHeader><CardContent><div className="whitespace-pre-wrap break-words text-sm leading-6">{detail.content}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Article information</CardTitle></CardHeader><CardContent className="divide-y"><InfoRow label="Type" value={detail.articleType} /><InfoRow label="Category" value={detail.category ?? 'Uncategorized'} /><InfoRow label="Publication" value={detail.isPublished ? 'Published' : 'Unpublished'} /><InfoRow label="Creator" value={getKnowledgeBaseCreatorDisplay(detail.createdBy)} /><InfoRow label="Created" value={displayDate(detail.createdAt)} /><InfoRow label="Last updated" value={displayDate(detail.updatedAt)} /></CardContent></Card>
              <Card><CardHeader className="flex flex-row items-center justify-between gap-3 pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Paperclip className="h-4 w-4" />Attachment metadata</CardTitle>{isAdmin && <Button size="sm" variant="outline" onClick={() => setAttachmentOpen(true)}><Plus className="mr-2 h-4 w-4" />Add metadata</Button>}</CardHeader><CardContent className="space-y-3"><p className="text-xs text-muted-foreground">The backend records metadata only; file upload, download, and preview are not available.</p>{attachmentsQuery.isLoading && <LoadingSpinner size={18} />}{attachmentsQuery.isError && <ErrorState description={attachmentsQuery.error instanceof Error ? attachmentsQuery.error.message : 'Attachment metadata could not be loaded.'} onRetry={() => attachmentsQuery.refetch()} />}{!attachmentsQuery.isLoading && !attachmentsQuery.isError && (attachmentsQuery.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No attachment metadata is recorded.</p>}{(attachmentsQuery.data ?? []).map((attachment) => <div key={attachment._id} className="divide-y rounded-md border px-3"><InfoRow label="Filename" value={attachment.filename} /><InfoRow label="MIME type" value={attachment.mimeType} /><InfoRow label="Size" value={displaySize(attachment.size)} /><InfoRow label="Storage key" value={attachment.storageKey} /><InfoRow label="Uploaded" value={displayDate(attachment.uploadedAt)} /></div>)}</CardContent></Card>
            </div>
          </>}
        </DialogContent>
      </Dialog>
      {isAdmin && <KnowledgeBaseAttachmentDialog open={attachmentOpen} onOpenChange={setAttachmentOpen} submitting={attachmentSubmitting} onSubmit={(payload) => { void handleAddAttachment(payload) }} />}
    </>
  )
}
