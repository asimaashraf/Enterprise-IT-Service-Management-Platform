import mongoose, { Document, Schema } from "mongoose";

export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

export interface IInvitation extends Document {
  /** SHA-256 hash of the raw invite token. Never store raw tokens. */
  tokenHash: string;
  /** The invited email address (lowercased). */
  email: string;
  /** Role to grant upon acceptance: "admin" or "employee". */
  role: "admin" | "employee";
  /** Organization the invitee will join. */
  organizationId: mongoose.Types.ObjectId;
  /** Admin who created this invitation. */
  invitedBy: mongoose.Types.ObjectId;
  /** When the invitation expires. */
  expiresAt: Date;
  /** Current lifecycle status. */
  status: InvitationStatus;
  /** When the invitation was accepted (if applicable). */
  acceptedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const invitationSchema = new Schema<IInvitation>(
  {
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "employee"],
      default: "employee",
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "AuthUser",
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "revoked", "expired"],
      default: "pending",
      index: true,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast lookup during invitation validation.
invitationSchema.index({ tokenHash: 1, status: 1, expiresAt: 1 });

export default mongoose.model<IInvitation>("Invitation", invitationSchema);
