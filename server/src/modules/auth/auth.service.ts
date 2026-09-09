
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import { IAuthUser } from "./auth.model";
import { authRepository } from "./auth.repository";
import { organizationRepository } from "../organization/organization.repository";
import {
  generateSecureToken,
  hashToken,
} from "../../utils/crypto";
import {
  enqueueVerificationEmail,
  enqueuePasswordResetEmail,
} from "./auth.email";

interface RegisterUserData {
  name: string;
  email: string;
  password: string;
  organizationId: string;
  role?: "admin" | "employee";
}

interface LoginUserData {
  email: string;
  password: string;
}

interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: "admin" | "employee";
    organizationId: string;
  };
  token: string;
}

export interface RegistrationResponse {
  user: AuthResponse["user"];
}

interface BootstrapData {
  bootstrapToken: string;
  organizationName: string;
  organizationSlug: string;
  organizationDescription?: string;
  name: string;
  email: string;
  password: string;
}

// ==========================================
// CONSTANTS
// ==========================================

/** How long a verification link remains valid. */
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
/** How long a password-reset link remains valid. */
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// ==========================================
// BOOTSTRAP
// ==========================================

export const bootstrapAdmin = async (
  data: BootstrapData
): Promise<AuthResponse> => {
  if (!process.env.BOOTSTRAP_TOKEN) {
    throw new Error("Bootstrap is not configured");
  }

  if (data.bootstrapToken !== process.env.BOOTSTRAP_TOKEN) {
    throw new Error("Invalid bootstrap token");
  }

  if ((await authRepository.countUsers()) > 0) {
    throw new Error("Bootstrap is already completed");
  }

  const organization = await organizationRepository.create({
    name: data.organizationName,
    slug: data.organizationSlug,
    description: data.organizationDescription,
  });

  try {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await authRepository.create({
      name: data.name,
      email: data.email.toLowerCase().trim(),
      password: hashedPassword,
      role: "admin",
      organizationId: organization._id,
      // Bootstrap admins are operator-created via a one-time, gated
      // endpoint. They are auto-verified so the very first login can
      // succeed before SMTP is configured.
      isEmailVerified: true,
    });

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: organization._id.toString(),
      },
      token: generateJwtToken(user),
    };
  } catch (error) {
    await organizationRepository.deleteById(organization._id.toString());
    throw error;
  }
};

// ==========================================
// REGISTER USER
// ==========================================

export const registerUser = async (
  data: RegisterUserData
): Promise<RegistrationResponse> => {
  const existingUser = await authRepository.findOne({
    email: data.email.toLowerCase(),
  });

  if (existingUser) {
    throw new Error("A user with this email already exists");
  }

  const organization = await organizationRepository.findById(
    data.organizationId
  );

  if (!organization) {
    throw new Error("Organization not found");
  }

  if (!organization.isActive) {
    throw new Error("Organization is inactive");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  // Generate a verification token, store only its hash.
  const rawToken = generateSecureToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(
    Date.now() + VERIFICATION_TOKEN_TTL_MS
  );

  const user = await authRepository.create({
    name: data.name,
    email: data.email.toLowerCase(),
    password: hashedPassword,

    // Public registration must never grant administrative access.
    // Client-provided roles are intentionally ignored.
    role: "employee",

    organizationId: new mongoose.Types.ObjectId(
      data.organizationId
    ),

    // New public registrations start unverified.
    isEmailVerified: false,
    emailVerificationTokenHash: tokenHash,
    emailVerificationExpiresAt: expiresAt,
  });

  // Queue the verification email. The raw token is sent through the
  // email — only the hash lives in the database.
  try {
    await enqueueVerificationEmail(
      user.email,
      user.name,
      rawToken
    );
  } catch (error) {
    // Do not fail registration if the mail queue is unavailable;
    // the user can request a resend from the login screen.
    console.error(
      "Failed to enqueue verification email:",
      (error as Error).message
    );
  }

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId.toString(),
    },
  };
};

// ==========================================
// LOGIN USER
// ==========================================

export const loginUser = async (
  data: LoginUserData
): Promise<AuthResponse> => {
  const user = await authRepository.findOne({
    email: data.email.toLowerCase(),
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  if (!user.isActive) {
    throw new Error("User account is inactive");
  }

  const organization = await organizationRepository.findById(
    user.organizationId.toString()
  );

  if (!organization) {
    throw new Error("Organization not found");
  }

  if (!organization.isActive) {
    throw new Error("Organization is inactive");
  }

  const passwordMatch = await bcrypt.compare(
    data.password,
    user.password
  );

  if (!passwordMatch) {
    throw new Error("Invalid email or password");
  }

  // Enforce email verification for public registrations.
  // Bootstrap-created admins are created with isEmailVerified=true
  // (see `bootstrapAdmin`).
  if (!user.isEmailVerified) {
    throw new Error(
      "Please verify your email address before signing in"
    );
  }

  const token = generateJwtToken(user);

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId.toString(),
    },
    token,
  };
};

