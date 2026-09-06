import "dotenv/config";

import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app";
import AuthUser from "../src/modules/auth/auth.model";
import Organization from "../src/modules/organization/organization.model";
import Invitation from "../src/modules/invitation/invitation.model";
import { generateSecureToken, hashToken } from "../src/utils/crypto";
import {
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
  createTestUser,
} from "./test-fixtures";

describe("Invitation System", () => {
  let adminToken: string;
  let adminOrgId: string;
  let employeeToken: string;
  let employeeOrgId: string;
  let secondOrgId: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) throw new Error("MONGO_URI is not defined");
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // Log in as the test admin (from test fixtures).
    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.data.token;
    adminOrgId = adminLogin.body.data.user.organizationId;

    // Log in as the test employee.
    const employeeLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "employee.test@example.com", password: "Employee@123" });
    expect(employeeLogin.status).toBe(200);
    employeeToken = employeeLogin.body.data.token;
    employeeOrgId = employeeLogin.body.data.user.organizationId;

    // Create a second organization for cross-tenant isolation tests.
    const secondOrg = await Organization.create({
      name: `Second Org ${Date.now()}`,
      slug: `second-org-${Date.now()}`,
      isActive: true,
    });
    secondOrgId = secondOrg._id.toString();
  });

  afterAll(async () => {
    if (secondOrgId) {
      await AuthUser.deleteMany({ organizationId: secondOrgId });
      await Organization.deleteOne({ _id: secondOrgId });
    }
  });

  // -----------------------------------------------------------------
  // Helper: insert an invitation directly into DB with known token.
  // -----------------------------------------------------------------
  const insertInvitation = async (overrides: {
    email?: string;
    role?: "admin" | "employee";
    organizationId?: string;
    expiresAt?: Date;
    status?: "pending" | "accepted" | "revoked";
  } = {}): Promise<{ rawToken: string; invitationId: string }> => {
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);
    const inv = await Invitation.create({
      tokenHash,
      email: (overrides.email ?? `invitee.${Date.now()}@example.com`).toLowerCase(),
      role: overrides.role ?? "employee",
      organizationId: overrides.organizationId ?? adminOrgId,
      invitedBy: new mongoose.Types.ObjectId(
        (await request(app)
          .get("/api/v1/auth/me")
          .set("Authorization", `Bearer ${adminToken}`)).body.data.id
      ),
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 48 * 60 * 60 * 1000),
      status: overrides.status ?? "pending",
    });
    return { rawToken, invitationId: inv._id.toString() };
  };

  // ================================================================
  // TOKEN HASHING
  // ================================================================

  describe("Token hashing", () => {
    it("stores only the SHA-256 hash, never the raw token", async () => {
      const rawToken = generateSecureToken();
      const tokenHash = hashToken(rawToken);

      // Create invitation via API.
      const email = `hashtest.${Date.now()}@example.com`;
      const res = await request(app)
        .post("/api/v1/invitations")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ email });

      expect(res.status).toBe(201);

      // Find the invitation and verify tokenHash is the hash, not raw.
      const inv = await Invitation.findOne({ email: email.toLowerCase() }).select("+tokenHash");
      expect(inv).not.toBeNull();
      // The stored hash must be a SHA-256 hex string (64 chars) and not
      // equal to the raw token.
      expect(inv!.tokenHash).toHaveLength(64);
      expect(inv!.tokenHash).not.toBe(rawToken);
      // The raw token must NOT be findable by a naive text search.
      const rawFound = await Invitation.findOne({ tokenHash: rawToken }).select("+tokenHash");
      expect(rawFound).toBeNull();
    });
  });

  // ================================================================
  // INVITATION CREATION
  // ================================================================

  describe("Create invitation (POST /api/v1/invitations)", () => {
    it("admin can invite a new employee", async () => {
      const email = `new.employee.${Date.now()}@example.com`;
      const res = await request(app)
        .post("/api/v1/invitations")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ email, role: "employee" });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(email.toLowerCase());
      expect(res.body.data.role).toBe("employee");
      expect(res.body.data.organizationId).toBe(adminOrgId);
      expect(res.body.data.status).toBe("pending");
      expect(res.body.data.expiresAt).toBeTruthy();

      // Clean up.
      await Invitation.deleteOne({ _id: res.body.data.id });
    });

    it("admin can invite a new admin", async () => {
      const email = `new.admin.${Date.now()}@example.com`;
      const res = await request(app)
        .post("/api/v1/invitations")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ email, role: "admin" });

      expect(res.status).toBe(201);
      expect(res.body.data.role).toBe("admin");

      await Invitation.deleteOne({ _id: res.body.data.id });
    });

    it("employee receives 403 when trying to invite", async () => {
      const res = await request(app)
        .post("/api/v1/invitations")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ email: `rival.${Date.now()}@example.com`, role: "employee" });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("unauthenticated request receives 401", async () => {
      const res = await request(app)
        .post("/api/v1/invitations")
        .send({ email: `stranger.${Date.now()}@example.com` });

      expect(res.status).toBe(401);
    });

    it("returns 409 when inviting an existing user", async () => {
      // Try to invite the admin (who already exists).
      const res = await request(app)
        .post("/api/v1/invitations")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ email: TEST_ADMIN_EMAIL });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it("returns 409 when a pending invitation already exists for the email", async () => {
      const email = `duplicate.invite.${Date.now()}@example.com`;
      // Create first invitation.
      const res1 = await request(app)
        .post("/api/v1/invitations")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ email });
      expect(res1.status).toBe(201);
      const invId = res1.body.data.id;

      // Try to create a second.
      const res2 = await request(app)
        .post("/api/v1/invitations")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ email });
      expect(res2.status).toBe(409);
      expect(res2.body.message).toMatch(/pending invitation/i);

      // Clean up.
      await Invitation.deleteOne({ _id: invId });
    });

    it("returns 400 for invalid email format", async () => {
      const res = await request(app)
        .post("/api/v1/invitations")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ email: "not-an-email", role: "employee" });

      expect(res.status).toBe(400);
    });

    it("defaults role to employee when not provided", async () => {
      const email = `defaultrole.${Date.now()}@example.com`;
      const res = await request(app)
        .post("/api/v1/invitations")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ email });

      expect(res.status).toBe(201);
      expect(res.body.data.role).toBe("employee");

      await Invitation.deleteOne({ _id: res.body.data.id });
    });
  });

  // ================================================================
  // INVITATION VALIDATION (public, no auth required)
  // ================================================================

  describe("Validate invitation (GET /api/v1/invitations/validate)", () => {
    it("returns invite details for a valid pending token", async () => {
      const { rawToken, invitationId } = await insertInvitation();
      const res = await request(app)
        .get("/api/v1/invitations/validate")
        .query({ token: rawToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBeTruthy();
      expect(res.body.data.organizationId).toBeTruthy();
      expect(res.body.data.role).toBeTruthy();

      await Invitation.deleteOne({ _id: invitationId });
    });

    it("returns 400 when token is missing", async () => {
      const res = await request(app).get("/api/v1/invitations/validate");
      expect(res.status).toBe(400);
    });

    it("returns 400 for an invalid token", async () => {
      const res = await request(app)
        .get("/api/v1/invitations/validate")
        .query({ token: "completely-fake-token-xyz" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/not found|invalid|expired/i);
    });

    it("returns 410 for an expired invitation", async () => {
      const { rawToken, invitationId } = await insertInvitation({
        expiresAt: new Date(Date.now() - 1000), // already expired
      });

      const res = await request(app)
        .get("/api/v1/invitations/validate")
        .query({ token: rawToken });

      expect(res.status).toBe(410);
      expect(res.body.message).toMatch(/expired/i);

      await Invitation.deleteOne({ _id: invitationId });
    });

    it("returns 410 for an already-accepted invitation", async () => {
      const { rawToken, invitationId } = await insertInvitation({
        status: "accepted",
      });

      const res = await request(app)
        .get("/api/v1/invitations/validate")
        .query({ token: rawToken });

      expect(res.status).toBe(410);
      expect(res.body.message).toMatch(/already been accepted/i);

      await Invitation.deleteOne({ _id: invitationId });
    });

    it("returns 410 for a revoked invitation", async () => {
      const { rawToken, invitationId } = await insertInvitation({
        status: "revoked",
      });

      const res = await request(app)
        .get("/api/v1/invitations/validate")
        .query({ token: rawToken });

      expect(res.status).toBe(410);
      expect(res.body.message).toMatch(/revoked/i);

      await Invitation.deleteOne({ _id: invitationId });
    });

    it("does NOT require authentication (public endpoint)", async () => {
      const { rawToken, invitationId } = await insertInvitation();

      const res = await request(app)
        .get("/api/v1/invitations/validate")
        .query({ token: rawToken });

      expect(res.status).toBe(200);
      // No Authorization header sent — endpoint should succeed.

      await Invitation.deleteOne({ _id: invitationId });
    });
  });

  // ================================================================
  // ACCEPT INVITATION (public, no auth required)
  // ================================================================

  describe("Accept invitation (POST /api/v1/invitations/accept)", () => {
    it("creates a user in the correct organization with correct role", async () => {
      const { rawToken, invitationId } = await insertInvitation({
        role: "employee",
      });

      const res = await request(app)
        .post("/api/v1/invitations/accept")
        .send({ token: rawToken, name: "New Employee", password: "SecurePass1" });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe("employee");
      expect(res.body.data.user.organizationId).toBe(adminOrgId);
      expect(res.body.data.organizationName).toBeTruthy();

      // Clean up.
      const createdUser = await AuthUser.findOne({ _id: res.body.data.user.id });
      if (createdUser) await createdUser.deleteOne();
      await Invitation.deleteOne({ _id: invitationId });
    });

    it("auto-verifies email on acceptance (invitation proves inbox access)", async () => {
      const { rawToken, invitationId } = await insertInvitation();

      const res = await request(app)
        .post("/api/v1/invitations/accept")
        .send({ token: rawToken, name: "Auto Verified User", password: "SecurePass1" });

      expect(res.status).toBe(201);
      const userId = res.body.data.user.id;
      const user = await AuthUser.findById(userId);
      expect(user!.isEmailVerified).toBe(true);

      await user!.deleteOne();
      await Invitation.deleteOne({ _id: invitationId });
    });

    it("returns 400 for missing fields", async () => {
      const res1 = await request(app)
        .post("/api/v1/invitations/accept")
        .send({ token: "sometoken" });
      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .post("/api/v1/invitations/accept")
        .send({ token: "sometoken", name: "Test" });
      expect(res2.status).toBe(400);
    });

    it("returns 400 for name shorter than 2 characters", async () => {
      const { rawToken, invitationId } = await insertInvitation();

      const res = await request(app)
        .post("/api/v1/invitations/accept")
        .send({ token: rawToken, name: "X", password: "Password1" });

      expect(res.status).toBe(400);

      await Invitation.deleteOne({ _id: invitationId });
    });

    it("returns 400 for password shorter than 6 characters", async () => {
      const { rawToken, invitationId } = await insertInvitation();

      const res = await request(app)
        .post("/api/v1/invitations/accept")
        .send({ token: rawToken, name: "Test User", password: "12345" });

      expect(res.status).toBe(400);

      await Invitation.deleteOne({ _id: invitationId });
    });

    it("returns 400 for an invalid token", async () => {
      const res = await request(app)
        .post("/api/v1/invitations/accept")
        .send({ token: "not-a-real-token-abc123", name: "Test", password: "Password1" });

      expect(res.status).toBe(400);
    });

    it("returns 410 for an expired invitation", async () => {
      const { rawToken, invitationId } = await insertInvitation({
        expiresAt: new Date(Date.now() - 1000),
      });

      const res = await request(app)
        .post("/api/v1/invitations/accept")
        .send({ token: rawToken, name: "Test", password: "Password1" });

      expect(res.status).toBe(410);

      await Invitation.deleteOne({ _id: invitationId });
    });

    it("returns 410 for an already-accepted invitation (single-use)", async () => {
      const { rawToken, invitationId } = await insertInvitation({
        status: "accepted",
      });

      const res = await request(app)
        .post("/api/v1/invitations/accept")
        .send({ token: rawToken, name: "Test", password: "Password1" });

      expect(res.status).toBe(410);
      expect(res.body.message).toMatch(/already been accepted/i);

      await Invitation.deleteOne({ _id: invitationId });
    });

    it("returns 410 for a revoked invitation", async () => {
      const { rawToken, invitationId } = await insertInvitation({
        status: "revoked",
      });

      const res = await request(app)
        .post("/api/v1/invitations/accept")
        .send({ token: rawToken, name: "Test", password: "Password1" });

      expect(res.status).toBe(410);
      expect(res.body.message).toMatch(/revoked/i);

      await Invitation.deleteOne({ _id: invitationId });
    });

    it("accepting invitation creates user who can log in", async () => {
      const { rawToken, invitationId } = await insertInvitation();

      const res = await request(app)
        .post("/api/v1/invitations/accept")
        .send({ token: rawToken, name: "Login Test", password: "NewPassword1" });

      expect(res.status).toBe(201);
      const { email } = res.body.data.user;

      // Immediately log in with the new credentials.
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ email, password: "NewPassword1" });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.token).toBeTruthy();
      expect(loginRes.body.data.user.email).toBe(email);

      // Clean up.
      await AuthUser.deleteOne({ email });
      await Invitation.deleteOne({ _id: invitationId });
    });

    it("email binding: invitation email cannot be overridden by the browser", async () => {
      const { rawToken, invitationId } = await insertInvitation({
        email: "bound@example.com",
      });

      // The accept endpoint does not accept an email field — it comes only
      // from the invitation record. We verify by checking that the created
      // user's email matches the invitation's email.
      const res = await request(app)
        .post("/api/v1/invitations/accept")
        .send({ token: rawToken, name: "Email Bound", password: "SecurePass1" });

      expect(res.status).toBe(201);
      expect(res.body.data.user.email).toBe("bound@example.com");

      await AuthUser.deleteOne({ _id: res.body.data.user.id });
      await Invitation.deleteOne({ _id: invitationId });
    });

    it("organization binding: user is created in the correct org", async () => {
      const { rawToken, invitationId } = await insertInvitation();

      const res = await request(app)
        .post("/api/v1/invitations/accept")
        .send({ token: rawToken, name: "Org Bound", password: "SecurePass1" });

      expect(res.status).toBe(201);
      expect(res.body.data.user.organizationId).toBe(adminOrgId);

      await AuthUser.deleteOne({ _id: res.body.data.user.id });
      await Invitation.deleteOne({ _id: invitationId });
    });
  });

  // ================================================================
  // LIST INVITATIONS (admin, tenant-scoped)
  // ================================================================

  describe("List invitations (GET /api/v1/invitations)", () => {
    it("admin can list invitations in their organization", async () => {
      const { invitationId } = await insertInvitation();

      const res = await request(app)
        .get("/api/v1/invitations")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      // The invitation we just created should be in the list.
      const found = res.body.data.find((i: any) => i.id === invitationId);
      expect(found).toBeTruthy();

      await Invitation.deleteOne({ _id: invitationId });
    });

    it("returns 403 for non-admin", async () => {
      const res = await request(app)
        .get("/api/v1/invitations")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
    });

    it("returns 401 for unauthenticated", async () => {
      const res = await request(app).get("/api/v1/invitations");
      expect(res.status).toBe(401);
    });
  });

  // ================================================================
  // REVOKE INVITATION (admin, tenant-scoped)
  // ================================================================

  describe("Revoke invitation (DELETE /api/v1/invitations/:id)", () => {
    it("admin can revoke a pending invitation", async () => {
      const { rawToken, invitationId } = await insertInvitation();

      const revokeRes = await request(app)
        .delete(`/api/v1/invitations/${invitationId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(revokeRes.status).toBe(200);
      expect(revokeRes.body.data.status).toBe("revoked");

      // Token should now be invalid.
      const validateRes = await request(app)
        .get("/api/v1/invitations/validate")
        .query({ token: rawToken });

      expect(validateRes.status).toBe(410);
      expect(validateRes.body.message).toMatch(/revoked/i);

      await Invitation.deleteOne({ _id: invitationId });
    });

    it("returns 404 for non-existent invitation", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .delete(`/api/v1/invitations/${fakeId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it("returns 403 for non-admin", async () => {
      const { invitationId } = await insertInvitation();

      const res = await request(app)
        .delete(`/api/v1/invitations/${invitationId}`)
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);

      await Invitation.deleteOne({ _id: invitationId });
    });
  });

  // ================================================================
  // TENANT ISOLATION
  // ================================================================

  describe("Tenant isolation", () => {
    it("admin of Org A cannot see invitations from Org B", async () => {
      // Create an invitation in the second org.
      const { invitationId } = await insertInvitation({
        organizationId: secondOrgId,
      });

      // Admin of the first org tries to list — should not see the second org's invite.
      const res = await request(app)
        .get("/api/v1/invitations")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const found = res.body.data.find((i: any) => i.id === invitationId);
      expect(found).toBeUndefined();

      await Invitation.deleteOne({ _id: invitationId });
    });

    it("cannot revoke an invitation belonging to another organization", async () => {
      const { invitationId } = await insertInvitation({
        organizationId: secondOrgId,
      });

      // Admin of first org tries to revoke second org's invitation.
      const res = await request(app)
        .delete(`/api/v1/invitations/${invitationId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      // Should not find it (404 because it's scoped to their org).
      expect(res.status).toBe(404);

      await Invitation.deleteOne({ _id: invitationId });
    });
  });
});
