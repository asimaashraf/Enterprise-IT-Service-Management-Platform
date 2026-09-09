import mongoose, { Document, Schema } from "mongoose";

export interface IDepartment extends Document {
  name: string;
  description?: string;
  organizationId: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new Schema<IDepartment>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
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

// Prevent duplicate department names inside the same organization
departmentSchema.index(
  { organizationId: 1, name: 1 },
  { unique: true }
);

const Department = mongoose.model<IDepartment>(
  "Department",
  departmentSchema
);

export default Department;