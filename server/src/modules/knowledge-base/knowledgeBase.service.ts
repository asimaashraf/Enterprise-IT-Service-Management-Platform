import mongoose from "mongoose";

import { KnowledgeBaseArticleType } from "./knowledgeBase.model";
import { knowledgeBaseRepository } from "./knowledgeBase.repository";

export const VALID_KB_ARTICLE_TYPES: KnowledgeBaseArticleType[] = [
  "Article",
  "FAQ",
  "Troubleshooting Guide",
  "SOP",
];

export const isValidKnowledgeBaseArticleType = (
  articleType?: string
): articleType is KnowledgeBaseArticleType => {
  return Boolean(
    articleType &&
      VALID_KB_ARTICLE_TYPES.includes(articleType as KnowledgeBaseArticleType)
  );
};

// ==========================================
// CREATE KNOWLEDGE BASE ARTICLE
// ==========================================

export const createKnowledgeBase = async (
  title: string,
  content: string,
  category: string | undefined,
  organizationId: string,
  createdBy: string,
  articleType: string = "Article",
  isPublished: boolean = false
) => {
  if (!isValidKnowledgeBaseArticleType(articleType)) {
    throw new Error(
      "Article type must be one of: Article, FAQ, Troubleshooting Guide, SOP"
    );
  }

  return knowledgeBaseRepository.create({
    title,
    content,
    category,
    articleType,

    organizationId: new mongoose.Types.ObjectId(
      organizationId
    ),

    createdBy: new mongoose.Types.ObjectId(
      createdBy
    ),

    isPublished,
  });
};

// ==========================================
// GET ALL KNOWLEDGE BASE ARTICLES
// ==========================================

export const getKnowledgeBases = async (
  organizationId: string,
  publishedOnly = false
) => {
  return knowledgeBaseRepository.findAllByOrganization(
    organizationId,
    publishedOnly
  );
};

export const searchKnowledgeBases = async (
  organizationId: string,
  query: string,
  publishedOnly = false
) => {
  return knowledgeBaseRepository.searchByOrganization(
    organizationId,
    query,
    publishedOnly
  );
};

// ==========================================
// GET KNOWLEDGE BASE ARTICLE BY ID
// ==========================================

export const getKnowledgeBaseById = async (
  id: string,
  organizationId: string,
  publishedOnly = false
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return knowledgeBaseRepository.findByIdAndOrganization(
    id,
    organizationId,
    publishedOnly
  );
};

export const addKnowledgeBaseAttachment = async (
  id: string,
  organizationId: string,
  attachmentData: {
    filename: string;
    mimeType: string;
    size: number;
    storageKey: string;
    uploadedBy: string;
  }
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  if (!attachmentData.filename || !attachmentData.mimeType || !attachmentData.storageKey) {
    throw new Error("Attachment filename, type, and storage key are required");
  }

  const storageKey = attachmentData.storageKey.trim();

  if (
    !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(storageKey) ||
    storageKey.split("/").some((segment) => segment === "..")
  ) {
    throw new Error("Attachment storageKey is invalid");
  }

  const article = await knowledgeBaseRepository.findByIdAndOrganization(
    id,
    organizationId
  );

  if (!article) {
    return null;
  }

  return knowledgeBaseRepository.addAttachmentToArticle(id, organizationId, {
    filename: attachmentData.filename.trim(),
    mimeType: attachmentData.mimeType.trim(),
    size: Number(attachmentData.size) || 0,
    storageKey,
    uploadedBy: new mongoose.Types.ObjectId(attachmentData.uploadedBy),
    uploadedAt: new Date(),
  });
};

export const getKnowledgeBaseAttachments = async (
  id: string,
  organizationId: string,
  publishedOnly = false
) => {
  const article = await getKnowledgeBaseById(
    id,
    organizationId,
    publishedOnly
  );

  if (!article) {
    return null;
  }

  return article.attachments || [];
};

export const getKnowledgeBaseAttachmentById = async (
  id: string,
  organizationId: string,
  attachmentId: string,
  publishedOnly = false
) => {
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(attachmentId)) {
    return null;
  }

  const article = await knowledgeBaseRepository.findAttachmentByIdAndOrganization(
    id,
    organizationId,
    attachmentId,
    publishedOnly
  );

  if (!article) {
    return null;
  }

  const match = article.attachments.find((attachment) => attachment._id?.toString() === attachmentId);
  return match || null;
};

// ==========================================
// UPDATE KNOWLEDGE BASE ARTICLE
// ==========================================

export const updateKnowledgeBase = async (
  id: string,
  organizationId: string,
  updateData: {
    title?: string;
    content?: string;
    category?: string;
    articleType?: string;
    isPublished?: boolean;
  }
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  if (
    updateData.articleType &&
    !isValidKnowledgeBaseArticleType(updateData.articleType)
  ) {
    throw new Error(
      "Article type must be one of: Article, FAQ, Troubleshooting Guide, SOP"
    );
  }

  const normalizedUpdateData: {
    title?: string;
    content?: string;
    category?: string;
    articleType?: KnowledgeBaseArticleType;
    isPublished?: boolean;
  } = {
    title: updateData.title,
    content: updateData.content,
    category: updateData.category,
    isPublished: updateData.isPublished,
  };

  if (updateData.articleType) {
    normalizedUpdateData.articleType =
      updateData.articleType as KnowledgeBaseArticleType;
  }

  return knowledgeBaseRepository.updateByIdAndOrganization(
    id,
    organizationId,
    normalizedUpdateData
  );
};

// ==========================================
// DELETE KNOWLEDGE BASE ARTICLE
// ==========================================

export const deleteKnowledgeBase = async (
  id: string,
  organizationId: string
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return knowledgeBaseRepository.deleteByIdAndOrganization(
    id,
    organizationId
  );
};
