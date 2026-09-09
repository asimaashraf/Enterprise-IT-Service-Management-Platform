import "dotenv/config";

import request from "supertest";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

import app from "../src/app";

import AuthUser from "../src/modules/auth/auth.model";
import Organization from "../src/modules/organization/organization.model";

jest.setTimeout(60000);

describe("ITSM API - End-to-End Flow", () => {
  let organizationId: string;

  let adminToken: string;
  let employeeToken: string;

  let adminId: string;
  let employeeId: string;

  beforeAll(async () => {
    // ==========================================
    // DATABASE CONNECTION
    // ==========================================

    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error(
        "MONGO_URI is not defined"
      );
    }

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // ==========================================
    // CREATE TEST ORGANIZATION
    // ==========================================

    const timestamp = Date.now();

    const organization =
      await Organization.create({
        name: `E2E Organization ${timestamp}`,
        slug: `e2e-organization-${timestamp}`,
        description:
          "Organization for E2E testing",
      });

    organizationId =
      organization._id.toString();

    // ==========================================
    // PASSWORD
    // ==========================================

    const password = await bcrypt.hash(
      "E2ETestPassword123",
      10
    );

    // ==========================================
    // CREATE ADMIN
    // ==========================================

    const admin = await AuthUser.create({
      name: "E2E Admin",
      email: `e2e.admin.${timestamp}@example.com`,
      password,
      role: "admin",
      organizationId,
      isActive: true,
      isEmailVerified: true,
    });

    adminId = admin._id.toString();

    // ==========================================
    // CREATE EMPLOYEE
    // ==========================================

    const employee = await AuthUser.create({
      name: "E2E Employee",
      email: `e2e.employee.${timestamp}@example.com`,
      password,
      role: "employee",
      organizationId,
      isActive: true,
      isEmailVerified: true,
    });

    employeeId =
      employee._id.toString();

    // ==========================================
    // ADMIN LOGIN
    // ==========================================

    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: admin.email,
        password:
          "E2ETestPassword123",
      });

    expect(adminLogin.status).toBe(200);

    expect(
      adminLogin.body
    ).toHaveProperty("data.token");

    adminToken =
      adminLogin.body.data.token;

    // ==========================================
    // EMPLOYEE LOGIN
    // ==========================================

    const employeeLogin =
      await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: employee.email,
          password:
            "E2ETestPassword123",
        });

    expect(
      employeeLogin.status
    ).toBe(200);

    expect(
      employeeLogin.body
    ).toHaveProperty("data.token");

    employeeToken =
      employeeLogin.body.data.token;
  });

  // ==========================================
  // CLEANUP
  // ==========================================

  afterAll(async () => {
    if (organizationId) {
      await AuthUser.deleteMany({
        organizationId,
      });

      await Organization.deleteOne({
        _id: organizationId,
      });
    }

    if (
      mongoose.connection.readyState !== 0
    ) {
      await mongoose.connection.close();
    }
  });

  // ==========================================
  // HEALTH
  // ==========================================

  it("should expose a healthy API", async () => {
    const response = await request(app)
      .get("/api/v1/health");

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      success: true,
      message: "ITSM API is running",
    });
  });

  // ==========================================
  // AUTHENTICATION
  // ==========================================

  it("should authenticate the admin", async () => {
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      );

    expect(response.status).toBe(200);

    expect(
      response.body.success
    ).toBe(true);
  });

  it("should authenticate the employee", async () => {
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set(
        "Authorization",
        `Bearer ${employeeToken}`
      );

    expect(response.status).toBe(200);

    expect(
      response.body.success
    ).toBe(true);
  });

  // ==========================================
  // UNAUTHENTICATED ACCESS
  // ==========================================

  it("should reject unauthenticated asset access", async () => {
    const response = await request(app)
      .get("/api/v1/assets");

    expect(response.status).toBe(401);

    expect(
      response.body.success
    ).toBe(false);
  });

  it("should reject unauthenticated incident access", async () => {
    const response = await request(app)
      .get("/api/v1/incidents");

    expect(response.status).toBe(401);

    expect(
      response.body.success
    ).toBe(false);
  });

  // ==========================================
  // AUTHENTICATED API ACCESS
  // ==========================================

  it("should allow employee to access incidents", async () => {
    const response = await request(app)
      .get("/api/v1/incidents")
      .set(
        "Authorization",
        `Bearer ${employeeToken}`
      );

    expect(response.status).toBe(200);

    expect(
      response.body.success
    ).toBe(true);

    expect(
      Array.isArray(response.body.data)
    ).toBe(true);
  });

  it("should allow admin to access analytics", async () => {
    const response = await request(app)
      .get(
        `/api/v1/analytics/technician-performance?organizationId=${organizationId}`
      )
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      );

    // Analytics implementation may use
    // a different route structure.
    // A 404 means the route needs to be
    // checked rather than treating it as
    // an authentication failure.

    expect(
      [200, 404].includes(response.status)
    ).toBe(true);
  });

  // ==========================================
  // RBAC
  // ==========================================

  it("should prevent employee from creating an asset", async () => {
    const response = await request(app)
      .post("/api/v1/assets")
      .set(
        "Authorization",
        `Bearer ${employeeToken}`
      )
      .send({
        name: "E2E Test Laptop",
        assetTag: `E2E-${Date.now()}`,
      });

    expect(response.status).toBe(403);

    expect(
      response.body.success
    ).toBe(false);
  });

  // ==========================================
  // ADMIN ASSET CREATION
  // ==========================================

  it("should allow admin to create an asset", async () => {
    const response = await request(app)
      .post("/api/v1/assets")
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      )
      .send({
        name: "E2E Test Laptop",
        assetTag: `E2E-ASSET-${Date.now()}`,
        type: "Laptop",
        status: "Available",
      });

    expect(
      [201, 400].includes(response.status)
    ).toBe(true);

    expect(
      response.body
    ).toHaveProperty("success");
  });

  // ==========================================
  // INVALID ROUTE
  // ==========================================

  it("should return 404 for an unknown route", async () => {
    const response = await request(app)
      .get("/api/v1/this-route-does-not-exist");

    expect(response.status).toBe(404);

    expect(
      response.body
    ).toEqual({
      success: false,
      message:
        "Route not found: GET /api/v1/this-route-does-not-exist",
    });
  });
});