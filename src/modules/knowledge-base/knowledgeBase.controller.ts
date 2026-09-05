import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";

import {
  addKnowledgeBaseAttachment,
  createKnowledgeBase,
  getKnowledgeBaseAttachmentById,
  getKnowledgeBaseAttachments,
  getKnowledgeBases,
  getKnowledgeBaseById,
  searchKnowledgeBases,
  updateKnowledgeBase,
  deleteKnowledgeBase,
} from "./knowledgeBase.service";

// ==========================================
// CREATE KNOWLEDGE BASE ARTICLE
// ADMIN ONLY
// ==========================================

export const createKnowledgeBaseController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const {
      title,
      content,
      category,
      articleType,
      isPublished,
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required",
      });
    }

    if (articleType && !["Article", "FAQ", "Troubleshooting Guide", "SOP"].includes(articleType)) {
      return res.status(400).json({
        success: false,
        message: "Article type must be one of: Article, FAQ, Troubleshooting Guide, SOP",
      });
    }

    if (!req.user?.organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization information is missing",
      });
    }

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "User information is missing",
      });
    }

    const article = await createKnowledgeBase(
      title,
      content,
      category,
      req.user.organizationId,
      req.user.id,
      articleType ?? "Article",
      isPublished ?? false
    );

    return res.status(201).json({
      success: true,
      message: "Knowledge base article created successfully",
      data: article,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET ALL KNOWLEDGE BASE ARTICLES
// ADMIN + EMPLOYEE
// ==========================================

export const getKnowledgeBasesController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization information is missing",
      });
    }

    const articles = await getKnowledgeBases(
      req.user.organizationId
    );

    return res.status(200).json({
      success: true,
      data: articles,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET KNOWLEDGE BASE ARTICLE BY ID
// ADMIN + EMPLOYEE
// ==========================================

export const getKnowledgeBaseByIdController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization information is missing",
      });
    }

    const article = await getKnowledgeBaseById(
      req.params.id as string,
      req.user.organizationId
    );

    if (!article) {
      return res.status(404).json({
        success: false,
        message: "Knowledge base article not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: article,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const searchKnowledgeBasesController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization information is missing",
      });
    }

    const query = (req.query.q as string) || "";
    const articles = await searchKnowledgeBases(
      req.user.organizationId,
      query
    );

    return res.status(200).json({
      success: true,
      data: articles,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const addKnowledgeBaseAttachmentController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization information is missing",
      });
    }

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "User information is missing",
      });
    }

    const { filename, mimeType, size, storageKey } = req.body;
    const article = await addKnowledgeBaseAttachment(
      req.params.id as string,
      req.user.organizationId,
      {
        filename,
        mimeType,
        size,
        storageKey,
        uploadedBy: req.user.id,
      }
    );

    if (!article) {
      return res.status(404).json({
        success: false,
        message: "Knowledge base article not found",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Attachment added successfully",
      data: article.attachments[article.attachments.length - 1],
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getKnowledgeBaseAttachmentsController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization information is missing",
      });
    }

    const attachments = await getKnowledgeBaseAttachments(
      req.params.id as string,
      req.user.organizationId
    );

    if (!attachments) {
      return res.status(404).json({
        success: false,
        message: "Knowledge base article not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: attachments,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getKnowledgeBaseAttachmentByIdController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization information is missing",
      });
    }

    const attachment = await getKnowledgeBaseAttachmentById(
      req.params.id as string,
      req.user.organizationId,
      req.params.attachmentId as string
    );

    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: "Attachment not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: attachment,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// UPDATE KNOWLEDGE BASE ARTICLE
// ADMIN ONLY
// ==========================================

export const updateKnowledgeBaseController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization information is missing",
      });
    }

    const { articleType } = req.body;

    if (
      articleType &&
      !["Article", "FAQ", "Troubleshooting Guide", "SOP"].includes(articleType)
    ) {
      return res.status(400).json({
        success: false,
        message: "Article type must be one of: Article, FAQ, Troubleshooting Guide, SOP",
      });
    }

    const article = await updateKnowledgeBase(
      req.params.id as string,
      req.user.organizationId,
      req.body
    );

    if (!article) {
      return res.status(404).json({
        success: false,
        message: "Knowledge base article not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Knowledge base article updated successfully",
      data: article,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// DELETE KNOWLEDGE BASE ARTICLE
// ADMIN ONLY
// ==========================================

export const deleteKnowledgeBaseController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization information is missing",
      });
    }

    const article = await deleteKnowledgeBase(
      req.params.id as string,
      req.user.organizationId
    );

    if (!article) {
      return res.status(404).json({
        success: false,
        message: "Knowledge base article not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Knowledge base article deleted successfully",
      data: article,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};