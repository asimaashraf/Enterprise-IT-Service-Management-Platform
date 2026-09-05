import dotenv from "dotenv";

dotenv.config();

import request from "supertest";
import mongoose from "mongoose";

import app from "../src/app";
import { connectDB } from "../src/config/db";

describe("SLA Management API", () => {
  let adminToken: string;
  let employeeToken: string;

  let incidentId: string;
  let slaId: string;

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

    console.log(
      "BOTH USERS LOGGED IN SUCCESSFULLY"
    );
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
  // UNAUTHENTICATED CREATE
  // ==========================================

  it("should reject unauthenticated SLA creation", async () => {
    const response = await request(app)
      .post(
        "/api/v1/slas/incidents/INC-001"
      )
      .send({});

    expect(response.status).toBe(401);

    expect(response.body).toHaveProperty(
      "success",
      false
    );
  });

  // ==========================================
  // UNAUTHENTICATED GET ALL
  // ==========================================

  it("should reject unauthenticated SLA listing", async () => {
    const response = await request(app).get(
      "/api/v1/slas"
    );

    expect(response.status).toBe(401);

    expect(response.body).toHaveProperty(
      "success",
      false
    );
  });

  // ==========================================
  // CREATE TEST INCIDENT
  // ==========================================

  it("should create an incident for SLA testing", async () => {
    const response = await request(app)
      .post("/api/v1/incidents")
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      )
      .send({
        incidentId: `INC-SLA-${Date.now()}`,
        title: "SLA Test Incident",
        description:
          "Incident created for SLA testing",
        priority: "High",
        severity: "Critical",
      });

    console.log(
      "INCIDENT CREATE RESPONSE:",
      response.body
    );

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data._id).toBeDefined();

    incidentId = response.body.data._id;
  });

  // ==========================================
  // CREATE SLA
  // ==========================================

  it("should allow admin to create an SLA for an incident", async () => {
    expect(incidentId).toBeDefined();

    const response = await request(app)
      .post(
        `/api/v1/slas/incidents/${incidentId}`
      )
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      );

    console.log(
      "SLA CREATE RESPONSE:",
      response.body
    );

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();

    slaId = response.body.data._id;

    expect(slaId).toBeDefined();

    expect(response.body.data.priority).toBe(
      "High"
    );

    expect(
      response.body.data.responseTimeMinutes
    ).toBe(30);

    expect(
      response.body.data.resolutionTimeMinutes
    ).toBe(240);

    expect(
      response.body.data.responseDueAt
    ).toBeDefined();

    expect(
      response.body.data.resolutionDueAt
    ).toBeDefined();

    expect(response.body.data.status).toBe(
      "Active"
    );

    expect(
      response.body.data.responseBreached
    ).toBe(false);

    expect(
      response.body.data.resolutionBreached
    ).toBe(false);
  });

  it("should persist custom business hours for an SLA", async () => {
    const incidentResponse = await request(app)
      .post("/api/v1/incidents")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        incidentId: `INC-SLA-CUSTOM-${Date.now()}`,
        title: "Custom hours SLA incident",
        description: "Incident for custom SLA hours",
        priority: "High",
        severity: "Major",
      });

    expect(incidentResponse.status).toBe(201);

    const response = await request(app)
      .post(`/api/v1/slas/incidents/${incidentResponse.body.data._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        businessHours: {
          startTime: "08:00",
          endTime: "16:00",
          timezone: "UTC",
          workingDays: [1, 2, 3, 4, 5],
        },
      });

    expect(response.status).toBe(201);
    expect(response.body.data.businessHours).toMatchObject({
      startHour: 8,
      endHour: 16,
      timezone: "UTC",
    });
  });

  // ==========================================
  // DUPLICATE SLA
  // ==========================================

  it("should reject duplicate SLA creation for the same incident", async () => {
    expect(incidentId).toBeDefined();

    const response = await request(app)
      .post(
        `/api/v1/slas/incidents/${incidentId}`
      )
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      );

    expect(response.status).toBe(400);

    expect(response.body.success).toBe(false);
  });

  // ==========================================
  // GET SLA BY INCIDENT
  // ==========================================

  it("should allow employees to get an SLA by incident", async () => {
    expect(incidentId).toBeDefined();

    const response = await request(app)
      .get(
        `/api/v1/slas/incidents/${incidentId}`
      )
      .set(
        "Authorization",
        `Bearer ${employeeToken}`
      );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();

    expect(
      response.body.data._id
    ).toBe(slaId);
  });

  // ==========================================
  // GET SLA BY INCIDENT - ADMIN
  // ==========================================

  it("should allow admins to get an SLA by incident", async () => {
    const response = await request(app)
      .get(
        `/api/v1/slas/incidents/${incidentId}`
      )
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();

    expect(
      response.body.data._id
    ).toBe(slaId);
  });

  // ==========================================
  // GET ALL SLAS
  // ==========================================

  it("should allow employees to get all organization SLAs", async () => {
    const response = await request(app)
      .get("/api/v1/slas")
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
  // ADMIN GET ALL
  // ==========================================

  it("should allow admins to get all organization SLAs", async () => {
    const response = await request(app)
      .get("/api/v1/slas")
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
  // RECORD RESPONSE
  // ==========================================

  it("should record the SLA response", async () => {
    expect(slaId).toBeDefined();

    const response = await request(app)
      .patch(
        `/api/v1/slas/${slaId}/response`
      )
      .set(
        "Authorization",
        `Bearer ${employeeToken}`
      );

    console.log(
      "SLA RESPONSE RECORD:",
      response.body
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(
      response.body.data.respondedAt
    ).toBeDefined();
  });

  // ==========================================
  // RECORD RESPONSE AGAIN
  // ==========================================

  it("should not create a second SLA response timestamp", async () => {
    const first = await request(app)
      .get(
        `/api/v1/slas/incidents/${incidentId}`
      )
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      );

    const firstRespondedAt =
      first.body.data.respondedAt;

    const response = await request(app)
      .patch(
        `/api/v1/slas/${slaId}/response`
      )
      .set(
        "Authorization",
        `Bearer ${employeeToken}`
      );

    expect(response.status).toBe(200);

    expect(
      response.body.data.respondedAt
    ).toBe(firstRespondedAt);
  });

  // ==========================================
  // CHECK BREACH
  // ==========================================

  it("should successfully check SLA breach status", async () => {
    expect(slaId).toBeDefined();

    const response = await request(app)
      .patch(
        `/api/v1/slas/${slaId}/check-breach`
      )
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      );

    console.log(
      "SLA BREACH CHECK:",
      response.body
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });

  // ==========================================
  // RECORD RESOLUTION
  // ==========================================

  it("should record SLA resolution", async () => {
    expect(slaId).toBeDefined();

    const response = await request(app)
      .patch(
        `/api/v1/slas/${slaId}/resolution`
      )
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      );

    console.log(
      "SLA RESOLUTION RECORD:",
      response.body
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(
      response.body.data.resolvedAt
    ).toBeDefined();

    expect(response.body.data.status).toBe(
      "Completed"
    );
  });

  // ==========================================
  // RECORD RESOLUTION AGAIN
  // ==========================================

  it("should not create a second resolution timestamp", async () => {
    const first = await request(app)
      .get(
        `/api/v1/slas/incidents/${incidentId}`
      )
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      );

    const firstResolvedAt =
      first.body.data.resolvedAt;

    const response = await request(app)
      .patch(
        `/api/v1/slas/${slaId}/resolution`
      )
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      );

    expect(response.status).toBe(200);

    expect(
      response.body.data.resolvedAt
    ).toBe(firstResolvedAt);

    expect(response.body.data.status).toBe(
      "Completed"
    );
  });

  // ==========================================
  // NONEXISTENT INCIDENT
  // ==========================================

  it("should reject SLA creation for a nonexistent incident", async () => {
    const fakeIncidentId =
      new mongoose.Types.ObjectId().toString();

    const response = await request(app)
      .post(
        `/api/v1/slas/incidents/${fakeIncidentId}`
      )
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      );

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});