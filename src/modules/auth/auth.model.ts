import mongoose, { Document, Schema } from "mongoose";

export interface IAuthUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "admin" | "employee";
  organizationId: mongoose.Types.ObjectId;
  isActive: boolean;
  isEmailVerified: boolean;
  // Email verification (hash-only storage; never plaintext).
  emailVerificationTokenHash: string | null;
  emailVerificationExpiresAt: Date | null;
  // Password reset (hash-only storage; never plaintext).
  passwordResetTokenHash: string | null;
  passwordResetExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const authUserSchema = new Schema<IAuthUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
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
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // Email verification.
    // Default behaviour:
    //  - Public registrations: created as `isEmailVerified: false` and the
    //    account is required to verify before the next login.
    //  - Bootstrapped admin: created as `isEmailVerified: true` so the
    //    initial admin can log in immediately without SMTP setup. This
    //    matches the documented behaviour that bootstrap is an offline,
    //    operator-driven action gated by `BOOTSTRAP_TOKEN`.
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationTokenHash: {
      type: String,
      default: null,
      select: false,
    },

    emailVerificationExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },

    // Password reset.
    passwordResetTokenHash: {
      type: String,
      default: null,
      select: false,
    },

    passwordResetExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IAuthUser>(
  "AuthUser",
  authUserSchema
);
