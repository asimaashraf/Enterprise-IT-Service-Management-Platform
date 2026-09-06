import bcrypt from "bcrypt";
import mongoose from "mongoose";

import { authRepository } from "../auth/auth.repository";
import { organizationRepository } from "../organization/organization.repository";
import { generateSecureToken, hashToken } from "../../utils/crypto";
import { enqueueInvitationEmail } from "./invitation.email";
import { invitationRepository } from "./invitation.repository";

/** How long an invitation link remains valid. */
const INVITATION_TOKEN_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

// ==========================================
// TYPES
// ==========================================

export interface InvitationDetails {
  id: string;
  email: string;
  role: "admin" | "employee";
  organizationId: string;
  organizationName: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  invitedBy: { id: string; name: string; email: string } | null;
}

export interface InvitationValidation {
  email: string;
  role: "admin" | "employee";
  organizationId: string;
  organizationName: string;
  expiresAt: string;
}

// ==========================================
// CREATE INVITATION (admin only)
// ==========================================

export const createInvitation = async (
  adminId: string,
  adminOrganizationId: string,
  email: string,
  role: "admin" | "employee"
): Promise<InvitationDetails> => {
  if (!mongoose.Types.ObjectId.isValid(adminId)) {
    throw new Error("Invalid admin id");
  }
  if (!mongoose.Types.ObjectId.isValid(adminOrganizationId)) {
    throw new Error("Invalid organization");
  }
  if (!email || typeof email !== "string") {
    throw new Error("Email is required");
  }
  const normalizedEmail = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("Invalid email address");
  }
  if (role !== "admin" && role !== "employee") {
    throw new Error("Invalid role");
  }

  // Verify admin is actually in this organization and active.
  const admin = await authRepository.findByIdAndOrganization(
    adminId,
    adminOrganizationId
  );
  if (!admin) {
    throw new Error("Admin not found in this organization");
  }
  if (admin.role !== "admin") {
    throw new Error("Only admins may invite users");
  }

  // Verify the target organization exists and is active.
  const org = await organizationRepository.findById(adminOrganizationId);
  if (!org) {
    throw new Error("Organization not found");
  }
  if (!org.isActive) {
    throw new Error("Organization is inactive");
  }

  // Reject if a user with this email already exists anywhere on the
  // platform — invitations cannot create a duplicate user.
  const existing = await authRepository.findByEmail(normalizedEmail);
  if (existing) {
    throw new Error("A user with this email already exists");
  }

  // Reject if a pending invitation for the same email already exists in
  // the same organization. This prevents accidental duplicate invites
  // and ensures each pending token is unique per email.
  const existingPending =
    await invitationRepository.findPendingByEmailInOrganization(
      normalizedEmail,
      adminOrganizationId
    );
  if (existingPending) {
    throw new Error(
      "A pending invitation already exists for this email. Revoke it before creating a new one."
    );
  }

  // Generate the raw token and store only its hash.
  const rawToken = generateSecureToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + INVITATION_TOKEN_TTL_MS);

  const invitation = await invitationRepository.create({
    tokenHash,
    email: normalizedEmail,
    role,
    organizationId: new mongoose.Types.ObjectId(adminOrganizationId),
    invitedBy: new mongoose.Types.ObjectId(adminId),
    expiresAt,
    status: "pending",
  });

  // Enqueue invitation email. The raw token is sent through the email —
  // only the hash lives in the database.
  try {
    await enqueueInvitationEmail(
      normalizedEmail,
      admin.name,
      org.name,
      role,
      rawToken
    );
  } catch (error) {
    console.error(
      "Failed to enqueue invitation email:",
      (error as Error).message
    );
  }

  return {
    id: invitation._id.toString(),
    email: invitation.email,
    role: invitation.role,
    organizationId: invitation.organizationId.toString(),
    organizationName: org.name,
    status: invitation.status,
    expiresAt: invitation.expiresAt.toISOString(),
    createdAt: invitation.createdAt.toISOString(),
    invitedBy: {
      id: admin._id.toString(),
      name: admin.name,
      email: admin.email,
    },
  };
};

// ==========================================
// VALIDATE INVITATION (public)
// ==========================================

/**
 * Validates a raw invitation token and returns the invite details if the
 * token is valid, not expired, and not consumed/revoked. Does NOT consume
 * the token — the acceptance endpoint does that.
 */
