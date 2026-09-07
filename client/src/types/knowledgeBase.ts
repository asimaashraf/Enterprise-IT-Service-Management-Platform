export type KnowledgeBaseArticleType =
  | 'Article'
  | 'FAQ'
  | 'Troubleshooting Guide'
  | 'SOP'

export interface KnowledgeBaseAttachment {
  _id: string
  filename: string
  mimeType: string
  size: number
  storageKey: string
  uploadedBy: string
  uploadedAt: string
}

export interface KnowledgeBaseCreator {
  _id: string
  name: string
}

export interface KnowledgeBaseArticle {
  _id: string
  title: string
  content: string
  category?: string
  articleType: KnowledgeBaseArticleType
  organizationId: string
  createdBy: KnowledgeBaseCreator | string
  attachments: KnowledgeBaseAttachment[]
  isPublished: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateKnowledgeBaseArticlePayload {
  title: string
  content: string
  category?: string
  articleType: KnowledgeBaseArticleType
  isPublished?: boolean
}

export interface UpdateKnowledgeBaseArticlePayload {
  title?: string
  content?: string
  category?: string
  articleType?: KnowledgeBaseArticleType
  isPublished?: boolean
}

export interface CreateKnowledgeBaseAttachmentPayload {
  filename: string
  mimeType: string
  size: number
  storageKey: string
}

export interface KnowledgeBaseFilters {
  search: string
  category: string
  articleType: string
  publication: string
  [key: string]: string
}

export const knowledgeBaseArticleTypes: KnowledgeBaseArticleType[] = [
  'Article',
  'FAQ',
  'Troubleshooting Guide',
  'SOP',
]

export function getKnowledgeBaseCreatorDisplay(creator: KnowledgeBaseCreator | string | null | undefined): string {
  if (!creator) return 'Unavailable'
  return typeof creator === 'string' ? creator : creator.name || creator._id
}
