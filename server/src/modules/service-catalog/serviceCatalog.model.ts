import mongoose, { Document, Schema } from "mongoose";

export interface IServiceCatalog extends Document {
  name: string;
  description: string;
  category?: string;
  organizationId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const serviceCatalogSchema = new Schema<IServiceCatalog>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      trim: true,
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

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IServiceCatalog>(
  "ServiceCatalog",
  serviceCatalogSchema
);