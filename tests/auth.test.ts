import "dotenv/config";

import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app";
import AuthUser from "../src/modules/auth/auth.model";
import Organization from "../src/modules/organization/organization.model";

describe("Authentication API", () => {
  let organizationId: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error("MONGO_URI is not defined");
    }

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const timestamp = Date.now();
    const organization = await Organization.create({
      name: `Auth Test Organization ${timestamp}`,
      slug: `auth-test-organization-${timestamp}`,
    });

    organizationId = organization._id.toString();
  });

  afterAll(async () => {
    if (organizationId) {
      await AuthUser.deleteMany({ organizationId });
      await Organization.deleteOne({ _id: organizationId });
    }
  });

  it("should reject login when credentials are missing", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({});

    expect(response.status).toBe(401);

    expect(response.body).toHaveProperty(
      "success",
      false
    );

    expect(response.body).toHaveProperty(
      "message"
    );
  });

  it("should create an employee through public registration", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Public Employee",
        email: `public.employee.${Date.now()}@example.com`,
        password: "PublicPassword123",
        organizationId,
      });

    expect(response.status).toBe(201);
    expect(response.body.data.user.role).toBe("employee");
  });

  it("should ignore an admin role supplied to public registration", async () => {
    const email = `public.admin-attempt.${Date.now()}@example.com`;

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Public Admin Attempt",
        email,
        password: "PublicPassword123",
        organizationId,
        role: "admin",
      });

    expect(response.status).toBe(201);
    expect(response.body.data.user.role).toBe("employee");

    const storedUser = await AuthUser.findOne({ email });
    expect(storedUser?.role).toBe("employee");
  });
});
