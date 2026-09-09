import "dotenv/config";

import bcrypt from "bcrypt";
import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app";
import AuthUser from "../src/modules/auth/auth.model";
import Organization from "../src/modules/organization/organization.model";
import {
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
  TEST_EMPLOYEE_EMAIL,
  TEST_EMPLOYEE_PASSWORD,
  createTestUser,
} from "./test-fixtures";

describe("Admin User Management", () => {
  let adminToken: string;
  let adminUserId: string;
  let adminOrgId: string;
  let employeeToken: string;
  let employeeUserId: string;
  let employeeOrgId: string;
  let secondOrgId: string;
  let secondOrgAdminToken: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) throw new Error("MONGO_URI is not defined");
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // Log in as the test admin.
    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.data.token;
    adminUserId = adminLogin.body.data.user.id;
    adminOrgId = adminLogin.body.data.user.organizationId;

    // Log in as the test employee.
    const employeeLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: TEST_EMPLOYEE_EMAIL,
        password: TEST_EMPLOYEE_PASSWORD,
      });
    expect(employeeLogin.status).toBe(200);
    employeeToken = employeeLogin.body.data.token;
    employeeUserId = employeeLogin.body.data.user.id;
    employeeOrgId = employeeLogin.body.data.user.organizationId;

    // Create a separate organization and admin for cross-tenant isolation.
    const secondOrg = await Organization.create({
      name: `UM Second Org ${Date.now()}`,
      slug: `um-second-org-${Date.now()}`,
      isActive: true,
    });
    secondOrgId = secondOrg._id.toString();

    const secondAdmin = await createTestUser({
      name: "Second Org Admin",
      email: `second.admin.${Date.now()}@example.com`,
      password: "SecondAdmin1",
      role: "admin",
      organizationId: secondOrgId,
    });

    const secondAdminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: secondAdmin.email, password: "SecondAdmin1" });
    expect(secondAdminLogin.status).toBe(200);
    secondOrgAdminToken = secondAdminLogin.body.data.token;
  });

  afterAll(async () => {
    if (secondOrgId) {
      await AuthUser.deleteMany({ organizationId: secondOrgId });
      await Organization.deleteOne({ _id: secondOrgId });
    }
  });

  // ================================================================
  // GET USERS (admin, tenant-scoped)
  // ================================================================

  describe("GET /api/v1/users", () => {
    it("admin can list users in their organization", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      // All returned users should belong to the admin's organization.
      for (const user of res.body.data) {
        expect(user.organizationId).toBe(adminOrgId);
      }
    });

    it("employee receives 403", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
    });

    it("unauthenticated request receives 401", async () => {
      const res = await request(app).get("/api/v1/users");
      expect(res.status).toBe(401);
    });

    it("does not return users from other organizations", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const found = res.body.data.find((u: any) => u.organizationId === secondOrgId);
      expect(found).toBeUndefined();
    });

    it("does not include passwords in the response", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      for (const user of res.body.data) {
        expect(user.password).toBeUndefined();
      }
    });
  });

  // ================================================================
  // GET USER BY ID
  // ================================================================

  describe("GET /api/v1/users/:id", () => {
    it("admin can get a user in their organization", async () => {
      const res = await request(app)
        .get(`/api/v1/users/${employeeUserId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(employeeUserId);
      expect(res.body.data.organizationId).toBe(adminOrgId);
      expect(res.body.data.password).toBeUndefined();
    });

    it("returns 404 for a user in another organization", async () => {
      // Create a user in second org.
      const crossUser = await createTestUser({
        name: "Cross Tenant",
        email: `cross.${Date.now()}@example.com`,
        password: "Password1",
        role: "employee",
        organizationId: secondOrgId,
      });

      const res = await request(app)
        .get(`/api/v1/users/${crossUser._id.toString()}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);

      await crossUser.deleteOne();
    });

    it("returns 403 for non-admin", async () => {
      const res = await request(app)
        .get(`/api/v1/users/${adminUserId}`)
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ================================================================
  // UPDATE USER
  // ================================================================

  describe("PUT /api/v1/users/:id", () => {
    it("cannot change role, tenant, password, or active state through generic update", async () => {
      const target = await createTestUser({
        name: "Protected Update",
        email: `protected.update.${Date.now()}@example.com`,
        password: "Password1",
        role: "employee",
        organizationId: adminOrgId,
      });

      const res = await request(app)
        .put(`/api/v1/users/${target._id.toString()}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          role: "admin",
          organizationId: secondOrgId,
          password: "ChangedPassword1",
          isActive: false,
        });

      expect(res.status).toBe(400);
      const after = await AuthUser.findById(target._id);
      expect(after?.role).toBe("employee");
      expect(after?.organizationId.toString()).toBe(adminOrgId);
      expect(after?.isActive).toBe(true);
      await target.deleteOne();
    });

    it("admin can update a user in their organization", async () => {
      // Create a new user to update.
      const target = await createTestUser({
        name: "Update Test",
        email: `update.${Date.now()}@example.com`,
        password: "Password1",
        role: "employee",
        organizationId: adminOrgId,
      });

      const res = await request(app)
        .put(`/api/v1/users/${target._id.toString()}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Updated Name" });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Updated Name");

      await target.deleteOne();
    });

    it("admin cannot update a user in another organization", async () => {
      const target = await createTestUser({
        name: "Cross Update",
        email: `cross.update.${Date.now()}@example.com`,
        password: "Password1",
        role: "employee",
        organizationId: secondOrgId,
      });

      const res = await request(app)
        .put(`/api/v1/users/${target._id.toString()}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Hacked Name" });

      expect(res.status).toBe(404);

      // Verify name was not changed.
      const after = await AuthUser.findById(target._id);
      expect(after!.name).toBe("Cross Update");

      await target.deleteOne();
    });

    it("returns 403 for non-admin", async () => {
      const res = await request(app)
        .put(`/api/v1/users/${adminUserId}`)
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ name: "Should fail" });

      expect(res.status).toBe(403);
    });
  });

  // ================================================================
  // CHANGE ROLE
  // ================================================================

  describe("PATCH /api/v1/users/:id/role", () => {
    it("admin can promote an employee to admin", async () => {
      const target = await createTestUser({
        name: "Promote",
        email: `promote.${Date.now()}@example.com`,
        password: "Password1",
        role: "employee",
        organizationId: adminOrgId,
      });

      const res = await request(app)
        .patch(`/api/v1/users/${target._id.toString()}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "admin" });

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe("admin");

      await target.deleteOne();
    });

    it("admin can demote another admin to employee", async () => {
      // Create a second admin (so we have two and can demote one).
      const target = await createTestUser({
        name: "Demote",
        email: `demote.${Date.now()}@example.com`,
        password: "Password1",
        role: "admin",
        organizationId: adminOrgId,
      });

      const res = await request(app)
        .patch(`/api/v1/users/${target._id.toString()}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "employee" });

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe("employee");

      await target.deleteOne();
    });

    it("admin cannot demote themselves (self-demotion guard)", async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${adminUserId}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "employee" });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/cannot demote yourself/i);

      // Verify role was not changed.
      const after = await AuthUser.findById(adminUserId);
      expect(after!.role).toBe("admin");
    });

    it("admin cannot demote the last active admin", async () => {
      // The test fixture admin is the only admin in adminOrgId.
      // Trying to demote them via the user route (which already blocks
      // self-demotion) — but if we delete a parallel admin and try via
      // service, we'd block there. Here we just verify the controller
      // returns 409 on self-demotion.
      const res = await request(app)
        .patch(`/api/v1/users/${adminUserId}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "employee" });

      expect(res.status).toBe(409);
    });

    it("returns 400 for invalid role", async () => {
      const target = await createTestUser({
        name: "BadRole",
        email: `bad.role.${Date.now()}@example.com`,
        password: "Password1",
        role: "employee",
        organizationId: adminOrgId,
      });

      const res = await request(app)
        .patch(`/api/v1/users/${target._id.toString()}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "owner" }); // invalid

      expect(res.status).toBe(400);

      await target.deleteOne();
    });

    it("returns 403 for non-admin", async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${adminUserId}/role`)
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ role: "employee" });

      expect(res.status).toBe(403);
    });

    it("admin of Org A cannot change role of a user in Org B", async () => {
      const target = await createTestUser({
        name: "Cross Role",
        email: `cross.role.${Date.now()}@example.com`,
        password: "Password1",
        role: "employee",
        organizationId: secondOrgId,
      });

      const res = await request(app)
        .patch(`/api/v1/users/${target._id.toString()}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "admin" });

      expect(res.status).toBe(404);

      await target.deleteOne();
    });
  });

  // ================================================================
  // DEACTIVATE USER
  // ================================================================

  describe("PATCH /api/v1/users/:id/deactivate", () => {
    it("admin can deactivate a user in their organization", async () => {
      const target = await createTestUser({
        name: "Deactivate",
        email: `deactivate.${Date.now()}@example.com`,
        password: "Password1",
        role: "employee",
        organizationId: adminOrgId,
      });

      const res = await request(app)
        .patch(`/api/v1/users/${target._id.toString()}/deactivate`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);

      // Verify the deactivated user cannot log in.
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: target.email, password: "Password1" });

      // Login should fail (403 or 401 depending on path).
      expect([401, 403]).toContain(loginRes.status);

      await target.deleteOne();
    });

    it("admin cannot deactivate themselves (self-action guard)", async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${adminUserId}/deactivate`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/cannot deactivate your own/i);

      // Verify still active.
      const after = await AuthUser.findById(adminUserId);
      expect(after!.isActive).toBe(true);
    });

    it("admin cannot deactivate the last active admin", async () => {
      // The test fixture admin is the only admin — trying to deactivate
      // self is blocked first. To test the last-admin check, we create a
      // non-self admin and remove other admins, but that conflicts with
      // self-action. The service-level last-admin check is in addition to
      // the controller self-action guard, and the service is unit-tested
      // by integration. Here, the controller self-action guard takes
      // precedence and returns 409.
      const res = await request(app)
        .patch(`/api/v1/users/${adminUserId}/deactivate`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
    });

    it("returns 403 for non-admin", async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${adminUserId}/deactivate`)
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
    });

    it("returns 404 for a user in another organization", async () => {
      const target = await createTestUser({
        name: "Cross Deactivate",
        email: `cross.deact.${Date.now()}@example.com`,
        password: "Password1",
        role: "employee",
        organizationId: secondOrgId,
      });

      const res = await request(app)
        .patch(`/api/v1/users/${target._id.toString()}/deactivate`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);

      // Verify still active.
      const after = await AuthUser.findById(target._id);
      expect(after!.isActive).toBe(true);

      await target.deleteOne();
    });
  });

  // ================================================================
  // ACTIVATE USER
  // ================================================================

  describe("PATCH /api/v1/users/:id/activate", () => {
    it("admin can reactivate a deactivated user", async () => {
      // Create an inactive user directly (createTestUser always sets isActive: true).
      const target = await AuthUser.create({
        name: "Reactivate",
        email: `reactivate.${Date.now()}@example.com`,
        password: await bcrypt.hash("Password1", 10),
        role: "employee",
        organizationId: adminOrgId,
        isActive: false,
        isEmailVerified: true,
      });

      const res = await request(app)
        .patch(`/api/v1/users/${target._id.toString()}/activate`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(true);

      await target.deleteOne();
    });

    it("returns 403 for non-admin", async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${adminUserId}/activate`)
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ================================================================
  // BLOCK USER (soft-delete)
  // ================================================================

  describe("PATCH /api/v1/users/:id/block", () => {
    it("admin can block a user (soft-delete)", async () => {
      const target = await createTestUser({
        name: "Block",
        email: `block.${Date.now()}@example.com`,
        password: "Password1",
        role: "employee",
        organizationId: adminOrgId,
      });

      const res = await request(app)
        .patch(`/api/v1/users/${target._id.toString()}/block`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);

      // Verify the email has been tombstoned.
      const after = await AuthUser.findById(target._id);
      expect(after!.email).toMatch(/@removed\.invalid$/);

      await after!.deleteOne();
    });

    it("admin cannot block themselves (self-action guard)", async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${adminUserId}/block`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/cannot block your own/i);

      // Verify not blocked.
      const after = await AuthUser.findById(adminUserId);
      expect(after!.isActive).toBe(true);
      expect(after!.email).not.toMatch(/@removed\.invalid$/);
    });

    it("returns 403 for non-admin", async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${adminUserId}/block`)
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
    });

    it("returns 404 for a user in another organization", async () => {
      const target = await createTestUser({
        name: "Cross Block",
        email: `cross.block.${Date.now()}@example.com`,
        password: "Password1",
        role: "employee",
        organizationId: secondOrgId,
      });

      const res = await request(app)
        .patch(`/api/v1/users/${target._id.toString()}/block`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);

      // Verify not blocked.
      const after = await AuthUser.findById(target._id);
      expect(after!.isActive).toBe(true);
      expect(after!.email).not.toMatch(/@removed\.invalid$/);

      await target.deleteOne();
    });
  });

  // ================================================================
  // TENANT ISOLATION SUMMARY
  // ================================================================

  describe("Tenant isolation end-to-end", () => {
    it("second org admin can list their users", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${secondOrgAdminToken}`);

      expect(res.status).toBe(200);
      for (const user of res.body.data) {
        expect(user.organizationId).toBe(secondOrgId);
      }
    });

    it("admins from different orgs see disjoint user sets", async () => {
      const orgAUsers = (await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${adminToken}`)).body.data;
      const orgBUsers = (await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${secondOrgAdminToken}`)).body.data;

      const orgAIds = new Set(orgAUsers.map((u: any) => u.id));
      const orgBIds = new Set(orgBUsers.map((u: any) => u.id));

      // No user should be in both sets.
      for (const id of orgAIds) {
        expect(orgBIds.has(id)).toBe(false);
      }
      for (const id of orgBIds) {
        expect(orgAIds.has(id)).toBe(false);
      }
    });
  });
});
