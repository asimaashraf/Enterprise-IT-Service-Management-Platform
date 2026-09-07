import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { BookOpen, Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { useSelector } from 'react-redux'

import { KnowledgeBaseFormDialog } from '@/components/knowledge-base/knowledge-base-form-dialog'
import { KnowledgeBaseViewDialog } from '@/components/knowledge-base/knowledge-base-view-dialog'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DataTable } from '@/components/ui/data-table'
import { ErrorState } from '@/components/ui/error-state'
import { FilterBar, type FilterOption } from '@/components/ui/filter-bar'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { useAddKnowledgeBaseAttachment, useCreateKnowledgeBaseArticle, useDeleteKnowledgeBaseArticle, useKnowledgeBaseArticles, useKnowledgeBaseSearch, useUpdateKnowledgeBaseArticle } from '@/hooks/useKnowledgeBase'
import type { RootState } from '@/store'
import { getKnowledgeBaseCreatorDisplay, knowledgeBaseArticleTypes, type CreateKnowledgeBaseArticlePayload, type KnowledgeBaseArticle, type KnowledgeBaseFilters, type UpdateKnowledgeBaseArticlePayload } from '@/types/knowledgeBase'

const selectOptions = (allLabel: string, values: string[]): FilterOption[] => [
  { label: allLabel, value: '' },
  ...values.map((value) => ({ label: value, value })),
]

