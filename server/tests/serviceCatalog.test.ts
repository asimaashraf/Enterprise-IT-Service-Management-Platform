import dotenv from "dotenv";

dotenv.config();

import request from "supertest";
import mongoose from "mongoose";

import app from "../src/app";
import { connectDB } from "../src/config/db";

describe("Service Catalog API", () => {
  let adminToken: string;
  let employeeToken: string;
  let createdServiceId: string;

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

    console.log("=================================");
    console.log(
      "MONGODB CONNECTION STATE:",
      mongoose.connection.readyState
    );
    console.log("=================================");

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

    console.log("=================================");
    console.log("ADMIN LOGIN STATUS:", adminLogin.status);
    console.log("ADMIN LOGIN RESPONSE:", adminLogin.body);
    console.log("=================================");

    if (adminLogin.status !== 200) {
      throw new Error(
        `Admin login failed. Status: ${adminLogin.status}. Response: ${JSON.stringify(
          adminLogin.body
        )}`
      );
    }

    expect(adminLogin.body.success).toBe(true);
    expect(adminLogin.body.data).toBeDefined();
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

    console.log("=================================");
    console.log("EMPLOYEE LOGIN STATUS:", employeeLogin.status);
    console.log("EMPLOYEE LOGIN RESPONSE:", employeeLogin.body);
    console.log("=================================");

    if (employeeLogin.status !== 200) {
      throw new Error(
        `Employee login failed. Status: ${employeeLogin.status}. Response: ${JSON.stringify(
          employeeLogin.body
        )}`
      );
    }

    expect(employeeLogin.body.success).toBe(true);
    expect(employeeLogin.body.data).toBeDefined();
    expect(employeeLogin.body.data.token).toBeDefined();

    employeeToken = employeeLogin.body.data.token;

    console.log("=================================");
    console.log("BOTH USERS LOGGED IN SUCCESSFULLY");
    console.log("=================================");
  }, 60000);

  // ==========================================
  // CLOSE DATABASE
  // ==========================================

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      console.log("=================================");
      console.log("CLOSING MONGODB CONNECTION...");
      console.log("=================================");

      await mongoose.connection.close();

      console.log("MONGODB CONNECTION CLOSED");
      console.log("=================================");
    }
  }, 30000);

  // ==========================================
  // GET ALL - UNAUTHENTICATED
  // ==========================================

  it("should reject unauthenticated requests to get service catalog", async () => {
    const response = await request(app).get(
      "/api/v1/service-catalog"
    );

    expect(response.status).toBe(401);
  });

  // ==========================================
  // CREATE - UNAUTHENTICATED
  // ==========================================

  it("should reject unauthenticated service catalog creation", async () => {
    const response = await request(app)
      .post("/api/v1/service-catalog")
      .send({
        name: "Test Service",
        description: "Test service description",
        category: "Technical",
      });

    expect(response.status).toBe(401);
  });

  // ==========================================
  // CREATE - EMPLOYEE
  // ==========================================

  it("should prevent employees from creating service catalog items", async () => {
    const response = await request(app)
      .post("/api/v1/service-catalog")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({
        name: "Employee Test Service",
        description: "Created by employee",
        category: "Technical",
      });

    expect(response.status).toBe(403);
  });

  // ==========================================
  // CREATE - ADMIN
  // ==========================================

  it("should allow an admin to create a service catalog item", async () => {
    const response = await request(app)
      .post("/api/v1/service-catalog")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: `Automated Test Service ${Date.now()}`,
        description: "Created by automated test",
        category: "Technical",
        isActive: true,
      });

    console.log("ADMIN CREATE RESPONSE:", response.body);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();

    createdServiceId = response.body.data._id;

    expect(createdServiceId).toBeDefined();
  });

  // ==========================================
  // GET ALL - EMPLOYEE
  // ==========================================

  it("should allow employees to get service catalog items", async () => {
    const response = await request(app)
      .get("/api/v1/service-catalog")
      .set("Authorization", `Bearer ${employeeToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  // ==========================================
  // GET ALL - ADMIN
  // ==========================================

  it("should allow admins to get service catalog items", async () => {
    const response = await request(app)
      .get("/api/v1/service-catalog")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  // ==========================================
  // GET BY ID - EMPLOYEE
  // ==========================================

  it("should allow employees to get a service catalog item by ID", async () => {
    expect(createdServiceId).toBeDefined();

    const response = await request(app)
      .get(`/api/v1/service-catalog/${createdServiceId}`)
      .set("Authorization", `Bearer ${employeeToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();

    expect(response.body.data._id).toBe(createdServiceId);
  });

  // ==========================================
  // GET BY ID - ADMIN
  // ==========================================

  it("should allow admins to get a service catalog item by ID", async () => {
    expect(createdServiceId).toBeDefined();

    const response = await request(app)
      .get(`/api/v1/service-catalog/${createdServiceId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();

    expect(response.body.data._id).toBe(createdServiceId);
  });

  // ==========================================
  // UPDATE - EMPLOYEE
  // ==========================================

  it("should prevent employees from updating service catalog items", async () => {
    expect(createdServiceId).toBeDefined();

    const response = await request(app)
      .put(`/api/v1/service-catalog/${createdServiceId}`)
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({
        description: "Employee attempted update",
      });

    expect(response.status).toBe(403);
  });

  // ==========================================
  // UPDATE - ADMIN
  // ==========================================

  it("should allow an admin to update a service catalog item", async () => {
    expect(createdServiceId).toBeDefined();

    const response = await request(app)
      .put(`/api/v1/service-catalog/${createdServiceId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        description: "Updated by automated test",
        isActive: false,
      });

    console.log("ADMIN UPDATE RESPONSE:", response.body);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();

    expect(response.body.data.description).toBe(
      "Updated by automated test"
    );

    expect(response.body.data.isActive).toBe(false);
  });

  // ==========================================
  // DELETE - EMPLOYEE
  // ==========================================

  it("should prevent employees from deleting service catalog items", async () => {
    expect(createdServiceId).toBeDefined();

    const response = await request(app)
      .delete(`/api/v1/service-catalog/${createdServiceId}`)
      .set("Authorization", `Bearer ${employeeToken}`);

    expect(response.status).toBe(403);
  });

  // ==========================================
  // DELETE - ADMIN
  // ==========================================

  it("should allow an admin to delete a service catalog item", async () => {
    expect(createdServiceId).toBeDefined();

    const response = await request(app)
      .delete(`/api/v1/service-catalog/${createdServiceId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    console.log("ADMIN DELETE RESPONSE:", response.body);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });
});