// ==========================================
// VERIFY EMAIL
// ==========================================

/**
 * Verifies an email using the raw token sent in the verification link.
 * The token is hashed with SHA-256 and matched against the persisted
 * hash. Successful verification clears the token + expiry fields.
 */
export const verifyEmail = async (rawToken: string): Promise<void> => {
  if (!rawToken || typeof rawToken !== "string") {
    throw new Error("Invalid verification token");
  }

  const tokenHash = hashToken(rawToken);

  const user = await authRepository.findOneWithTokens({
    emailVerificationTokenHash: tokenHash,
  });

  if (!user) {
    throw new Error("Invalid or expired verification token");
  }

  if (
    !user.emailVerificationExpiresAt ||
    user.emailVerificationExpiresAt.getTime() < Date.now()
  ) {
    throw new Error("Invalid or expired verification token");
  }

  await authRepository.markEmailVerified(user._id.toString());
};

// ==========================================
// RESEND VERIFICATION EMAIL
// ==========================================

/**
 * Re-issues a verification token and re-queues the verification email.
 * The response is intentionally generic to avoid leaking which emails
 * are registered.
 */
export const resendVerification = async (
  email: string
): Promise<void> => {
  const user = await authRepository.findOne({
    email: email.toLowerCase().trim(),
  });

  if (!user) {
    return;
  }

  if (user.isEmailVerified) {
    return;
  }

  const rawToken = generateSecureToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(
    Date.now() + VERIFICATION_TOKEN_TTL_MS
  );

  await authRepository.setVerificationToken(
    user._id.toString(),
    tokenHash,
    expiresAt
  );

  try {
    await enqueueVerificationEmail(
      user.email,
      user.name,
      rawToken
    );
  } catch (error) {
    console.error(
      "Failed to enqueue verification email:",
      (error as Error).message
    );
  }
};

// ==========================================
// FORGOT PASSWORD
// ==========================================

/**
 * Always succeeds from the caller's perspective — never reveals whether
 * the email is registered. If the user exists, a one-time reset link
 * is generated, hashed, and emailed. The raw token is never persisted.
 */
export const requestPasswordReset = async (
  email: string
): Promise<void> => {
  const user = await authRepository.findOne({
    email: email.toLowerCase().trim(),
  });

  if (!user) {
    return;
  }

  if (!user.isActive) {
    return;
  }

  const rawToken = generateSecureToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(
    Date.now() + PASSWORD_RESET_TOKEN_TTL_MS
  );

  await authRepository.setResetToken(
    user._id.toString(),
    tokenHash,
    expiresAt
  );

  try {
    await enqueuePasswordResetEmail(
      user.email,
      user.name,
      rawToken
    );
  } catch (error) {
    console.error(
      "Failed to enqueue password reset email:",
      (error as Error).message
    );
  }
};

// ==========================================
// RESET PASSWORD
// ==========================================

/**
 * Resets the password for a user holding a valid reset token. The
 * token is hashed and matched against the stored hash. On success
 * the password is re-hashed with bcrypt (10 rounds — same policy as
 * the rest of the auth surface) and the reset token is cleared.
 */
export const resetPassword = async (
  rawToken: string,
  newPassword: string
): Promise<void> => {
  if (!rawToken || typeof rawToken !== "string") {
    throw new Error("Invalid or expired reset token");
  }
  if (!newPassword || newPassword.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const tokenHash = hashToken(rawToken);

  const user = await authRepository.findOneWithTokens({
    passwordResetTokenHash: tokenHash,
  });

  if (!user) {
    throw new Error("Invalid or expired reset token");
  }

  if (
    !user.passwordResetExpiresAt ||
    user.passwordResetExpiresAt.getTime() < Date.now()
  ) {
    throw new Error("Invalid or expired reset token");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await authRepository.setPassword(
    user._id.toString(),
    hashedPassword
  );

  await authRepository.clearResetToken(user._id.toString());
};

// ==========================================
// GENERATE JWT
// ==========================================

const generateJwtToken = (user: IAuthUser): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId.toString(),
    },
    secret,
    {
      expiresIn: "7d",
    }
  );
};
