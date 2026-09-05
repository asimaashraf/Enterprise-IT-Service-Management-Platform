import request from "supertest";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import app from "../src/app";
import { connectDB } from "../src/config/db";
import Organization from "../src/modules/organization/organization.model";
import AuthUser from "../src/modules/auth/auth.model";
import AuditLog from "../src/modules/audit/audit.model";
import {
  createAuditLog,
  getAuditLogs,
} from "../src/modules/audit/audit.service";
import {
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
  TEST_EMPLOYEE_EMAIL,
  TEST_EMPLOYEE_PASSWORD,
} from "./test-fixtures";

jest.setTimeout(60000);

describe("Audit Logging", () => {
  let organizationId: string;
  let adminToken: string;
  let employeeToken: string;
  let adminId: string;
  let otherOrganizationId: string;
  let otherAdminId: string;
  let otherAdminToken: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }

    const organization = await Organization.findOne({
      slug: "jest-test-organization",
    });
    const admin = await AuthUser.findOne({
      email: TEST_ADMIN_EMAIL,
    });

    if (!organization || !admin) {
      throw new Error("Shared test fixtures are unavailable");
    }

    organizationId = organization._id.toString();
    adminId = admin._id.toString();

    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: TEST_ADMIN_EMAIL,
        password: TEST_ADMIN_PASSWORD,
      });
    adminToken = adminLogin.body.data.token;

    const employeeLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: TEST_EMPLOYEE_EMAIL,
        password: TEST_EMPLOYEE_PASSWORD,
      });
    employeeToken = employeeLogin.body.data.token;

    const otherOrganization = await Organization.create({
      name: `Audit Other Organization ${Date.now()}`,
      slug: `audit-other-${Date.now()}`,
    });
    otherOrganizationId = otherOrganization._id.toString();

    const otherAdmin = await AuthUser.create({
      name: "Other Audit Admin",
      email: `audit-other-${Date.now()}@example.com`,
      password: await bcrypt.hash(TEST_ADMIN_PASSWORD, 10),
      role: "admin",
      organizationId: otherOrganization._id,
      isActive: true,
    });
    otherAdminId = otherAdmin._id.toString();

    const otherAdminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: otherAdmin.email,
        password: TEST_ADMIN_PASSWORD,
      });

    if (otherAdminLogin.status !== 200) {
      throw new Error("Failed to authenticate other audit tenant");
    }

    otherAdminToken = otherAdminLogin.body.data.token;
  });

  afterAll(async () => {
    await AuditLog.deleteMany({
      organizationId: {
        $in: [organizationId, otherOrganizationId],
      },
    });

    if (otherAdminId) {
      await AuthUser.findByIdAndDelete(otherAdminId);
    }

    if (otherOrganizationId) {
      await Organization.findByIdAndDelete(otherOrganizationId);
    }
  });

  it("creates tenant-scoped logs with actor and resource identity", async () => {
    const log = await createAuditLog({
      actorId: adminId,
      actorEmail: TEST_ADMIN_EMAIL,
      actorRole: "admin",
      organizationId,
      action: "UPDATE Incident",
      eventType: "Incident.UPDATE",
      resourceType: "Incident",
      resourceId: "INC-100",
      outcome: "Success",
      metadata: {
        status: "Resolved",
        priority: "High",
      },
    });

    expect(log.organizationId.toString()).toBe(organizationId);
    expect(log.actorId?.toString()).toBe(adminId);
    expect(log.actorEmail).toBe(TEST_ADMIN_EMAIL);
    expect(log.resourceType).toBe("Incident");
    expect(log.resourceId).toBe("INC-100");
    expect(log.eventType).toBe("Incident.UPDATE");
    expect(log.createdAt).toBeInstanceOf(Date);
  });

  it("removes passwords, tokens, and secrets from metadata", async () => {
    const log = await createAuditLog({
      actorId: adminId,
      organizationId,
      action: "POST User",
      eventType: "User.POST",
      resourceType: "User",
      outcome: "Success",
      metadata: {
        email: "safe@example.com",
        password: "do-not-store",
        accessToken: "do-not-store",
        nested: {
          secret: "do-not-store",
          role: "employee",
        },
      },
    });

    expect(log.metadata).toEqual({
      email: "safe@example.com",
      nested: {
        role: "employee",
      },
    });
  });

  it("rejects invalid tenant or actor identifiers", async () => {
    await expect(
      createAuditLog({
        organizationId: "invalid",
        action: "POST Incident",
        eventType: "Incident.POST",
        resourceType: "Incident",
        outcome: "Failure",
      })
    ).rejects.toThrow("Invalid organization ID");

    await expect(
      createAuditLog({
        actorId: "invalid",
        organizationId,
        action: "POST Incident",
        eventType: "Incident.POST",
        resourceType: "Incident",
        outcome: "Failure",
      })
    ).rejects.toThrow("Invalid actor ID");
  });

  it("allows admins to read only their tenant audit logs", async () => {
    await createAuditLog({
      actorId: otherAdminId,
      organizationId: otherOrganizationId,
      action: "POST Organization",
      eventType: "Organization.POST",
      resourceType: "Organization",
      outcome: "Success",
    });

    const response = await request(app)
      .get("/api/v1/audit-logs")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          organizationId,
          resourceType: "Incident",
        }),
      ])
    );
    expect(
      response.body.data.some(
        (item: any) => item.organizationId === otherOrganizationId
      )
    ).toBe(false);
  });

  it("keeps audit logs admin-only", async () => {
    const response = await request(app)
      .get("/api/v1/audit-logs")
      .set("Authorization", `Bearer ${employeeToken}`);

    expect(response.status).toBe(403);
  });
});
