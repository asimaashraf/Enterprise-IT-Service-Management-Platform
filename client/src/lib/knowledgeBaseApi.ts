import apiClient from '@/lib/apiClient'
import type { ApiEnvelope } from '@/types/auth'
import type {
  CreateKnowledgeBaseArticlePayload,
  CreateKnowledgeBaseAttachmentPayload,
  KnowledgeBaseArticle,
  KnowledgeBaseAttachment,
  UpdateKnowledgeBaseArticlePayload,
} from '@/types/knowledgeBase'

const unwrap = <T>(response: { data: ApiEnvelope<T> }): T => {
  const envelope = response.data
  if (!envelope.success || envelope.data === undefined) {
    throw new Error(envelope.message || 'Knowledge Base request failed')
  }
  return envelope.data
}

export const knowledgeBaseApi = {
  async list(): Promise<KnowledgeBaseArticle[]> {
    return unwrap(await apiClient.get<ApiEnvelope<KnowledgeBaseArticle[]>>('/knowledge-base'))
  },

  async search(query: string): Promise<KnowledgeBaseArticle[]> {
    return unwrap(await apiClient.get<ApiEnvelope<KnowledgeBaseArticle[]>>('/knowledge-base/search', { params: { q: query } }))
  },

  async get(id: string): Promise<KnowledgeBaseArticle> {
    return unwrap(await apiClient.get<ApiEnvelope<KnowledgeBaseArticle>>(`/knowledge-base/${id}`))
  },

  async create(payload: CreateKnowledgeBaseArticlePayload): Promise<KnowledgeBaseArticle> {
    return unwrap(await apiClient.post<ApiEnvelope<KnowledgeBaseArticle>>('/knowledge-base', payload))
  },

  async update(id: string, payload: UpdateKnowledgeBaseArticlePayload): Promise<KnowledgeBaseArticle> {
    return unwrap(await apiClient.put<ApiEnvelope<KnowledgeBaseArticle>>(`/knowledge-base/${id}`, payload))
  },

  async remove(id: string): Promise<KnowledgeBaseArticle> {
    return unwrap(await apiClient.delete<ApiEnvelope<KnowledgeBaseArticle>>(`/knowledge-base/${id}`))
  },

  async attachments(id: string): Promise<KnowledgeBaseAttachment[]> {
    return unwrap(await apiClient.get<ApiEnvelope<KnowledgeBaseAttachment[]>>(`/knowledge-base/${id}/attachments`))
  },

  async addAttachment(id: string, payload: CreateKnowledgeBaseAttachmentPayload): Promise<KnowledgeBaseAttachment> {
    return unwrap(await apiClient.post<ApiEnvelope<KnowledgeBaseAttachment>>(`/knowledge-base/${id}/attachments`, payload))
  },
}

