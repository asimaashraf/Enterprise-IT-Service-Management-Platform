import dotenv from "dotenv";
dotenv.config();

import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import app from "../src/app";
import Department from "../src/modules/department/department.model";

jest.setTimeout(30000);

describe("Department API", () => {
  const organizationId = "6a856a1ea3cc73b2aa648304";

  let createdDepartmentId: string | undefined;

  // ==========================================
  // DATABASE SETUP
  // ==========================================

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGO_URI as string
      );
    }
  });

  // ==========================================
  // DATABASE CLEANUP
  // ==========================================

  afterAll(async () => {
    try {
      if (createdDepartmentId) {
        await Department.findByIdAndDelete(
          createdDepartmentId
        );
      }
    } finally {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    }
  });

  // ==========================================
  // EMPLOYEE TOKEN
  // ==========================================

  const employeeToken = jwt.sign(
    {
      id: "test-employee-id",
      email: "employee@test.com",
      role: "employee",
      organizationId,
    },
    process.env.JWT_SECRET as string,
    {
      expiresIn: "1h",
    }
  );

  // ==========================================
  // UNAUTHENTICATED GET
  // ==========================================

  it(
    "should reject unauthenticated requests to get departments",
    async () => {
      const response = await request(app)
        .get("/api/v1/departments");

      expect(response.status).toBe(401);

      expect(response.body).toHaveProperty(
        "success",
        false
      );
    }
  );

  // ==========================================
  // UNAUTHENTICATED CREATE
  // ==========================================

  it(
    "should reject unauthenticated department creation",
    async () => {
      const response = await request(app)
        .post("/api/v1/departments")
        .send({
          name: "Test Department",
          description: "Test department",
        });

      expect(response.status).toBe(401);

      expect(response.body).toHaveProperty(
        "success",
        false
      );
    }
  );

  // ==========================================
  // EMPLOYEE RBAC
  // ==========================================

  it(
    "should prevent employees from creating departments",
    async () => {
      const response = await request(app)
        .post("/api/v1/departments")
        .set(
          "Authorization",
          `Bearer ${employeeToken}`
        )
        .send({
          name: "Employee Test Department",
          description: "Should not be created",
        });

      expect(response.status).toBe(403);

      expect(response.body).toHaveProperty(
        "success",
        false
      );

      expect(response.body.message).toBe(
        "You are not authorized to perform this action"
      );
    }
  );

  // ==========================================
  // ADMIN CREATE
  // ==========================================

  it(
    "should allow an admin to create a department",
    async () => {
      const adminToken = jwt.sign(
        {
          id: "test-admin-id",
          email: "admin@test.com",
          role: "admin",
          organizationId,
        },
        process.env.JWT_SECRET as string,
        {
          expiresIn: "1h",
        }
      );

      const response = await request(app)
        .post("/api/v1/departments")
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        )
        .send({
          name: `Automated Test Department ${Date.now()}`,
          description: "Created by automated test",
        });

      expect(response.status).toBe(201);

      expect(response.body).toHaveProperty(
        "success",
        true
      );

      expect(response.body).toHaveProperty(
        "message",
        "Department created successfully"
      );

      expect(response.body.data).toHaveProperty(
        "name"
      );

      expect(response.body.data).toHaveProperty(
        "organizationId",
        organizationId
      );

      createdDepartmentId =
        response.body.data._id;
    }
  );

  it("allows valid department updates and active state changes", async () => {
    const adminToken = jwt.sign(
      { id: "test-admin-id", email: "admin@test.com", role: "admin", organizationId },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );
    const response = await request(app)
      .put(`/api/v1/departments/${createdDepartmentId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `Updated Department ${Date.now()}`, description: "Updated", isActive: false });

    expect(response.status).toBe(200);
    expect(response.body.data.isActive).toBe(false);
    expect(response.body.data.organizationId).toBe(organizationId);
  });

  it("rejects protected and unknown department update fields", async () => {
    const adminToken = jwt.sign(
      { id: "test-admin-id", email: "admin@test.com", role: "admin", organizationId },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );
    const response = await request(app)
      .put(`/api/v1/departments/${createdDepartmentId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ organizationId: "507f1f77bcf86cd799439011", unknown: true });

    expect(response.status).toBe(400);
    const department = await Department.findById(createdDepartmentId);
    expect(department?.organizationId.toString()).toBe(organizationId);
  });
});