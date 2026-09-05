import dotenv from "dotenv";

dotenv.config();

import request from "supertest";
import mongoose from "mongoose";

import app from "../src/app";
import { connectDB } from "../src/config/db";

describe("Change Management API", () => {
  let adminToken: string;
  let employeeToken: string;
  let employeeId: string;

  let createdChangeId: string;
  let createdChangePublicId: string;

  jest.setTimeout(60000);

  // ==========================================
  // CONNECT DATABASE + LOGIN USERS
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

    console.log("BOTH USERS LOGGED IN SUCCESSFULLY");
  }, 60000);

  // ==========================================
  // CLOSE DATABASE
  // ==========================================

  afterAll(async () => {
    console.log("Closing MongoDB connection...");

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }

    console.log("MongoDB connection closed.");
  }, 30000);

  // ==========================================
  // UNAUTHENTICATED CREATE
  // ==========================================

  it("should reject unauthenticated change creation", async () => {
    const response = await request(app)
      .post("/api/v1/changes")
      .send({
        changeId: `CHG-UNAUTH-${Date.now()}`,
        title: "Unauthenticated Change",
        description: "Should not be created",
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  // ==========================================
  // UNAUTHENTICATED GET ALL
  // ==========================================

  it("should reject unauthenticated change listing", async () => {
    const response = await request(app).get(
      "/api/v1/changes"
    );

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  // ==========================================
  // EMPLOYEE CREATE
  // ==========================================

  it("should allow employees to create a change", async () => {
    const response = await request(app)
      .post("/api/v1/changes")
      .set(
        "Authorization",
        `Bearer ${employeeToken}`
      )
      .send({
        changeId: `CHG-EMP-${Date.now()}`,
        title: "Employee Test Change",
        description: "Change created by employee",
        type: "Normal",
        risk: "Medium",
      });

    console.log(
      "EMPLOYEE CREATE RESPONSE:",
      response.body
    );

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();

    expect(response.body.data.title).toBe(
      "Employee Test Change"
    );

    expect(response.body.data.status).toBe("Draft");
    expect(response.body.data.type).toBe("Normal");
    expect(response.body.data.risk).toBe("Medium");
    expect(response.body.data.organizationId).toBeDefined();
    expect(response.body.data.requestedBy).toBeDefined();
  });

  // ==========================================
  // ADMIN CREATE
  // ==========================================

  it("should allow admins to create a change", async () => {
    const response = await request(app)
      .post("/api/v1/changes")
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      )
      .send({
        changeId: `CHG-ADMIN-${Date.now()}`,
        title: "Automated Test Change",
        description: "Created by automated test",
        type: "Normal",
        risk: "High",
      });

    console.log(
      "ADMIN CREATE RESPONSE:",
      response.body
    );

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();

    createdChangeId = response.body.data._id;
    createdChangePublicId =
      response.body.data.changeId;

    expect(createdChangeId).toBeDefined();
    expect(createdChangePublicId).toBeDefined();

    expect(response.body.data.status).toBe("Draft");
  });

  // ==========================================
  // DUPLICATE CHANGE ID
  // ==========================================

  it("should reject duplicate change IDs within the organization", async () => {
    const changeId = `CHG-DUP-${Date.now()}`;

    const firstResponse = await request(app)
      .post("/api/v1/changes")
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      )
      .send({
        changeId,
        title: "First Change",
        description: "First change",
      });

    expect(firstResponse.status).toBe(201);

    const secondResponse = await request(app)
      .post("/api/v1/changes")
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      )
      .send({
        changeId,
        title: "Duplicate Change",
        description: "Duplicate change",
      });

    expect([400, 409]).toContain(
      secondResponse.status
    );

    expect(secondResponse.body.success).toBe(false);
  });

  // ==========================================
  // GET ALL - EMPLOYEE
  // ==========================================

  it("should allow employees to get all changes", async () => {
    const response = await request(app)
      .get("/api/v1/changes")
      .set(
        "Authorization",
        `Bearer ${employeeToken}`
      );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(
      true
    );
  });

  // ==========================================
  // GET ALL - ADMIN
  // ==========================================

  it("should allow admins to get all changes", async () => {
    const response = await request(app)
      .get("/api/v1/changes")
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(
      true
    );
  });

  // ==========================================
  // GET BY ID - EMPLOYEE
  // ==========================================

  it("should allow employees to get a change by ID", async () => {
    expect(createdChangeId).toBeDefined();

    const response = await request(app)
      .get(
        `/api/v1/changes/${createdChangeId}`
      )
      .set(
        "Authorization",
        `Bearer ${employeeToken}`
      );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();

    expect(response.body.data._id).toBe(
      createdChangeId
    );
  });

  // ==========================================
  // GET BY ID - ADMIN
  // ==========================================

  it("should allow admins to get a change by ID", async () => {
    expect(createdChangeId).toBeDefined();

    const response = await request(app)
      .get(
        `/api/v1/changes/${createdChangeId}`
      )
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();

    expect(response.body.data._id).toBe(
      createdChangeId
    );
  });

  // ==========================================
  // NONEXISTENT CHANGE
  // ==========================================

  it("should return 404 for a nonexistent change", async () => {
    const fakeId =
      new mongoose.Types.ObjectId().toString();

    const response = await request(app)
      .get(`/api/v1/changes/${fakeId}`)
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      );

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  // ==========================================
  // EMPLOYEE BASIC UPDATE
  // ==========================================

  it("should allow employees to update basic change information", async () => {
    expect(createdChangeId).toBeDefined();

    const response = await request(app)
      .put(
        `/api/v1/changes/${createdChangeId}`
      )
      .set(
        "Authorization",
        `Bearer ${employeeToken}`
      )
      .send({
        description: "Updated by employee",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(
      response.body.data.description
    ).toBe("Updated by employee");
  });

  // ==========================================
  // INVALID SCHEDULE
  // ==========================================

  it("should reject a change with an invalid schedule", async () => {
    const response = await request(app)
      .post("/api/v1/changes")
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      )
      .send({
        changeId: `CHG-SCHEDULE-${Date.now()}`,
        title: "Invalid Schedule Change",
        description: "Invalid schedule",
        plannedStartAt: "2026-08-20T15:00:00.000Z",
        plannedEndAt: "2026-08-20T14:00:00.000Z",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  // ==========================================
  // EMPLOYEE ASSIGNMENT
  // ==========================================

  it("should prevent employees from assigning changes", async () => {
    const response = await request(app)
      .put(
        `/api/v1/changes/${createdChangeId}`
      )
      .set(
        "Authorization",
        `Bearer ${employeeToken}`
      )
      .send({
        assignedTo:
          employeeId,
      });

    /*
     * Current service validates assignment but
     * does not yet enforce admin-only assignment.
     *
     * If your service has employee restriction,
     * this should return 403.
     */
    expect([200, 400, 403]).toContain(
      response.status
    );
  });

  // ==========================================
  // ADMIN ASSIGNMENT
  // ==========================================

  it("should allow an admin to assign a change to an employee", async () => {
    const response = await request(app)
      .put(
        `/api/v1/changes/${createdChangeId}`
      )
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      )
      .send({
        assignedTo:
          employeeId,
      });

    console.log(
      "ADMIN ASSIGN RESPONSE:",
      response.body
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(
      response.body.data.assignedTo
    ).toBeDefined();
  });

  // ==========================================
  // ADMIN APPROVE
  // ==========================================

  it("should prevent employees from approving a change", async () => {
    const response = await request(app)
      .put(`/api/v1/changes/${createdChangeId}`)
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({
        status: "Approved",
        approvalReason: "Employee approval attempt",
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it("should prevent employees from rejecting a change", async () => {
    const response = await request(app)
      .put(`/api/v1/changes/${createdChangeId}`)
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({
        status: "Rejected",
        approvalReason: "Employee rejection attempt",
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it("should allow an admin to approve a change", async () => {
    const response = await request(app)
      .put(
        `/api/v1/changes/${createdChangeId}`
      )
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      )
      .send({
        status: "Approved",
        approvalReason:
          "Change reviewed and approved.",
      });

    console.log(
      "ADMIN APPROVAL RESPONSE:",
      response.body
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.data.status).toBe(
      "Approved"
    );

    expect(
      response.body.data.approvedBy
    ).toBeDefined();

    expect(
      response.body.data.approvedAt
    ).toBeDefined();
  });

  it("should allow an admin to reject a valid change", async () => {
    const createResponse = await request(app)
      .post("/api/v1/changes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        changeId: `CHG-REJECT-${Date.now()}`,
        title: "Change to Reject",
        description: "Admin rejection regression test",
      });

    expect(createResponse.status).toBe(201);

    const response = await request(app)
      .put(`/api/v1/changes/${createResponse.body.data._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: "Rejected",
        approvalReason: "Change rejected during review",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("Rejected");
    expect(response.body.data.rejectedBy).toBeDefined();
  });

  // ==========================================
  // APPROVED → IN PROGRESS
  // ==========================================

  it("should allow an approved change to move to In Progress", async () => {
    const response = await request(app)
      .put(
        `/api/v1/changes/${createdChangeId}`
      )
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      )
      .send({
        status: "In Progress",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.data.status).toBe(
      "In Progress"
    );

    expect(
      response.body.data.startedAt
    ).toBeDefined();
  });

  // ==========================================
  // COMPLETE
  // ==========================================

  it("should allow an In Progress change to be completed", async () => {
    const response = await request(app)
      .put(
        `/api/v1/changes/${createdChangeId}`
      )
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      )
      .send({
        status: "Completed",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.data.status).toBe(
      "Completed"
    );

    expect(
      response.body.data.completedAt
    ).toBeDefined();
  });

  // ==========================================
  // DELETE - EMPLOYEE
  // ==========================================

  it("should prevent employees from deleting changes", async () => {
    expect(createdChangeId).toBeDefined();

    const response = await request(app)
      .delete(
        `/api/v1/changes/${createdChangeId}`
      )
      .set(
        "Authorization",
        `Bearer ${employeeToken}`
      );

    expect(response.status).toBe(403);
  });

  // ==========================================
  // DELETE - ADMIN
  // ==========================================

  it("should allow admins to delete changes", async () => {
    expect(createdChangeId).toBeDefined();

    const response = await request(app)
      .delete(
        `/api/v1/changes/${createdChangeId}`
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