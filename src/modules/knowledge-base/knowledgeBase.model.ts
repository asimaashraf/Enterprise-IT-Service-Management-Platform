import mongoose, { Document, Schema } from "mongoose";

// ==========================================
// TYPES
// ==========================================

export type KnowledgeBaseArticleType =
  | "Article"
  | "FAQ"
  | "Troubleshooting Guide"
  | "SOP";

export interface IKnowledgeBaseAttachment {
  _id?: mongoose.Types.ObjectId;
  filename: string;
  mimeType: string;
  size: number;
  storageKey: string;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedAt: Date;
}

export interface IKnowledgeBase extends Document {
  title: string;
  content: string;
  category?: string;
  articleType: KnowledgeBaseArticleType;

  organizationId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  attachments: IKnowledgeBaseAttachment[];

  isPublished: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const knowledgeBaseAttachmentSchema =
  new Schema<IKnowledgeBaseAttachment>(
    {
      filename: {
        type: String,
        required: true,
        trim: true,
      },
      mimeType: {
        type: String,
        required: true,
        trim: true,
      },
      size: {
        type: Number,
        required: true,
        min: 0,
      },
      storageKey: {
        type: String,
        required: true,
        trim: true,
        validate: {
          validator(value: string) {
            return (
              /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(value) &&
              !value.split("/").some((segment) => segment === "..")
            );
          },
          message: "Attachment storageKey is invalid",
        },
      },
      uploadedBy: {
        type: Schema.Types.ObjectId,
        ref: "AuthUser",
        required: true,
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },
    { _id: true }
  );

// ==========================================
// SCHEMA
// ==========================================

const knowledgeBaseSchema =
  new Schema<IKnowledgeBase>(
    {
      title: {
        type: String,
        required: true,
        trim: true,
      },

      content: {
        type: String,
        required: true,
        trim: true,
      },

      category: {
        type: String,
        trim: true,
      },

      articleType: {
        type: String,
        enum: [
          "Article",
          "FAQ",
          "Troubleshooting Guide",
          "SOP",
        ],
        default: "Article",
      },

      organizationId: {
        type: Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
      },

      createdBy: {
        type: Schema.Types.ObjectId,
        ref: "AuthUser",
        required: true,
      },

      attachments: {
        type: [knowledgeBaseAttachmentSchema],
        default: [],
      },

      isPublished: {
        type: Boolean,
        default: false,
      },
    },
    {
      timestamps: true,
    }
  );

// ==========================================
// INDEXES
// ==========================================

// Helps queries that retrieve articles
// belonging to a specific organization.
knowledgeBaseSchema.index({
  organizationId: 1,
});

// Helps organization-based filtering
// by published status.
knowledgeBaseSchema.index({
  organizationId: 1,
  isPublished: 1,
});

// Text search over title, content, and category
// within the tenant.
knowledgeBaseSchema.index({
  organizationId: 1,
  title: "text",
  content: "text",
  category: "text",
});

// Helps sorting articles by newest first
// within an organization.
knowledgeBaseSchema.index({
  organizationId: 1,
  createdAt: -1,
});

knowledgeBaseSchema.index({
  organizationId: 1,
  articleType: 1,
});

// ==========================================
// MODEL
// ==========================================

const KnowledgeBase =
  mongoose.model<IKnowledgeBase>(
    "KnowledgeBase",
    knowledgeBaseSchema
  );

export default KnowledgeBase;