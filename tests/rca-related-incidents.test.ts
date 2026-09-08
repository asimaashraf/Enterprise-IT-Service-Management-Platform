import request from "supertest";
import mongoose from "mongoose";

import app from "../src/app";
import { connectDB } from "../src/config/db";

import AuthUser from "../src/modules/auth/auth.model";
import Organization from "../src/modules/organization/organization.model";
import Problem from "../src/modules/problem/problem.model";
import Incident from "../src/modules/incident/incident.model";
import RCA from "../src/modules/rca/rca.model";
import { createTestUser } from "./test-fixtures";

jest.setTimeout(30000);

describe("RCA Related Incidents Integration Tests", () => {
  let adminToken: string;
  let employeeToken: string;

  let organizationId: string;
  let adminId: string;
  let employeeId: string;

  let problemId: string;
  let incidentId: string;
  let secondIncidentId: string;
  let rcaId: string;

  beforeAll(async () => {

    await connectDB();

    // ==========================================
    // CREATE ORGANIZATION
    // ==========================================

    const organization = await Organization.create({
      name: `RCA Related Incidents Org ${Date.now()}`,
      slug: `rca-related-incidents-org-${Date.now()}`,
      description: "Organization for RCA related incident tests",
      isActive: true,
    });

    organizationId = organization._id.toString();

    // ==========================================
    // CREATE ADMIN
    // ==========================================

    const adminEmail =
      `rca.related.admin.${Date.now()}@example.com`;

    const admin = await createTestUser({
      name: "RCA Related Admin",
      email: adminEmail,
      password: "Password123!",
      role: "admin",
      organizationId,
    });

    adminId = admin._id.toString();

    // ==========================================
    // CREATE EMPLOYEE
    // ==========================================

    const employeeEmail =
      `rca.related.employee.${Date.now()}@example.com`;

    const employeeRegister = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "RCA Related Employee",
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
      problemId: `PRB-RCA-RELATED-${Date.now()}`,
      title: "Recurring network outage",
      description:
        "Network outage repeatedly affects users",
      priority: "High",
      impact: "High",
      urgency: "High",
      status: "Open",
      reportedBy: adminId,
      organizationId,
    });

    problemId = problem._id.toString();

    // ==========================================
    // CREATE FIRST INCIDENT
    // ==========================================

    const incident = await Incident.create({
      incidentId: `INC-RCA-RELATED-${Date.now()}`,
      title: "Network outage incident",
      description:
        "Network outage caused by faulty hardware",
      priority: "High",
      severity: "Major",
      status: "Resolved",
      reportedBy: adminId,
      assignedTo: adminId,
      organizationId,
      resolution: "Faulty network hardware identified",
    });

    incidentId = incident._id.toString();

    // ==========================================
    // CREATE SECOND INCIDENT
    // ==========================================

    const secondIncident = await Incident.create({
      incidentId: `INC-RCA-RELATED-2-${Date.now()}`,
      title: "Second network outage",
      description:
        "Another outage caused by the same hardware issue",
      priority: "High",
      severity: "Major",
      status: "Resolved",
      reportedBy: adminId,
      assignedTo: adminId,
      organizationId,
      resolution: "Network hardware issue confirmed",
    });

    secondIncidentId =
      secondIncident._id.toString();
  });

  // ==========================================
  // CREATE RCA WITH RELATED INCIDENTS
  // ==========================================

  test("should create an RCA with related incidents", async () => {
    const response = await request(app)
      .post("/api/v1/rcas")
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      )
      .send({
        rcaId: `RCA-RELATED-${Date.now()}`,
        problem: problemId,
        rootCause:
          "Faulty network switch hardware",
        investigation:
          "Multiple incident records and network logs identified the same hardware issue",
        contributingFactors: [
          "Old hardware",
          "No proactive replacement",
        ],
        correctiveActions: [
          "Replace faulty network switch",
        ],
        preventiveActions: [
          "Introduce periodic hardware checks",
        ],
        identifiedBy: adminId,
        relatedIncidents: [
          incidentId,
          secondIncidentId,
        ],
        status: "Draft",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);

    expect(
      response.body.data.relatedIncidents
    ).toHaveLength(2);

    rcaId = response.body.data._id;

    expect(rcaId).toBeDefined();
  });

  // ==========================================
  // GET RCA WITH RELATED INCIDENTS
  // ==========================================

  test("should return related incidents when retrieving an RCA", async () => {
    const response = await request(app)
      .get(`/api/v1/rcas/${rcaId}`)
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(
      response.body.data.relatedIncidents
    ).toHaveLength(2);

    const returnedIncidentIds =
      response.body.data.relatedIncidents.map(
        (incident: any) =>
          incident._id
            ? incident._id.toString()
            : incident.toString()
      );

    expect(returnedIncidentIds).toContain(
      incidentId
    );

    expect(returnedIncidentIds).toContain(
      secondIncidentId
    );
  });

  // ==========================================
  // UPDATE RELATED INCIDENTS
  // ==========================================

  test("should update related incidents", async () => {
    const response = await request(app)
      .put(`/api/v1/rcas/${rcaId}`)
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      )
      .send({
        relatedIncidents: [incidentId],
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(
      response.body.data.relatedIncidents
    ).toHaveLength(1);
  });

  // ==========================================
  // EMPLOYEE UPDATE
  // ==========================================

  test("should block authenticated employee from updating related incidents", async () => {
    const response = await request(app)
      .put(`/api/v1/rcas/${rcaId}`)
      .set(
        "Authorization",
        `Bearer ${employeeToken}`
      )
      .send({
        relatedIncidents: [
          incidentId,
          secondIncidentId,
        ],
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  // ==========================================
  // INVALID INCIDENT ID
  // ==========================================

  test("should reject invalid related incident IDs", async () => {
    const response = await request(app)
      .put(`/api/v1/rcas/${rcaId}`)
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      )
      .send({
        relatedIncidents: [
          "invalid-incident-id",
        ],
      });

    expect([400, 404]).toContain(
      response.status
    );
  });

  // ==========================================
  // UNAUTHENTICATED UPDATE
  // ==========================================

  test("should not allow unauthenticated users to update related incidents", async () => {
    const response = await request(app)
      .put(`/api/v1/rcas/${rcaId}`)
      .send({
        relatedIncidents: [incidentId],
      });

    expect(response.status).toBe(401);
  });

  // ==========================================
  // COMPLETE RCA
  // ==========================================

  test("should complete the RCA", async () => {
    const response = await request(app)
      .put(`/api/v1/rcas/${rcaId}`)
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      )
      .send({
        status: "Completed",
        rootCause:
          "Faulty network switch hardware",
        investigation:
          "Incident history confirmed recurring hardware failure",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe(
      "Completed"
    );
  });

  // ==========================================
  // APPROVE RCA
  // ==========================================

  test("should approve the RCA", async () => {
    const response = await request(app)
      .put(`/api/v1/rcas/${rcaId}`)
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      )
      .send({
        status: "Approved",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe(
      "Approved"
    );
  });

  // ==========================================
  // APPROVED RCA IMMUTABILITY
  // ==========================================

  test("should prevent related incident modification after RCA approval", async () => {
    const response = await request(app)
      .put(`/api/v1/rcas/${rcaId}`)
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      )
      .send({
        relatedIncidents: [incidentId],
      });

    expect(response.status).toBe(400);

    expect(response.body.message).toBe(
      "Approved RCA cannot be modified"
    );
  });

  // ==========================================
  // PRESERVE RELATED INCIDENTS
  // ==========================================

  test("should preserve related incidents after approval", async () => {
    const response = await request(app)
      .get(`/api/v1/rcas/${rcaId}`)
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(
      response.body.data.relatedIncidents
    ).toHaveLength(1);
  });

  // ==========================================
  // CLEANUP
  // ==========================================

  afterAll(async () => {

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

    if (secondIncidentId) {
      await Incident.deleteOne({
        _id: secondIncidentId,
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