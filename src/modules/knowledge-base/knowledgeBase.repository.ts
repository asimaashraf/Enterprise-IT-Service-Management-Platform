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
    organizationId: string
  ): Promise<IKnowledgeBase[]> => {
    return KnowledgeBase.find({
      organizationId: new mongoose.Types.ObjectId(
        organizationId
      ),
    }).sort({
      createdAt: -1,
    });
  },

  findByIdAndOrganization: async (
    id: string,
    organizationId: string
  ): Promise<IKnowledgeBase | null> => {
    return KnowledgeBase.findOne({
      _id: id,
      organizationId: new mongoose.Types.ObjectId(
        organizationId
      ),
    });
  },

  searchByOrganization: async (
    organizationId: string,
    query: string
  ): Promise<IKnowledgeBase[]> => {
    const sanitizedQuery = query.trim();

    if (!sanitizedQuery) {
      return knowledgeBaseRepository.findAllByOrganization(
        organizationId
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
      $and: terms.map((term) => ({
        $or: [
          { title: { $regex: term, $options: "i" } },
          { content: { $regex: term, $options: "i" } },
          { category: { $regex: term, $options: "i" } },
        ],
      })),
    }).sort({ createdAt: -1 });
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
    attachmentId: string
  ): Promise<IKnowledgeBase | null> => {
    return KnowledgeBase.findOne({
      _id: id,
      organizationId: new mongoose.Types.ObjectId(
        organizationId
      ),
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