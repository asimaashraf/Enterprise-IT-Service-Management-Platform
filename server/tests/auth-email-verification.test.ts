import "dotenv/config";

import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app";
import AuthUser from "../src/modules/auth/auth.model";
import Organization from "../src/modules/organization/organization.model";
import { hashToken } from "../src/utils/crypto";

describe("Email Verification", () => {
  let organizationId: string;
  let testUserEmail: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) throw new Error("MONGO_URI is not defined");
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
    const org = await Organization.create({
      name: `Verify Test Org ${Date.now()}`,
      slug: `verify-test-org-${Date.now()}`,
    });
    organizationId = org._id.toString();
    testUserEmail = `verify.test.${Date.now()}@example.com`;
  });

  afterAll(async () => {
    if (organizationId) {
      await AuthUser.deleteMany({ organizationId });
      await Organization.deleteOne({ _id: organizationId });
    }
  });

  // -----------------------------------------------------------------
  // Register a user and capture the stored token hash from the DB.
  // -----------------------------------------------------------------
  const registerUnverifiedUser = async (): Promise<string> => {
    const email = `unverified.${Date.now()}@example.com`;
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Unverified User",
        email,
        password: "Password123",
        organizationId,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe("employee");

    // Read the hashed token that was stored.
    const user = await AuthUser.findOne({ email }).select(
      "+emailVerificationTokenHash +emailVerificationExpiresAt"
    );
    expect(user).not.toBeNull();
    expect(user!.emailVerificationTokenHash).toBeTruthy();
    expect(user!.isEmailVerified).toBe(false);

    return user!.emailVerificationTokenHash as string;
  };

  // -----------------------------------------------------------------
  // Tests
  // -----------------------------------------------------------------

  it("registration sets isEmailVerified to false", async () => {
    const email = `unverified2.${Date.now()}@example.com`;
    await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Test User",
        email,
        password: "Password123",
        organizationId,
      });
    const user = await AuthUser.findOne({ email });
    expect(user!.isEmailVerified).toBe(false);
  });

  it("registration does not return an authorization token before verification", async () => {
    const email = `no-token.${Date.now()}@example.com`;
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "No Token User",
        email,
        password: "Password123",
        organizationId,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeUndefined();
  });

  it("unverified user cannot log in", async () => {
    const email = `nologin.${Date.now()}@example.com`;
    await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Test User",
        email,
        password: "Password123",
        organizationId,
      });

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password: "Password123" });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/verify|email/i);
  });

  it("returns 400 when verify-email is called with no token", async () => {
    const res = await request(app)
      .post("/api/v1/auth/verify-email")
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 for a completely invalid token", async () => {
    const fakeHash = hashToken("this-is-not-a-real-token-0000");
    const res = await request(app)
      .post("/api/v1/auth/verify-email")
      .send({ token: "this-is-not-a-real-token-0000" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid|expired/i);
  });

  it("verify-email succeeds with a valid token and sets isEmailVerified to true", async () => {
    // We need the raw token that hashes to the stored hash.
    // Since we can't retrieve the raw token from the DB (it's not stored),
    // we simulate by manually setting a known token + hash in the DB.
    const email = `validtok.${Date.now()}@example.com`;
    await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Valid Token User",
        email,
        password: "Password123",
        organizationId,
      });

    const knownRawToken = "test-raw-verification-token-1234567890";
    const knownHash = hashToken(knownRawToken);
    const future = new Date(Date.now() + 86400000);

    await AuthUser.findOneAndUpdate(
      { email },
      {
        emailVerificationTokenHash: knownHash,
        emailVerificationExpiresAt: future,
      }
    );

    const res = await request(app)
      .post("/api/v1/auth/verify-email")
      .send({ token: knownRawToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const user = await AuthUser.findOne({ email }).select(
      "+emailVerificationTokenHash +emailVerificationExpiresAt"
    );
    expect(user!.isEmailVerified).toBe(true);
    expect(user!.emailVerificationTokenHash).toBeNull();
    expect(user!.emailVerificationExpiresAt).toBeNull();
  });

  it("verified user can log in after verification", async () => {
    const email = `loginafter.${Date.now()}@example.com`;
    await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Login After Verify",
        email,
        password: "Password123",
        organizationId,
      });

    const knownRawToken = "raw-token-for-login-test-1234567890";
    const knownHash = hashToken(knownRawToken);
    const future = new Date(Date.now() + 86400000);

    await AuthUser.findOneAndUpdate(
      { email },
      {
        emailVerificationTokenHash: knownHash,
        emailVerificationExpiresAt: future,
      }
    );

    // Verify the email.
    await request(app)
      .post("/api/v1/auth/verify-email")
      .send({ token: knownRawToken });

    // Now login should work.
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password: "Password123" });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.email).toBe(email);
  });

  it("resend-verification returns 200 even when email does not exist (no enumeration)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/resend-verification")
      .send({ email: "definitelynotregistered@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("resend-verification returns 200 for already-verified email", async () => {
    const email = `verifieduser.${Date.now()}@example.com`;
    await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Verified User",
        email,
        password: "Password123",
        organizationId,
      });

    // Manually mark verified (simulating a previous verification).
    await AuthUser.findOneAndUpdate({ email }, { isEmailVerified: true });

    const res = await request(app)
      .post("/api/v1/auth/resend-verification")
      .send({ email });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("resend-verification returns 400 when email is missing", async () => {
    const res = await request(app)
      .post("/api/v1/auth/resend-verification")
      .send({});
    expect(res.status).toBe(400);
  });
});
