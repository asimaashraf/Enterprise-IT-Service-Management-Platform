import "dotenv/config";

import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app";
import AuthUser from "../src/modules/auth/auth.model";
import Organization from "../src/modules/organization/organization.model";
import { hashToken } from "../src/utils/crypto";

describe("Password Reset", () => {
  let organizationId: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) throw new Error("MONGO_URI is not defined");
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
    const org = await Organization.create({
      name: `Reset Test Org ${Date.now()}`,
      slug: `reset-test-org-${Date.now()}`,
    });
    organizationId = org._id.toString();
  });

  afterAll(async () => {
    if (organizationId) {
      await AuthUser.deleteMany({ organizationId });
      await Organization.deleteOne({ _id: organizationId });
    }
  });

  const createVerifiedUser = async (
    password = "OriginalPass1"
  ): Promise<string> => {
    const email = `reset.${Date.now()}.${Math.random()}@example.com`;
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Reset User",
        email,
        password,
        organizationId,
      });
    expect(res.status).toBe(201);

    // Mark verified so we can log in initially.
    await AuthUser.findOneAndUpdate(
      { email },
      { isEmailVerified: true }
    );
    return email;
  };

  // -----------------------------------------------------------------
  // Tests
  // -----------------------------------------------------------------

  it("forgot-password returns 200 even for unknown email (no enumeration)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "ghost.user@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("forgot-password returns 200 for an existing email and sets a reset token", async () => {
    const email = await createVerifiedUser();

    const res = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/reset link/i);

    const user = await AuthUser.findOne({ email }).select(
      "+passwordResetTokenHash +passwordResetExpiresAt"
    );
    expect(user!.passwordResetTokenHash).toBeTruthy();
    expect(user!.passwordResetExpiresAt).toBeTruthy();
    expect(user!.passwordResetExpiresAt!.getTime()).toBeGreaterThan(
      Date.now()
    );
  });

  it("forgot-password returns 400 when email is missing", async () => {
    const res = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({});
    expect(res.status).toBe(400);
  });

  it("reset-password succeeds with a valid token and clears the token", async () => {
    const email = await createVerifiedUser("OldPassword1");

    const knownRawToken = "valid-reset-token-1234567890abcd";
    const knownHash = hashToken(knownRawToken);
    const future = new Date(Date.now() + 3600000); // 1 hour

    await AuthUser.findOneAndUpdate(
      { email },
      {
        passwordResetTokenHash: knownHash,
        passwordResetExpiresAt: future,
      }
    );

    const res = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token: knownRawToken, password: "NewPassword1" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const user = await AuthUser.findOne({ email }).select(
      "+passwordResetTokenHash +passwordResetExpiresAt"
    );
    expect(user!.passwordResetTokenHash).toBeNull();
    expect(user!.passwordResetExpiresAt).toBeNull();

    // The new password should let us log in.
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password: "NewPassword1" });
    expect(loginRes.status).toBe(200);
  });

  it("reset-password rejects an invalid token", async () => {
    const res = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token: "not-a-real-token-0000", password: "NewPassword1" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid|expired/i);
  });

  it("reset-password rejects an expired token", async () => {
    const email = await createVerifiedUser();

    const knownRawToken = "expired-reset-token-1234567890abcd";
    const knownHash = hashToken(knownRawToken);
    const past = new Date(Date.now() - 1000); // already expired

    await AuthUser.findOneAndUpdate(
      { email },
      {
        passwordResetTokenHash: knownHash,
        passwordResetExpiresAt: past,
      }
    );

    const res = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token: knownRawToken, password: "NewPassword1" });

    expect(res.status).toBe(400);
  });

  it("reset-password rejects password shorter than 6 characters", async () => {
    const knownRawToken = "short-pw-token-1234567890abcdef";
    const knownHash = hashToken(knownRawToken);
    const future = new Date(Date.now() + 3600000);
    const email = await createVerifiedUser();

    await AuthUser.findOneAndUpdate(
      { email },
      {
        passwordResetTokenHash: knownHash,
        passwordResetExpiresAt: future,
      }
    );

    const res = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token: knownRawToken, password: "123" });

    expect(res.status).toBe(400);
  });

  it("reset-password returns 400 when fields are missing", async () => {
    const res1 = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ password: "NewPassword1" });
    expect(res1.status).toBe(400);

    const res2 = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token: "abc" });
    expect(res2.status).toBe(400);
  });

  it("forgot-password does not change the user's existing password", async () => {
    const email = await createVerifiedUser("KeepMyPassword1");

    const res = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email });
    expect(res.status).toBe(200);

    // Original password should still work.
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password: "KeepMyPassword1" });
    expect(loginRes.status).toBe(200);
  });
});
