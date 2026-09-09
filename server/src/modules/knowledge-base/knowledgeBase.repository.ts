import mongoose from "mongoose";

import KnowledgeBase, {
  IKnowledgeBase,
  IKnowledgeBaseAttachment,
} from "./knowledgeBase.model";

// ==========================================
// KNOWLEDGE BASE REPOSITORY
// ==========================================

export const knowledgeBaseRepository = {
  create: async (
    data: Partial<IKnowledgeBase>
  ): Promise<IKnowledgeBase> => {
    return KnowledgeBase.create(data);
  },

  findAllByOrganization: async (
    organizationId: string,
    publishedOnly = false
  ): Promise<IKnowledgeBase[]> => {
    return KnowledgeBase.find({
      organizationId: new mongoose.Types.ObjectId(
        organizationId
      ),
      ...(publishedOnly ? { isPublished: true } : {}),
    })
      .sort({
        createdAt: -1,
      })
      .populate("createdBy", "name");
  },

  findByIdAndOrganization: async (
    id: string,
    organizationId: string,
    publishedOnly = false
  ): Promise<IKnowledgeBase | null> => {
    return KnowledgeBase.findOne({
      _id: id,
      organizationId: new mongoose.Types.ObjectId(
        organizationId
      ),
      ...(publishedOnly ? { isPublished: true } : {}),
    }).populate("createdBy", "name");
  },

  searchByOrganization: async (
    organizationId: string,
    query: string,
    publishedOnly = false
  ): Promise<IKnowledgeBase[]> => {
    const sanitizedQuery = query.trim();

    if (!sanitizedQuery) {
      return knowledgeBaseRepository.findAllByOrganization(
        organizationId,
        publishedOnly
      );
    }

    const terms = sanitizedQuery
      .split(/\s+/)
      .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .filter(Boolean);

    return KnowledgeBase.find({
      organizationId: new mongoose.Types.ObjectId(
        organizationId
      ),
      ...(publishedOnly ? { isPublished: true } : {}),
      $and: terms.map((term) => ({
        $or: [
          { title: { $regex: term, $options: "i" } },
          { content: { $regex: term, $options: "i" } },
          { category: { $regex: term, $options: "i" } },
        ],
      })),
    })
      .sort({ createdAt: -1 })
      .populate("createdBy", "name");
  },

  addAttachmentToArticle: async (
    id: string,
    organizationId: string,
    attachment: IKnowledgeBaseAttachment
  ): Promise<IKnowledgeBase | null> => {
    return KnowledgeBase.findOneAndUpdate(
      {
        _id: id,
        organizationId: new mongoose.Types.ObjectId(
          organizationId
        ),
      },
      {
        $push: {
          attachments: { ...attachment },
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      }
    );
  },

  findAttachmentByIdAndOrganization: async (
    id: string,
    organizationId: string,
    attachmentId: string,
    publishedOnly = false
  ): Promise<IKnowledgeBase | null> => {
    return KnowledgeBase.findOne({
      _id: id,
      organizationId: new mongoose.Types.ObjectId(
        organizationId
      ),
      ...(publishedOnly ? { isPublished: true } : {}),
      attachments: {
        $elemMatch: { _id: attachmentId },
      },
    });
  },

  updateByIdAndOrganization: async (
    id: string,
    organizationId: string,
    updateData: Partial<IKnowledgeBase>
  ): Promise<IKnowledgeBase | null> => {
    return KnowledgeBase.findOneAndUpdate(
      {
        _id: id,
        organizationId: new mongoose.Types.ObjectId(
          organizationId
        ),
      },
      updateData,
      {
        returnDocument: "after",
        runValidators: true,
      }
    );
  },

  deleteByIdAndOrganization: async (
    id: string,
    organizationId: string
  ): Promise<IKnowledgeBase | null> => {
    return KnowledgeBase.findOneAndDelete({
      _id: id,
      organizationId: new mongoose.Types.ObjectId(
        organizationId
      ),
    });
  },
};
