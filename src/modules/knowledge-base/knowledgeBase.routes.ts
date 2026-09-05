import { Router } from "express";

import {
  addKnowledgeBaseAttachmentController,
  createKnowledgeBaseController,
  getKnowledgeBaseAttachmentByIdController,
  getKnowledgeBaseAttachmentsController,
  getKnowledgeBasesController,
  getKnowledgeBaseByIdController,
  searchKnowledgeBasesController,
  updateKnowledgeBaseController,
  deleteKnowledgeBaseController,
} from "./knowledgeBase.controller";

import {
  authenticate,
  authorize,
} from "../../middleware/auth.middleware";

const router = Router();

// ==========================================
// CREATE KNOWLEDGE BASE ARTICLE
// ADMIN ONLY
// ==========================================

router.post(
  "/",
  authenticate,
  authorize("admin"),
  createKnowledgeBaseController
);

// ==========================================
// GET ALL KNOWLEDGE BASE ARTICLES
// ADMIN + EMPLOYEE
// ==========================================

router.get(
  "/",
  authenticate,
  getKnowledgeBasesController
);

// ==========================================
// SEARCH KNOWLEDGE BASE ARTICLES
// ADMIN + EMPLOYEE
// ==========================================

router.get(
  "/search",
  authenticate,
  searchKnowledgeBasesController
);

// ==========================================
// GET KNOWLEDGE BASE ARTICLE BY ID
// ADMIN + EMPLOYEE
// ==========================================

router.get(
  "/:id",
  authenticate,
  getKnowledgeBaseByIdController
);

// ==========================================
// ATTACHMENT ROUTES
// ==========================================

router.post(
  "/:id/attachments",
  authenticate,
  authorize("admin"),
  addKnowledgeBaseAttachmentController
);

router.get(
  "/:id/attachments",
  authenticate,
  getKnowledgeBaseAttachmentsController
);

router.get(
  "/:id/attachments/:attachmentId",
  authenticate,
  getKnowledgeBaseAttachmentByIdController
);

// ==========================================
// UPDATE KNOWLEDGE BASE ARTICLE
// ADMIN ONLY
// ==========================================

router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  updateKnowledgeBaseController
);

// ==========================================
// DELETE KNOWLEDGE BASE ARTICLE
// ADMIN ONLY
// ==========================================

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  deleteKnowledgeBaseController
);

export default router;