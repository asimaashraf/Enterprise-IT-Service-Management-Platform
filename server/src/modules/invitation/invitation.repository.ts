import Invitation, { IInvitation } from "./invitation.model";

/**
 * Repository for invitations.
 *
 * Tokens are stored only as SHA-256 hashes. All operations that need to
 * match a token use the hash as input.
 */
export const invitationRepository = {
  create: async (data: Partial<IInvitation>): Promise<IInvitation> => {
    return Invitation.create(data);
  },

  findById: async (id: string): Promise<IInvitation | null> => {
    return Invitation.findById(id);
  },

  /**
   * Find an invitation by its raw token's SHA-256 hash.
   * The tokenHash field is `select: false` on the schema, so we re-include
   * it explicitly here. We also allow the caller to receive every other
   * field by passing `+` (which means "include normally-hidden fields").
   */
  findByTokenHash: async (tokenHash: string): Promise<IInvitation | null> => {
    return Invitation.findOne({ tokenHash }).select("+tokenHash");
  },

  findPendingByTokenHash: async (
    tokenHash: string
  ): Promise<IInvitation | null> => {
    return Invitation.findOne({ tokenHash, status: "pending" }).select(
      "+tokenHash"
    );
  },

  findPendingByEmailInOrganization: async (
    email: string,
    organizationId: string
  ): Promise<IInvitation | null> => {
    return Invitation.findOne({
      email: email.toLowerCase().trim(),
      organizationId,
      status: "pending",
    });
  },

  findByOrganization: async (
    organizationId: string
  ): Promise<IInvitation[]> => {
    return Invitation.find({ organizationId })
      .sort({ createdAt: -1 })
      .limit(200);
  },

  markAccepted: async (id: string): Promise<IInvitation | null> => {
    return Invitation.findByIdAndUpdate(
      id,
      {
        status: "accepted",
        acceptedAt: new Date(),
      },
      { returnDocument: "after" }
    );
  },

  revokeById: async (
    id: string,
    organizationId: string
  ): Promise<IInvitation | null> => {
    return Invitation.findOneAndUpdate(
      { _id: id, organizationId, status: "pending" },
      { status: "revoked" },
      { returnDocument: "after" }
    );
  },

  /**
   * Atomically mark a pending invitation as accepted. Returns the
   * invitation only if the update applied, ensuring single-use enforcement.
   */
  consumePendingByTokenHash: async (
    tokenHash: string
  ): Promise<IInvitation | null> => {
    return Invitation.findOneAndUpdate(
      { tokenHash, status: "pending" },
      { status: "accepted", acceptedAt: new Date() },
      { returnDocument: "after" }
    ).select("+tokenHash");
  },

  /**
   * Mark a pending invitation as accepted by its Mongo id, atomically.
   * Returns null if the invitation was not pending (already consumed).
   */
  consumePendingById: async (id: string): Promise<IInvitation | null> => {
    return Invitation.findOneAndUpdate(
      { _id: id, status: "pending" },
      { status: "accepted", acceptedAt: new Date() },
      { returnDocument: "after" }
    );
  },
};
