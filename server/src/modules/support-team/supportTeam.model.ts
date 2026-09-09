import mongoose, {
  Document,
  Schema,
} from "mongoose";

export interface ISupportTeam extends Document {
  name: string;
  description?: string;
  organizationId: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const supportTeamSchema =
  new Schema<ISupportTeam>(
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

      members: [
        {
          type: Schema.Types.ObjectId,
          ref: "AuthUser",
        },
      ],

      isActive: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
    }
  );

// Prevent duplicate team names
// inside the same organization
supportTeamSchema.index(
  {
    organizationId: 1,
    name: 1,
  },
  {
    unique: true,
  }
);

const SupportTeam =
  mongoose.model<ISupportTeam>(
    "SupportTeam",
    supportTeamSchema
  );

export default SupportTeam;