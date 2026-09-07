import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'

import { knowledgeBaseApi } from '@/lib/knowledgeBaseApi'
import type { RootState } from '@/store'
import type {
  CreateKnowledgeBaseArticlePayload,
  CreateKnowledgeBaseAttachmentPayload,
  UpdateKnowledgeBaseArticlePayload,
} from '@/types/knowledgeBase'

export const knowledgeBaseKeys = {
  all: (organizationId: string, userId: string) => ['knowledge-base', organizationId, userId] as const,
  search: (organizationId: string, userId: string, query: string) => ['knowledge-base', organizationId, userId, 'search', query] as const,
  detail: (organizationId: string, userId: string, id: string) => ['knowledge-base', organizationId, userId, id] as const,
  attachments: (organizationId: string, userId: string, id: string) => ['knowledge-base', organizationId, userId, id, 'attachments'] as const,
}

function useKnowledgeBaseQueryScope() {
  const user = useSelector((state: RootState) => state.auth.user)
  return user ? { organizationId: user.organizationId, userId: user.id } : undefined
}

export function useKnowledgeBaseArticles() {
  const scope = useKnowledgeBaseQueryScope()
  return useQuery({
    queryKey: scope ? knowledgeBaseKeys.all(scope.organizationId, scope.userId) : ['knowledge-base', 'unauthenticated'] as const,
    queryFn: knowledgeBaseApi.list,
    enabled: Boolean(scope),
  })
}

export function useKnowledgeBaseSearch(query: string) {
  const scope = useKnowledgeBaseQueryScope()
  const normalizedQuery = query.trim()
  return useQuery({
    queryKey: scope ? knowledgeBaseKeys.search(scope.organizationId, scope.userId, normalizedQuery) : ['knowledge-base', 'unauthenticated', 'search', normalizedQuery] as const,
    queryFn: () => knowledgeBaseApi.search(normalizedQuery),
    enabled: Boolean(scope && normalizedQuery),
  })
}

export function useKnowledgeBaseArticle(id: string, enabled = true) {
  const scope = useKnowledgeBaseQueryScope()
  return useQuery({
    queryKey: scope ? knowledgeBaseKeys.detail(scope.organizationId, scope.userId, id) : ['knowledge-base', 'unauthenticated', id] as const,
    queryFn: () => knowledgeBaseApi.get(id),
    enabled: Boolean(scope && id) && enabled,
  })
}

export function useKnowledgeBaseAttachments(id: string, enabled = true) {
  const scope = useKnowledgeBaseQueryScope()
  return useQuery({
    queryKey: scope ? knowledgeBaseKeys.attachments(scope.organizationId, scope.userId, id) : ['knowledge-base', 'unauthenticated', id, 'attachments'] as const,
    queryFn: () => knowledgeBaseApi.attachments(id),
    enabled: Boolean(scope && id) && enabled,
  })
}

function useKnowledgeBaseMutation<T>(
  mutationFn: (value: T) => Promise<{ _id: string; title?: string; filename?: string }>,
  successMessage: (result: { _id: string; title?: string; filename?: string }) => string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] })
      toast.success(successMessage(result))
    },
    onError: (error: Error) => toast.error('Knowledge Base action failed', { description: error.message }),
  })
}

export function useCreateKnowledgeBaseArticle() {
  return useKnowledgeBaseMutation(
    (payload: CreateKnowledgeBaseArticlePayload) => knowledgeBaseApi.create(payload),
    (article) => `Article ${article.title ?? article._id} created`,
  )
}

export function useUpdateKnowledgeBaseArticle() {
  return useKnowledgeBaseMutation(
    ({ id, payload }: { id: string; payload: UpdateKnowledgeBaseArticlePayload }) => knowledgeBaseApi.update(id, payload),
    (article) => `Article ${article.title ?? article._id} updated`,
  )
}

export function useDeleteKnowledgeBaseArticle() {
  return useKnowledgeBaseMutation(
    (id: string) => knowledgeBaseApi.remove(id),
    (article) => `Article ${article.title ?? article._id} deleted`,
  )
}

export function useAddKnowledgeBaseAttachment() {
  return useKnowledgeBaseMutation(
    ({ id, payload }: { id: string; payload: CreateKnowledgeBaseAttachmentPayload }) => knowledgeBaseApi.addAttachment(id, payload),
    (attachment) => `Attachment ${attachment.filename ?? attachment._id} added`,
  )
}

