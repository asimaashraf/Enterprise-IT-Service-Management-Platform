import dotenv from "dotenv";

dotenv.config();

import request from "supertest";
import mongoose from "mongoose";

import app from "../src/app";
import { connectDB } from "../src/config/db";

describe("Problem Management API", () => {
  let adminToken: string;
  let employeeToken: string;
  let createdProblemId: string;

  jest.setTimeout(60000);

  // ==========================================
  // CONNECT TO DATABASE + LOGIN USERS
  // ==========================================

  beforeAll(async () => {
    console.log("=================================");
    console.log("CONNECTING TO MONGODB...");
    console.log("=================================");

    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }

    if (mongoose.connection.readyState !== 1) {
      throw new Error("MongoDB connection was not established.");
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

    console.log("BOTH USERS LOGGED IN SUCCESSFULLY");
  }, 60000);

  // ==========================================
  // CLOSE DATABASE
  // ==========================================

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  }, 30000);

  // ==========================================
  // CREATE - UNAUTHENTICATED
  // ==========================================

  it("should reject unauthenticated problem creation", async () => {
    const response = await request(app)
      .post("/api/v1/problems")
      .send({
        problemId: `PRB-TEST-${Date.now()}`,
        title: "Test Problem",
        description: "Test problem description",
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  // ==========================================
  // GET ALL - UNAUTHENTICATED
  // ==========================================

  it("should reject unauthenticated requests to get problems", async () => {
    const response = await request(app).get(
      "/api/v1/problems"
    );

    expect(response.status).toBe(401);
  });

  // ==========================================
  // CREATE - EMPLOYEE
  // ==========================================

  it("should allow employees to create a problem", async () => {
    const response = await request(app)
      .post("/api/v1/problems")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({
        problemId: `PRB-EMP-${Date.now()}`,
        title: "Employee Test Problem",
        description: "Problem created by employee",
        priority: "Medium",
        impact: "Medium",
        urgency: "Medium",
      });

    console.log("EMPLOYEE CREATE RESPONSE:", response.body);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();

    expect(response.body.data.title).toBe(
      "Employee Test Problem"
    );

    expect(response.body.data.status).toBe("Open");
    expect(response.body.data.organizationId).toBeDefined();
    expect(response.body.data.reportedBy).toBeDefined();
  });

  // ==========================================
  // CREATE - ADMIN
  // ==========================================

  it("should allow admins to create a problem", async () => {
    const response = await request(app)
      .post("/api/v1/problems")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        problemId: `PRB-ADMIN-${Date.now()}`,
        title: "Automated Test Problem",
        description: "Created by automated test",
        priority: "High",
        impact: "High",
        urgency: "High",
      });

    console.log("ADMIN CREATE RESPONSE:", response.body);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();

    createdProblemId = response.body.data._id;

    expect(createdProblemId).toBeDefined();
    expect(response.body.data.status).toBe("Open");
  });

  // ==========================================
  // DUPLICATE PROBLEM ID
  // ==========================================

  it("should reject duplicate problem IDs within the organization", async () => {
    const problemId = `PRB-DUP-${Date.now()}`;

    const firstResponse = await request(app)
      .post("/api/v1/problems")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        problemId,
        title: "First Problem",
        description: "First problem",
      });

    expect(firstResponse.status).toBe(201);

    const secondResponse = await request(app)
      .post("/api/v1/problems")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        problemId,
        title: "Duplicate Problem",
        description: "Duplicate problem",
      });

    expect([400, 409]).toContain(secondResponse.status);
    expect(secondResponse.body.success).toBe(false);
  });

  // ==========================================
  // GET ALL - EMPLOYEE
  // ==========================================

  it("should allow employees to get all problems", async () => {
    const response = await request(app)
      .get("/api/v1/problems")
      .set("Authorization", `Bearer ${employeeToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  // ==========================================
  // GET ALL - ADMIN
  // ==========================================

  it("should allow admins to get all problems", async () => {
    const response = await request(app)
      .get("/api/v1/problems")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  // ==========================================
  // GET BY ID - EMPLOYEE
  // ==========================================

  it("should allow employees to get a problem by ID", async () => {
    expect(createdProblemId).toBeDefined();

    const response = await request(app)
      .get(`/api/v1/problems/${createdProblemId}`)
      .set("Authorization", `Bearer ${employeeToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();

    expect(response.body.data._id).toBe(
      createdProblemId
    );
  });

  // ==========================================
  // GET BY ID - ADMIN
  // ==========================================

  it("should allow admins to get a problem by ID", async () => {
    expect(createdProblemId).toBeDefined();

    const response = await request(app)
      .get(`/api/v1/problems/${createdProblemId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();

    expect(response.body.data._id).toBe(
      createdProblemId
    );
  });

  // ==========================================
  // UPDATE - EMPLOYEE GENERAL FIELD
  // ==========================================

  it("should allow employees to update basic problem information", async () => {
    expect(createdProblemId).toBeDefined();

    const response = await request(app)
      .put(`/api/v1/problems/${createdProblemId}`)
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({
        description: "Updated by employee",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.description).toBe(
      "Updated by employee"
    );
  });

  // ==========================================
  // UPDATE - EMPLOYEE STATUS MANAGEMENT
  // ==========================================

  it("should prevent employees from managing problem status", async () => {
    expect(createdProblemId).toBeDefined();

    const response = await request(app)
      .put(`/api/v1/problems/${createdProblemId}`)
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({
        status: "Under Investigation",
      });

    expect(response.status).toBe(403);
  });

  // ==========================================
  // ASSIGNMENT - EMPLOYEE
  // ==========================================

  it("should prevent employees from assigning problems", async () => {
    expect(createdProblemId).toBeDefined();

    const response = await request(app)
      .put(`/api/v1/problems/${createdProblemId}`)
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({
        assignedTo: "6a855db2efe3dd908daacfdb",
      });

    expect(response.status).toBe(403);
  });

  // ==========================================
  // UPDATE - ADMIN
  // ==========================================

  it("should allow admins to update problem information", async () => {
    expect(createdProblemId).toBeDefined();

    const response = await request(app)
      .put(`/api/v1/problems/${createdProblemId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        priority: "High",
        impact: "High",
        urgency: "High",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.data.priority).toBe("High");
    expect(response.body.data.impact).toBe("High");
    expect(response.body.data.urgency).toBe("High");
  });

  it("does not allow protected problem ownership fields to be mass-assigned", async () => {
    const created = await request(app)
      .post("/api/v1/problems")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        problemId: `PRB-PROTECTED-${Date.now()}`,
        title: "Protected problem",
        description: "Keep tenant and reporter immutable",
      });

    expect(created.status).toBe(201);
    const id = created.body.data._id;
    const originalOrganizationId = created.body.data.organizationId;
    const originalReporterId = created.body.data.reportedBy;

    const update = await request(app)
      .put(`/api/v1/problems/${id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Updated problem",
        organizationId: "000000000000000000000001",
        reportedBy: "000000000000000000000002",
      });

    expect(update.status).toBe(200);
    const stored = await (await import("../src/modules/problem/problem.model")).default.findById(id).lean();
    expect(stored?.organizationId.toString()).toBe(originalOrganizationId);
    expect(stored?.reportedBy.toString()).toBe(originalReporterId);
  });

  // ==========================================
  // STATUS: OPEN → UNDER INVESTIGATION
  // ==========================================

  it("should allow admin to move a problem to Under Investigation", async () => {
    const response = await request(app)
      .put(`/api/v1/problems/${createdProblemId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: "Under Investigation",
      });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe(
      "Under Investigation"
    );
  });

  // ==========================================
  // RCA - ROOT CAUSE
  // ==========================================

  it("should allow admin to record the root cause", async () => {
    const response = await request(app)
      .put(`/api/v1/problems/${createdProblemId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        rootCause:
          "Network configuration caused recurring VPN failures.",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.data.rootCause).toBe(
      "Network configuration caused recurring VPN failures."
    );
  });

  // ==========================================
  // RCA - WORKAROUND
  // ==========================================

  it("should allow admin to record a workaround", async () => {
    const response = await request(app)
      .put(`/api/v1/problems/${createdProblemId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        workaround:
          "Restart VPN service and reconnect using the backup gateway.",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.data.workaround).toBe(
      "Restart VPN service and reconnect using the backup gateway."
    );
  });

  // ==========================================
  // STATUS: UNDER INVESTIGATION → KNOWN ERROR
  // ==========================================

  it("should allow admin to mark a problem as Known Error", async () => {
    const response = await request(app)
      .put(`/api/v1/problems/${createdProblemId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: "Known Error",
      });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe(
      "Known Error"
    );
  });

  // ==========================================
  // RESOLVED WITHOUT RESOLUTION
  // ==========================================

  it("should reject resolving a problem without a resolution", async () => {
    const response = await request(app)
      .put(`/api/v1/problems/${createdProblemId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: "Resolved",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  // ==========================================
  // RESOLVE PROBLEM
  // ==========================================

  it("should allow admin to resolve a problem with a resolution", async () => {
    const response = await request(app)
      .put(`/api/v1/problems/${createdProblemId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: "Resolved",
        resolution:
          "Updated VPN configuration and replaced the faulty gateway.",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.data.status).toBe("Resolved");
    expect(response.body.data.resolution).toBe(
      "Updated VPN configuration and replaced the faulty gateway."
    );

    expect(response.body.data.resolvedAt).toBeDefined();
  });

  // ==========================================
  // CLOSE PROBLEM
  // ==========================================

  it("should allow admin to close a resolved problem", async () => {
    const response = await request(app)
      .put(`/api/v1/problems/${createdProblemId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: "Closed",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.data.status).toBe("Closed");
    expect(response.body.data.closedAt).toBeDefined();
  });

  // ==========================================
  // CLOSED PROBLEM PROTECTION
  // ==========================================

  it("should prevent reopening a closed problem", async () => {
    const response = await request(app)
      .put(`/api/v1/problems/${createdProblemId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: "Open",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  // ==========================================
  // DELETE - EMPLOYEE
  // ==========================================

  it("should prevent employees from deleting problems", async () => {
    expect(createdProblemId).toBeDefined();

    const response = await request(app)
      .delete(`/api/v1/problems/${createdProblemId}`)
      .set("Authorization", `Bearer ${employeeToken}`);

    expect(response.status).toBe(403);
  });

  // ==========================================
  // DELETE - ADMIN
  // ==========================================

  it("should allow admins to delete problems", async () => {
    expect(createdProblemId).toBeDefined();

    const response = await request(app)
      .delete(`/api/v1/problems/${createdProblemId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });
});