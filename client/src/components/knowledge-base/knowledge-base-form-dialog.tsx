import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { knowledgeBaseArticleTypes, type CreateKnowledgeBaseArticlePayload, type KnowledgeBaseArticle, type KnowledgeBaseArticleType, type UpdateKnowledgeBaseArticlePayload } from '@/types/knowledgeBase'

const formSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  content: z.string().trim().min(1, 'Content is required'),
  category: z.string(),
  articleType: z.enum(knowledgeBaseArticleTypes as [KnowledgeBaseArticleType, ...KnowledgeBaseArticleType[]]),
  isPublished: z.boolean(),
})

type KnowledgeBaseFormData = z.infer<typeof formSchema>

interface KnowledgeBaseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  article: KnowledgeBaseArticle | null
  submitting: boolean
  onCreate: (payload: CreateKnowledgeBaseArticlePayload) => void
  onUpdate: (payload: UpdateKnowledgeBaseArticlePayload) => void
}

export function KnowledgeBaseFormDialog({ open, onOpenChange, article, submitting, onCreate, onUpdate }: KnowledgeBaseFormDialogProps) {
  const form = useForm<KnowledgeBaseFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: '', content: '', category: '', articleType: 'Article', isPublished: false },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      title: article?.title ?? '',
      content: article?.content ?? '',
      category: article?.category ?? '',
      articleType: article?.articleType ?? 'Article',
      isPublished: article?.isPublished ?? false,
    })
  }, [article, form, open])

  const submit = (data: KnowledgeBaseFormData) => {
    const payload = {
      title: data.title.trim(),
      content: data.content.trim(),
      category: data.category.trim() || undefined,
      articleType: data.articleType,
      isPublished: data.isPublished,
    }
    if (article) onUpdate(payload)
    else onCreate(payload)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{article ? 'Edit Knowledge Article' : 'Create Knowledge Article'}</DialogTitle>
          <DialogDescription>Use plain text or Markdown-compatible content. Publication controls who can discover the article.</DialogDescription>
        </DialogHeader>
        <Form form={form} id="knowledge-base-form" onSubmit={form.handleSubmit(submit)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormItem className="sm:col-span-2">
              <FormLabel required>Title</FormLabel>
              <Input {...form.register('title')} aria-invalid={Boolean(form.formState.errors.title)} />
              {form.formState.errors.title && <FormMessage>{form.formState.errors.title.message}</FormMessage>}
            </FormItem>
            <FormItem>
              <FormLabel required>Article type</FormLabel>
              <Select value={form.watch('articleType')} onValueChange={(value) => form.setValue('articleType', value as KnowledgeBaseArticleType, { shouldValidate: true })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{knowledgeBaseArticleTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
              </Select>
            </FormItem>
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Input {...form.register('category')} placeholder="e.g. Access Management" />
            </FormItem>
          </div>
          <FormItem className="mt-4">
            <FormLabel required>Content</FormLabel>
            <Textarea rows={12} {...form.register('content')} aria-invalid={Boolean(form.formState.errors.content)} />
            {form.formState.errors.content && <FormMessage>{form.formState.errors.content.message}</FormMessage>}
          </FormItem>
          <div className="mt-4 flex items-center justify-between rounded-md border p-3">
            <div><FormLabel>Published</FormLabel><p className="text-xs text-muted-foreground">Published articles are available to authorized employees.</p></div>
            <input
              id="knowledge-base-published"
              type="checkbox"
              checked={form.watch('isPublished')}
              onChange={(event) => form.setValue('isPublished', event.target.checked, { shouldValidate: true })}
              aria-label="Published"
            />
          </div>
        </Form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button type="submit" form="knowledge-base-form" disabled={submitting}>{submitting ? 'Saving…' : article ? 'Save Changes' : 'Create Article'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