export const validateInvitation = async (
  rawToken: string
): Promise<InvitationValidation> => {
  if (!rawToken || typeof rawToken !== "string") {
    throw new Error("Invalid invitation token");
  }

  const tokenHash = hashToken(rawToken);
  const invitation = await invitationRepository.findByTokenHash(tokenHash);

  if (!invitation) {
    throw new Error("Invitation not found");
  }

  if (invitation.status !== "pending") {
    if (invitation.status === "accepted") {
      throw new Error("This invitation has already been accepted");
    }
    if (invitation.status === "revoked") {
      throw new Error("This invitation has been revoked");
    }
    throw new Error("This invitation is no longer valid");
  }

  if (invitation.expiresAt.getTime() < Date.now()) {
    throw new Error("This invitation has expired");
  }

  const org = await organizationRepository.findById(
    invitation.organizationId.toString()
  );

  if (!org || !org.isActive) {
    throw new Error("The organization is not available");
  }

  // If a user with this email already exists, the invitation cannot be
  // accepted (someone may have re-registered). This is a valid edge case.
  const existingUser = await authRepository.findByEmail(invitation.email);
  if (existingUser) {
    throw new Error(
      "An account with this email already exists. Please sign in."
    );
  }

  return {
    email: invitation.email,
    role: invitation.role,
    organizationId: invitation.organizationId.toString(),
    organizationName: org.name,
    expiresAt: invitation.expiresAt.toISOString(),
  };
};

// ==========================================
// ACCEPT INVITATION (public)
// ==========================================

export const acceptInvitation = async (
  rawToken: string,
  name: string,
  password: string
): Promise<{
  user: {
    id: string;
    name: string;
    email: string;
    role: "admin" | "employee";
    organizationId: string;
  };
  organizationName: string;
}> => {
  if (!rawToken || typeof rawToken !== "string") {
    throw new Error("Invalid invitation token");
  }
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    throw new Error("Name must be at least 2 characters");
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const tokenHash = hashToken(rawToken);

  // First: look up the invitation to check expiry.
  // If expired, we reject WITHOUT modifying the record.
  const existing = await invitationRepository.findByTokenHash(tokenHash);
  if (!existing) {
    throw new Error("Invitation not found");
  }
  if (existing.status === "accepted") {
    throw new Error("This invitation has already been accepted");
  }
  if (existing.status === "revoked") {
    throw new Error("This invitation has been revoked");
  }
  if (existing.status !== "pending") {
    throw new Error("This invitation is no longer valid");
  }
  if (existing.expiresAt.getTime() < Date.now()) {
    throw new Error("This invitation has expired");
  }

  // Atomic consume: only succeeds if the invitation is still pending.
  const invitation =
    await invitationRepository.consumePendingByTokenHash(tokenHash);

  if (!invitation) {
    // Another concurrent request consumed it first — treat as already used.
    throw new Error("This invitation has already been accepted");
  }

  // Re-validate the organization at acceptance time.
  const org = await organizationRepository.findById(
    invitation.organizationId.toString()
  );
  if (!org || !org.isActive) {
    throw new Error("The organization is not available");
  }

  // Refuse if a user with this email has since been created
  // (e.g., the invitation email was re-registered via the legacy path).
  const existingUser = await authRepository.findByEmail(invitation.email);
  if (existingUser) {
    throw new Error(
      "An account with this email already exists. Please sign in."
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Create the user attached to the invited organization. The email
  // already comes from the verified invitation record — the browser
  // cannot influence it.
  const user = await authRepository.create({
    name: name.trim(),
    email: invitation.email,
    password: hashedPassword,
    role: invitation.role,
    organizationId: invitation.organizationId,
    // Email ownership is proven by possessing the invitation link sent to
    // that inbox. Auto-verifying avoids a redundant second verification
    // step and matches the bootstrap-admin behavior. The hash-only token
    // and atomic consume gate this on the server.
    isEmailVerified: true,
  });

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId.toString(),
    },
    organizationName: org.name,
  };
};

// ==========================================
// LIST INVITATIONS (admin, tenant-scoped)
// ==========================================

export const listInvitations = async (
  organizationId: string
): Promise<InvitationDetails[]> => {
  if (!mongoose.Types.ObjectId.isValid(organizationId)) {
    throw new Error("Invalid organization");
  }
  const invitations =
    await invitationRepository.findByOrganization(organizationId);
  const org = await organizationRepository.findById(organizationId);
  const orgName = org?.name ?? "";

  return invitations.map((inv) => ({
    id: inv._id.toString(),
    email: inv.email,
    role: inv.role,
    organizationId: inv.organizationId.toString(),
    organizationName: orgName,
    status: inv.status,
    expiresAt: inv.expiresAt.toISOString(),
    createdAt: inv.createdAt.toISOString(),
    invitedBy: null,
  }));
};

// ==========================================
// REVOKE INVITATION (admin, tenant-scoped)
// ==========================================

export const revokeInvitation = async (
  invitationId: string,
  organizationId: string
): Promise<InvitationDetails | null> => {
  if (!mongoose.Types.ObjectId.isValid(invitationId)) {
    return null;
  }
  const updated = await invitationRepository.revokeById(
    invitationId,
    organizationId
  );
  if (!updated) return null;
  const org = await organizationRepository.findById(organizationId);
  return {
    id: updated._id.toString(),
    email: updated.email,
    role: updated.role,
    organizationId: updated.organizationId.toString(),
    organizationName: org?.name ?? "",
    status: updated.status,
    expiresAt: updated.expiresAt.toISOString(),
    createdAt: updated.createdAt.toISOString(),
    invitedBy: null,
  };
};