const displayDate = (value?: string) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function KnowledgeBasePage() {
  const user = useSelector((state: RootState) => state.auth.user)
  const isAdmin = user?.role === 'admin'
  const articlesQuery = useKnowledgeBaseArticles()
  const [filters, setFilters] = useState<KnowledgeBaseFilters>({ search: '', category: '', articleType: '', publication: '' })
  const searchQuery = useKnowledgeBaseSearch(filters.search)
  const createMutation = useCreateKnowledgeBaseArticle()
  const updateMutation = useUpdateKnowledgeBaseArticle()
  const deleteMutation = useDeleteKnowledgeBaseArticle()
  const attachmentMutation = useAddKnowledgeBaseAttachment()
  const [formOpen, setFormOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState<KnowledgeBaseArticle | null>(null)
  const [viewingArticle, setViewingArticle] = useState<KnowledgeBaseArticle | null>(null)
  const [deletingArticle, setDeletingArticle] = useState<KnowledgeBaseArticle | null>(null)

  const categories = useMemo(() => Array.from(new Set((articlesQuery.data ?? []).map((article) => article.category).filter((category): category is string => Boolean(category)))).sort(), [articlesQuery.data])
  const sourceArticles = useMemo(
    () => filters.search.trim() ? searchQuery.data ?? [] : articlesQuery.data ?? [],
    [articlesQuery.data, filters.search, searchQuery.data],
  )
  const isLoading = filters.search.trim() ? searchQuery.isLoading : articlesQuery.isLoading
  const isError = filters.search.trim() ? searchQuery.isError : articlesQuery.isError
  const error = filters.search.trim() ? searchQuery.error : articlesQuery.error

  const filterFields = useMemo(() => [
    { key: 'search', type: 'search' as const, label: 'Search', placeholder: 'Search knowledge articles…' },
    { key: 'category', type: 'select' as const, label: 'Category', options: selectOptions('All categories', categories), placeholder: 'Category' },
    { key: 'articleType', type: 'select' as const, label: 'Type', options: selectOptions('All types', knowledgeBaseArticleTypes), placeholder: 'Type' },
    ...(isAdmin ? [{ key: 'publication', type: 'select' as const, label: 'Publication', options: [{ label: 'All publication states', value: '' }, { label: 'Published', value: 'published' }, { label: 'Unpublished', value: 'unpublished' }], placeholder: 'Publication' }] : []),
  ], [categories, isAdmin])

  const filteredArticles = useMemo(() => sourceArticles.filter((article) => (
    (!filters.category || article.category === filters.category)
    && (!filters.articleType || article.articleType === filters.articleType)
    && (!isAdmin || !filters.publication || (filters.publication === 'published' ? article.isPublished : !article.isPublished))
  )), [filters.articleType, filters.category, filters.publication, isAdmin, sourceArticles])

  const closeForm = () => { setFormOpen(false); setEditingArticle(null) }
  const openEdit = (article: KnowledgeBaseArticle) => { setEditingArticle(article); setFormOpen(true); setViewingArticle(null) }

  const columns = useMemo<ColumnDef<KnowledgeBaseArticle>[]>(() => [
    { accessorKey: 'title', header: 'Title', enableSorting: true, cell: ({ row }) => <div><p className="font-medium">{row.original.title}</p><p className="text-xs text-muted-foreground">{row.original.category ?? 'Uncategorized'}</p></div> },
    { accessorKey: 'articleType', header: 'Type', enableSorting: true },
    { accessorKey: 'isPublished', header: 'Publication', cell: ({ row }) => <StatusBadge status={row.original.isPublished ? 'resolved' : 'secondary'}>{row.original.isPublished ? 'Published' : 'Unpublished'}</StatusBadge> },
    { accessorKey: 'createdBy', header: 'Creator', cell: ({ row }) => <span className="max-w-32 truncate text-xs text-muted-foreground">{getKnowledgeBaseCreatorDisplay(row.original.createdBy)}</span> },
    { accessorKey: 'updatedAt', header: 'Updated', cell: ({ row }) => <span className="text-xs text-muted-foreground">{displayDate(row.original.updatedAt)}</span> },
    { id: 'actions', header: 'Actions', enableSorting: false, cell: ({ row }) => <div className="flex items-center gap-1"><Button variant="ghost" size="icon" aria-label={`View ${row.original.title}`} onClick={() => setViewingArticle(row.original)}><Eye className="h-4 w-4" /></Button>{isAdmin && <Button variant="ghost" size="icon" aria-label={`Edit ${row.original.title}`} onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button>}{isAdmin && <Button variant="ghost" size="icon" aria-label={`Delete ${row.original.title}`} onClick={() => setDeletingArticle(row.original)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div> },
  ], [isAdmin])

  if (isError) return <ErrorState title="Knowledge Base could not be loaded" description={error instanceof Error ? error.message : 'There was a problem fetching Knowledge Base articles.'} onRetry={() => { if (filters.search.trim()) void searchQuery.refetch(); else void articlesQuery.refetch() }} />

  return <div className="space-y-6">
    <PageHeader title="Knowledge Base" description={isAdmin ? 'Create, publish, and maintain knowledge for your organization.' : 'Search and read published knowledge for your organization.'} icon={BookOpen} breadcrumbs={[{ label: 'Knowledge Base' }]} actions={isAdmin ? <Button onClick={() => setFormOpen(true)}><Plus className="mr-2 h-4 w-4" />Create Article</Button> : undefined} />
    <FilterBar fields={filterFields} values={filters} onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))} onReset={() => setFilters({ search: '', category: '', articleType: '', publication: '' })} />
    <DataTable columns={columns} data={filteredArticles} loading={isLoading} emptyTitle="No knowledge articles found" emptyDescription={isAdmin ? 'Create an article or adjust the current filters.' : 'No published knowledge articles match the current filters.'} onRetry={() => { if (filters.search.trim()) void searchQuery.refetch(); else void articlesQuery.refetch() }} />
    {isAdmin && <KnowledgeBaseFormDialog open={formOpen} onOpenChange={(open) => open ? setFormOpen(true) : closeForm()} article={editingArticle} submitting={createMutation.isPending || updateMutation.isPending} onCreate={(payload: CreateKnowledgeBaseArticlePayload) => createMutation.mutate(payload, { onSuccess: closeForm })} onUpdate={(payload: UpdateKnowledgeBaseArticlePayload) => { if (editingArticle) updateMutation.mutate({ id: editingArticle._id, payload }, { onSuccess: closeForm }) }} />}
    <KnowledgeBaseViewDialog open={Boolean(viewingArticle)} onOpenChange={(open) => !open && setViewingArticle(null)} article={viewingArticle} isAdmin={isAdmin} attachmentSubmitting={attachmentMutation.isPending} onEdit={openEdit} onDelete={setDeletingArticle} onTogglePublished={(article) => updateMutation.mutate({ id: article._id, payload: { isPublished: !article.isPublished } })} onAddAttachment={async (id, payload) => { await attachmentMutation.mutateAsync({ id, payload }) }} />
    <ConfirmDialog open={Boolean(deletingArticle)} onOpenChange={(open) => !open && setDeletingArticle(null)} title="Delete Knowledge Article?" description={`This permanently deletes “${deletingArticle?.title ?? ''}”.`} confirmLabel="Delete Article" confirmVariant="destructive" loading={deleteMutation.isPending} onCancel={() => setDeletingArticle(null)} onConfirm={() => { if (deletingArticle) deleteMutation.mutate(deletingArticle._id, { onSuccess: () => { setDeletingArticle(null); setViewingArticle(null) } }) }} />
  </div>
}
