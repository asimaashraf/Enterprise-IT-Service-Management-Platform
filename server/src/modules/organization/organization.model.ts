import mongoose, {
  Document,
  Schema,
} from "mongoose";

// ==========================================
// ORGANIZATION INTERFACE
// ==========================================

export interface IOrganization extends Document {
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// ORGANIZATION SCHEMA
// ==========================================

const organizationSchema =
  new Schema<IOrganization>(
    {
      // ----------------------------------------
      // ORGANIZATION NAME
      // ----------------------------------------

      name: {
        type: String,
        required: [true, "Organization name is required"],
        trim: true,
        unique: true,
      },

      // ----------------------------------------
      // ORGANIZATION SLUG
      // ----------------------------------------

      slug: {
        type: String,
        required: [true, "Organization slug is required"],
        trim: true,
        lowercase: true,
        unique: true,
      },

      // ----------------------------------------
      // DESCRIPTION
      // ----------------------------------------

      description: {
        type: String,
        trim: true,
        default: "",
      },

      // ----------------------------------------
      // ACTIVE STATUS
      // ----------------------------------------

      isActive: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
    }
  );

// ==========================================
// ORGANIZATION MODEL
// ==========================================

const Organization =
  mongoose.model<IOrganization>(
    "Organization",
    organizationSchema
  );

export default Organization;