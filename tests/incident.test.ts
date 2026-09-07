import dotenv from "dotenv";

dotenv.config();

import request from "supertest";
import mongoose from "mongoose";

import app from "../src/app";
import { connectDB } from "../src/config/db";
import AuthUser from "../src/modules/auth/auth.model";
import Organization from "../src/modules/organization/organization.model";
import SupportTeam from "../src/modules/support-team/supportTeam.model";
import { createTestUser } from "./test-fixtures";

describe("Incident Management API", () => {
  let adminToken: string;
  let employeeToken: string;
  let employeeId: string;
  let organizationId: string;
  let supportAdminToken: string;
  let supportAdminId: string;
  let unassignedAdminId: string;
  let inactiveAdminId: string;
  let otherAdminId: string;
  let otherOrganizationId: string;
  const createdUserIds: string[] = [];
  const createdTeamIds: string[] = [];

  let createdIncidentId: string;
  let createdIncidentNumber: string;

  jest.setTimeout(60000);

  // ==========================================
  // CONNECT DATABASE + LOGIN
  // ==========================================

  beforeAll(async () => {
    console.log("=================================");
    console.log("CONNECTING TO MONGODB...");
    console.log("=================================");

    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }

    if (mongoose.connection.readyState !== 1) {
      throw new Error(
        "MongoDB connection was not established."
      );
    }

    // ==========================================
    // ADMIN LOGIN
    // ==========================================

    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "aliya.admin@example.com",
        password: "Admin@123",
      });

    expect(adminLogin.status).toBe(200);
    expect(adminLogin.body.success).toBe(true);
    expect(adminLogin.body.data.token).toBeDefined();

    adminToken = adminLogin.body.data.token;
    organizationId = adminLogin.body.data.user.organizationId;

    // ==========================================
    // EMPLOYEE LOGIN
    // ==========================================

    const employeeLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "employee.test@example.com",
        password: "Employee@123",
      });

    expect(employeeLogin.status).toBe(200);
    expect(employeeLogin.body.success).toBe(true);
    expect(employeeLogin.body.data.token).toBeDefined();

    employeeToken = employeeLogin.body.data.token;
    employeeId = employeeLogin.body.data.user.id;

    const suffix = Date.now();
    const supportAdmin = await createTestUser({
      name: "Incident Support Admin",
      email: `incident-support-admin-${suffix}@example.com`,
      password: "IncidentSupport123!",
      role: "admin",
      organizationId,
    });
    supportAdminId = supportAdmin._id.toString();
    createdUserIds.push(supportAdminId);

    const supportAdminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: supportAdmin.email, password: "IncidentSupport123!" });
    expect(supportAdminLogin.status).toBe(200);
    supportAdminToken = supportAdminLogin.body.data.token;

    const supportTeam = await SupportTeam.create({
      name: `Incident Support Team ${suffix}`,
      organizationId,
      members: [supportAdminId],
      isActive: true,
    });
    createdTeamIds.push(supportTeam._id.toString());

    const unassignedAdmin = await createTestUser({
      name: "Incident Unassigned Admin",
      email: `incident-unassigned-admin-${suffix}@example.com`,
      password: "IncidentUnassigned123!",
      role: "admin",
      organizationId,
    });
    unassignedAdminId = unassignedAdmin._id.toString();
    createdUserIds.push(unassignedAdminId);

    const inactiveAdmin = await createTestUser({
      name: "Incident Inactive Admin",
      email: `incident-inactive-admin-${suffix}@example.com`,
      password: "IncidentInactive123!",
      role: "admin",
      organizationId,
    });
    inactiveAdminId = inactiveAdmin._id.toString();
    createdUserIds.push(inactiveAdminId);
    await AuthUser.findByIdAndUpdate(inactiveAdminId, { isActive: false });

    const otherOrganization = await Organization.create({
      name: `Incident Other Organization ${suffix}`,
      slug: `incident-other-${suffix}`,
      isActive: true,
    });
    otherOrganizationId = otherOrganization._id.toString();
    const otherAdmin = await createTestUser({
      name: "Incident Other Admin",
      email: `incident-other-admin-${suffix}@example.com`,
      password: "IncidentOther123!",
      role: "admin",
      organizationId: otherOrganizationId,
    });
    otherAdminId = otherAdmin._id.toString();
    createdUserIds.push(otherAdminId);

    console.log(
      "BOTH USERS LOGGED IN SUCCESSFULLY"
    );
  }, 60000);

  // ==========================================
  // CLOSE DATABASE
  // ==========================================

  afterAll(async () => {
    console.log("Closing MongoDB connection...");

    await SupportTeam.deleteMany({ _id: { $in: createdTeamIds } });
    await AuthUser.deleteMany({ _id: { $in: createdUserIds } });
    await Organization.deleteOne({ _id: otherOrganizationId });

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }

    console.log("MongoDB connection closed.");
  }, 30000);

  // ==========================================
  // UNAUTHENTICATED GET
  // ==========================================

  it("should reject unauthenticated requests to get incidents", async () => {
    const response = await request(app).get(
      "/api/v1/incidents"
    );

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  // ==========================================
  // UNAUTHENTICATED CREATE
  // ==========================================

  it("should reject unauthenticated incident creation", async () => {
    const response = await request(app)
      .post("/api/v1/incidents")
      .send({
        incidentId: `INC-UNAUTH-${Date.now()}`,
        title: "Unauthenticated Incident",
        description: "Should not be created",
        priority: "High",
        severity: "Major",
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  // ==========================================
  // CREATE - EMPLOYEE
  // ==========================================

  it("should allow employees to create an incident", async () => {
    const incidentId = `INC-EMP-${Date.now()}`;

    const response = await request(app)
      .post("/api/v1/incidents")
      .set(
        "Authorization",
        `Bearer ${employeeToken}`
      )
      .send({
        incidentId,
        title: "Employee Test Incident",
        description:
          "Incident created by employee",
        priority: "Medium",
        severity: "Major",
      });

    console.log(
      "EMPLOYEE CREATE RESPONSE:",
      response.body
    );

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();

    expect(response.body.data.incidentId).toBe(
      incidentId
    );

    expect(response.body.data.title).toBe(
      "Employee Test Incident"
    );

    expect(response.body.data.status).toBe("Open");

    expect(
      response.body.data.organizationId
    ).toBeDefined();

    expect(
      response.body.data.reportedBy
    ).toBeDefined();
  });

  // ==========================================
  // CREATE - ADMIN
  // ==========================================

  it("should allow admins to create an incident", async () => {
    createdIncidentNumber = `INC-ADMIN-${Date.now()}`;

    const response = await request(app)
      .post("/api/v1/incidents")
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      )
      .send({
        incidentId: createdIncidentNumber,
        title: "Automated Test Incident",
        description:
          "Incident created by automated test",
        priority: "High",
        severity: "Critical",
      });

    console.log(
      "ADMIN CREATE RESPONSE:",
      response.body
    );

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();

    createdIncidentId =
      response.body.data._id;

    expect(createdIncidentId).toBeDefined();

    expect(
      response.body.data.incidentId
    ).toBe(createdIncidentNumber);

    expect(response.body.data.status).toBe(
      "Open"
    );

    expect(
      response.body.data.priority
    ).toBe("High");

    expect(
      response.body.data.severity
    ).toBe("Critical");
  });

  // ==========================================
  // DUPLICATE INCIDENT ID
  // ==========================================

  it("should reject duplicate incident IDs within the organization", async () => {
    const incidentId = `INC-DUP-${Date.now()}`;

    const firstResponse = await request(app)
      .post("/api/v1/incidents")
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      )
      .send({
        incidentId,
        title: "First Incident",
        description: "First incident",
      });

    expect(firstResponse.status).toBe(201);

    const secondResponse = await request(app)
      .post("/api/v1/incidents")
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      )
      .send({
        incidentId,
        title: "Duplicate Incident",
        description: "Duplicate incident",
      });

    expect([400, 409]).toContain(
      secondResponse.status
    );

    expect(
      secondResponse.body.success
    ).toBe(false);
  });

  // ==========================================
  // GET ALL - EMPLOYEE
  // ==========================================

  it("should allow employees to get all incidents", async () => {
    const response = await request(app)
      .get("/api/v1/incidents")
      .set(
        "Authorization",
        `Bearer ${employeeToken}`
      );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(
      Array.isArray(response.body.data)
    ).toBe(true);
  });

  // ==========================================
  // GET ALL - ADMIN
  // ==========================================

  it("should allow admins to get all incidents", async () => {
    const response = await request(app)
      .get("/api/v1/incidents")
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(
      Array.isArray(response.body.data)
    ).toBe(true);
  });

  // ==========================================
  // GET BY ID - EMPLOYEE
  // ==========================================

  it("should allow employees to get an incident by ID", async () => {
    expect(createdIncidentId).toBeDefined();

    const response = await request(app)
      .get(
        `/api/v1/incidents/${createdIncidentId}`
      )
      .set(
        "Authorization",
        `Bearer ${employeeToken}`
      );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();

    expect(response.body.data._id).toBe(
      createdIncidentId
    );
  });

  // ==========================================
  // GET BY ID - ADMIN
  // ==========================================

  it("should allow admins to get an incident by ID", async () => {
    expect(createdIncidentId).toBeDefined();

    const response = await request(app)
      .get(
        `/api/v1/incidents/${createdIncidentId}`
      )
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();

    expect(response.body.data._id).toBe(
      createdIncidentId
    );
  });

  // ==========================================
  // INVALID ID
  // ==========================================

  it("should return 404 for a nonexistent incident", async () => {
    const fakeId =
      new mongoose.Types.ObjectId().toString();

    const response = await request(app)
      .get(`/api/v1/incidents/${fakeId}`)
      .set(
        "Authorization",
        `Bearer ${employeeToken}`
      );

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  // ==========================================
  // EMPLOYEE CANNOT ASSIGN
  // ==========================================

  it("should prevent employees from assigning incidents", async () => {
    expect(createdIncidentId).toBeDefined();

    const response = await request(app)
      .put(
        `/api/v1/incidents/${createdIncidentId}`
      )
      .set(
        "Authorization",
        `Bearer ${employeeToken}`
      )
      .send({
        assignedTo:
          employeeId,
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  // ==========================================
  // EMPLOYEE CANNOT UPDATE UNASSIGNED INCIDENT
  // ==========================================

  it("should prevent an unassigned employee from managing an incident", async () => {
    expect(createdIncidentId).toBeDefined();

    const response = await request(app)
      .put(
        `/api/v1/incidents/${createdIncidentId}`
      )
      .set(
        "Authorization",
        `Bearer ${employeeToken}`
      )
      .send({
        description:
          "Unauthorized employee update",
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  // ==========================================
  // ADMIN ASSIGNMENT
  // ==========================================

  it("rejects employee, unassigned admin, inactive admin, and cross-tenant admin assignments", async () => {
    expect(createdIncidentId).toBeDefined();

    for (const targetId of [
      employeeId,
      unassignedAdminId,
      inactiveAdminId,
      otherAdminId,
    ]) {
      const response = await request(app)
        .put(`/api/v1/incidents/${createdIncidentId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ assignedTo: targetId });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "Assigned user must be an eligible operational assignee"
      );
    }
  });

  it("allows an admin to assign an incident to an eligible support admin", async () => {
    const response = await request(app)
      .put(`/api/v1/incidents/${createdIncidentId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ assignedTo: supportAdminId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.assignedTo._id).toBe(supportAdminId);
  });

  // ==========================================
  // EMPLOYEE BASIC UPDATE
  // ==========================================

  it("prevents an employee from managing an incident even if they attempt an operational update", async () => {
    expect(createdIncidentId).toBeDefined();

    const response = await request(app)
      .put(
        `/api/v1/incidents/${createdIncidentId}`
      )
      .set(
        "Authorization",
        `Bearer ${employeeToken}`
      )
      .send({
        description:
          "Updated by assigned employee",
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  // ==========================================
  // EMPLOYEE → IN PROGRESS
  // ==========================================

  it("allows the assigned support admin to move an incident to In Progress", async () => {
    const response = await request(app)
      .put(
        `/api/v1/incidents/${createdIncidentId}`
      )
      .set(
        "Authorization",
        `Bearer ${supportAdminToken}`
      )
      .send({
        status: "In Progress",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.data.status).toBe(
      "In Progress"
    );
  });

  // ==========================================
  // EMPLOYEE → INVALID STATUS
  // ==========================================

  it("should prevent employees from setting unauthorized incident statuses", async () => {
    const response = await request(app)
      .put(
        `/api/v1/incidents/${createdIncidentId}`
      )
      .set(
        "Authorization",
        `Bearer ${employeeToken}`
      )
      .send({
        status: "Closed",
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  // ==========================================
  // EMPLOYEE → RESOLVED WITHOUT RESOLUTION
  // ==========================================

  it("prevents employees from resolving incidents without a resolution", async () => {
    const response = await request(app)
      .put(
        `/api/v1/incidents/${createdIncidentId}`
      )
      .set(
        "Authorization",
        `Bearer ${employeeToken}`
      )
      .send({
        status: "Resolved",
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  // ==========================================
  // EMPLOYEE → RESOLVED
  // ==========================================

  it("allows the assigned support admin to resolve an incident", async () => {
    const response = await request(app)
      .put(
        `/api/v1/incidents/${createdIncidentId}`
      )
      .set(
        "Authorization",
        `Bearer ${supportAdminToken}`
      )
      .send({
        status: "Resolved",
        resolution:
          "VPN configuration corrected and connectivity restored.",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.data.status).toBe(
      "Resolved"
    );

    expect(
      response.body.data.resolution
    ).toBe(
      "VPN configuration corrected and connectivity restored."
    );

    expect(
      response.body.data.resolvedAt
    ).toBeDefined();
  });

  // ==========================================
  // ADMIN UPDATE
  // ==========================================

  it("should allow admins to update incident information", async () => {
    const response = await request(app)
      .put(
        `/api/v1/incidents/${createdIncidentId}`
      )
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      )
      .send({
        priority: "Critical",
        severity: "Critical",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.data.priority).toBe(
      "Critical"
    );

    expect(response.body.data.severity).toBe(
      "Critical"
    );
  });

  // ==========================================
  // ADMIN → CLOSED
  // ==========================================

  it("should allow an admin to close a resolved incident", async () => {
    const response = await request(app)
      .put(
        `/api/v1/incidents/${createdIncidentId}`
      )
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      )
      .send({
        status: "Closed",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.data.status).toBe(
      "Closed"
    );

    expect(
      response.body.data.closedAt
    ).toBeDefined();
  });

  // ==========================================
  // EMPLOYEE DELETE
  // ==========================================

  it("should prevent employees from deleting incidents", async () => {
    const response = await request(app)
      .delete(
        `/api/v1/incidents/${createdIncidentId}`
      )
      .set(
        "Authorization",
        `Bearer ${employeeToken}`
      );

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  // ==========================================
  // ADMIN DELETE
  // ==========================================

  it("should allow admins to delete incidents", async () => {
    const response = await request(app)
      .delete(
        `/api/v1/incidents/${createdIncidentId}`
      )
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });
});
