import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import type { CreateKnowledgeBaseAttachmentPayload } from '@/types/knowledgeBase'

const formSchema = z.object({
  filename: z.string().trim().min(1, 'Filename is required'),
  mimeType: z.string().trim().min(1, 'MIME type is required'),
  size: z.string().refine((value) => /^\d+$/.test(value), 'Size must be a non-negative whole number'),
  storageKey: z.string().trim().min(1, 'Storage key is required'),
})

type AttachmentFormData = z.infer<typeof formSchema>

interface KnowledgeBaseAttachmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  submitting: boolean
  onSubmit: (payload: CreateKnowledgeBaseAttachmentPayload) => void
}

export function KnowledgeBaseAttachmentDialog({ open, onOpenChange, submitting, onSubmit }: KnowledgeBaseAttachmentDialogProps) {
  const form = useForm<AttachmentFormData>({ resolver: zodResolver(formSchema), defaultValues: { filename: '', mimeType: '', size: '', storageKey: '' } })

  useEffect(() => { if (open) form.reset() }, [form, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add attachment metadata</DialogTitle><DialogDescription>This records existing storage metadata only. It does not upload or download a file.</DialogDescription></DialogHeader>
        <Form form={form} id="knowledge-base-attachment-form" onSubmit={form.handleSubmit((data) => onSubmit({ ...data, filename: data.filename.trim(), mimeType: data.mimeType.trim(), storageKey: data.storageKey.trim(), size: Number(data.size) }))}>
          <div className="space-y-4">
            <FormItem><FormLabel required>Filename</FormLabel><Input {...form.register('filename')} />{form.formState.errors.filename && <FormMessage>{form.formState.errors.filename.message}</FormMessage>}</FormItem>
            <FormItem><FormLabel required>MIME type</FormLabel><Input {...form.register('mimeType')} placeholder="application/pdf" />{form.formState.errors.mimeType && <FormMessage>{form.formState.errors.mimeType.message}</FormMessage>}</FormItem>
            <FormItem><FormLabel required>Size (bytes)</FormLabel><Input type="number" min="0" step="1" {...form.register('size')} />{form.formState.errors.size && <FormMessage>{form.formState.errors.size.message}</FormMessage>}</FormItem>
            <FormItem><FormLabel required>Storage key</FormLabel><Input {...form.register('storageKey')} placeholder="tenant/guides/network.pdf" />{form.formState.errors.storageKey && <FormMessage>{form.formState.errors.storageKey.message}</FormMessage>}</FormItem>
          </div>
        </Form>
        <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button><Button type="submit" form="knowledge-base-attachment-form" disabled={submitting}>{submitting ? 'Saving…' : 'Add Metadata'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

