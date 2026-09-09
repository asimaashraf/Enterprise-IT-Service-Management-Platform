import request from "supertest";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

import app from "../src/app";
import { connectDB } from "../src/config/db";

import AuthUser from "../src/modules/auth/auth.model";
import Organization from "../src/modules/organization/organization.model";
import Problem from "../src/modules/problem/problem.model";
import Incident from "../src/modules/incident/incident.model";
import RCA from "../src/modules/rca/rca.model";
import RCACorrectiveAction from "../src/modules/rca/rcaCorrectiveAction.model";
jest.setTimeout(60000);

describe("RCA Corrective Actions Integration Tests", () => {
  let adminToken: string;
  let employeeToken: string;

  let organizationId: string;
  let adminId: string;
  let employeeId: string;

  let problemId: string;
  let incidentId: string;
  let rcaId: string;

  beforeAll(async () => {

    await connectDB();

    // ==========================================
    // CREATE ORGANIZATION
    // ==========================================

    const organization = await Organization.create({
      name: `RCA Corrective Action Org ${Date.now()}`,
      slug: `rca-corrective-action-org-${Date.now()}`,
      description: "Organization for RCA corrective action tests",
      isActive: true,
    });

    organizationId = organization._id.toString();

    // ==========================================
    // CREATE ADMIN DIRECTLY; public registration always creates employees
    // ==========================================

    const adminEmail = `rca.admin.${Date.now()}@example.com`;

    const admin = await AuthUser.create({
      name: "RCA Admin",
      email: adminEmail,
      password: await bcrypt.hash("Password123!", 10),
      role: "admin",
      isEmailVerified: true,
      organizationId,
    });

    adminId = admin._id.toString();

    // ==========================================
    // CREATE EMPLOYEE THROUGH REGISTER API
    // ==========================================

    const employeeEmail = `rca.employee.${Date.now()}@example.com`;

    const employeeRegister = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "RCA Employee",
        email: employeeEmail,
        password: "Password123!",
        role: "employee",
        organizationId,
      });

    expect(employeeRegister.status).toBe(201);
    expect(employeeRegister.body.success).toBe(true);

    employeeId = employeeRegister.body.data.user.id;

    // ==========================================
    // LOGIN ADMIN
    // ==========================================

    await AuthUser.updateOne({ email: employeeEmail }, { $set: { isEmailVerified: true } });

    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: adminEmail,
        password: "Password123!",
      });

    expect(adminLogin.status).toBe(200);
    expect(adminLogin.body.success).toBe(true);

    adminToken = adminLogin.body.data.token;

    // ==========================================
    // LOGIN EMPLOYEE
    // ==========================================

    const employeeLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: employeeEmail,
        password: "Password123!",
      });

    expect(employeeLogin.status).toBe(200);
    expect(employeeLogin.body.success).toBe(true);

    employeeToken = employeeLogin.body.data.token;

    // ==========================================
    // CREATE PROBLEM
    // ==========================================

    const problem = await Problem.create({
      problemId: `PRB-RCA-${Date.now()}`,
      title: "Network switch failure",
      description: "Network switch repeatedly failed",
      priority: "High",
      impact: "High",
      urgency: "High",
      status: "Open",
      reportedBy: adminId,
      organizationId,
    });

    problemId = problem._id.toString();

    // ==========================================
    // CREATE INCIDENT
    // ==========================================

    const incident = await Incident.create({
      incidentId: `INC-RCA-${Date.now()}`,
      title: "Network outage caused by switch",
      description: "Network outage related to faulty switch",
      priority: "High",
      severity: "Major",
      status: "Resolved",
      reportedBy: adminId,
      assignedTo: adminId,
      organizationId,
      resolution: "Faulty switch identified",
    });

    incidentId = incident._id.toString();
  });

  // ==========================================
  // CREATE RCA
  // ==========================================

  test("should create an RCA with corrective actions", async () => {
    const response = await request(app)
      .post("/api/v1/rcas")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        rcaId: `RCA-CA-${Date.now()}`,
        problem: problemId,
        rootCause: "Faulty network switch hardware",
        investigation:
          "Network logs and hardware diagnostics identified the faulty switch",
        contributingFactors: [
          "Old hardware",
          "No proactive hardware replacement",
        ],
        correctiveActions: [
          "Replace the faulty network switch",
          "Verify network configuration",
        ],
        preventiveActions: [
          "Introduce periodic network hardware checks",
        ],
        identifiedBy: adminId,
        relatedIncidents: [incidentId],
        status: "Draft",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);

    expect(response.body.data.correctiveActions).toEqual([
      "Replace the faulty network switch",
      "Verify network configuration",
    ]);

    rcaId = response.body.data._id;

    expect(rcaId).toBeDefined();
  });

  // ==========================================
  // GET RCA
  // ==========================================

  test("should return corrective actions when retrieving an RCA", async () => {
    const response = await request(app)
      .get(`/api/v1/rcas/${rcaId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.data.correctiveActions).toHaveLength(2);

    expect(response.body.data.correctiveActions).toContain(
      "Replace the faulty network switch"
    );

    expect(response.body.data.correctiveActions).toContain(
      "Verify network configuration"
    );
  });

  // ==========================================
  // UPDATE CORRECTIVE ACTIONS
  // ==========================================

  test("should update corrective actions", async () => {
    const response = await request(app)
      .put(`/api/v1/rcas/${rcaId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        correctiveActions: [
          "Replace the faulty network switch",
          "Verify network configuration",
          "Test all affected network ports",
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.data.correctiveActions).toEqual([
      "Replace the faulty network switch",
      "Verify network configuration",
      "Test all affected network ports",
    ]);
  });

  // ==========================================
  // EMPLOYEE UPDATE
  // ==========================================

  test("should block employees from updating RCA corrective actions", async () => {
    const response = await request(app)
      .put(`/api/v1/rcas/${rcaId}`)
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({
        correctiveActions: [
          "Replace the faulty network switch",
          "Verify network configuration",
          "Test all affected network ports",
          "Document the replacement",
        ],
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  test("should allow an admin to create and update a corrective action", async () => {
    const createResponse = await request(app)
      .post(`/api/v1/rcas/${rcaId}/corrective-actions`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Replace network switch",
        description: "Replace the failed switch",
        assignedTo: adminId,
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      });

    expect(createResponse.status).toBe(201);
    const actionId = createResponse.body.data._id;

    const updateResponse = await request(app)
      .put(`/api/v1/rcas/${rcaId}/corrective-actions/${actionId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Replace failed network switch" });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.success).toBe(true);
  });

  test("should block employees from mutating corrective actions", async () => {
    const action = await RCACorrectiveAction.findOne({
      rca: rcaId,
      organizationId,
    });

    expect(action).toBeDefined();

    const response = await request(app)
      .delete(`/api/v1/rcas/${rcaId}/corrective-actions/${action!._id}`)
      .set("Authorization", `Bearer ${employeeToken}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  // ==========================================
  // INVALID CORRECTIVE ACTION
  // ==========================================

  test("should handle invalid corrective action values", async () => {
    const response = await request(app)
      .put(`/api/v1/rcas/${rcaId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        correctiveActions: [42],
      });

    expect(response.status).toBe(400);
  });

  // ==========================================
  // UNAUTHENTICATED UPDATE
  // ==========================================

  test("should not allow an unauthenticated user to update corrective actions", async () => {
    const response = await request(app)
      .put(`/api/v1/rcas/${rcaId}`)
      .send({
        correctiveActions: [
          "Unauthorized modification",
        ],
      });

    expect(response.status).toBe(401);
  });

  // ==========================================
  // COMPLETE RCA
  // ==========================================

  test("should complete the RCA", async () => {
    const response = await request(app)
      .put(`/api/v1/rcas/${rcaId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: "Completed",
        rootCause: "Faulty network switch hardware",
        investigation:
          "Hardware diagnostics confirmed the faulty switch",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.data.status).toBe("Completed");
  });

  // ==========================================
  // APPROVE RCA
  // ==========================================

  test("should approve the RCA", async () => {
    const response = await request(app)
      .put(`/api/v1/rcas/${rcaId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: "Approved",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.data.status).toBe("Approved");
  });

  // ==========================================
  // APPROVED RCA IMMUTABILITY
  // ==========================================

  test("should prevent corrective action modification after RCA approval", async () => {
    const response = await request(app)
      .put(`/api/v1/rcas/${rcaId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        correctiveActions: [
          "Attempted modification after approval",
        ],
      });

    expect(response.status).toBe(400);

    expect(response.body.message).toBe(
      "Approved RCA cannot be modified"
    );
  });

  // ==========================================
  // PRESERVE CORRECTIVE ACTIONS
  // ==========================================

  test("should preserve corrective actions after approval", async () => {
    const response = await request(app)
      .get(`/api/v1/rcas/${rcaId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.data.correctiveActions).toEqual([
      "Replace the faulty network switch",
      "Verify network configuration",
      "Test all affected network ports",
    ]);
  });

  // ==========================================
  // CLEANUP
  // ==========================================

  afterAll(async () => {

    await RCACorrectiveAction.deleteMany({ organizationId });
    if (rcaId) {
      await RCA.deleteOne({
        _id: rcaId,
      });
    }

    if (incidentId) {
      await Incident.deleteOne({
        _id: incidentId,
      });
    }

    if (problemId) {
      await Problem.deleteOne({
        _id: problemId,
      });
    }

    if (employeeId) {
      await AuthUser.deleteOne({
        _id: employeeId,
      });
    }

    if (adminId) {
      await AuthUser.deleteOne({
        _id: adminId,
      });
    }

    if (organizationId) {
      await Organization.deleteOne({
        _id: organizationId,
      });
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });
});