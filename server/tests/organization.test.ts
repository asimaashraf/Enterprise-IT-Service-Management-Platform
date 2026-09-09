import request from "supertest";
import app from "../src/app";
import "dotenv/config";
import Organization from "../src/modules/organization/organization.model";
import {
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
} from "./test-fixtures";

describe("Organization API", () => {
  let organizationId = "";
  let adminToken = "";

  beforeAll(async () => {
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD });
    expect(login.status).toBe(200);
    adminToken = login.body.data.token;
    organizationId = login.body.data.user.organizationId;
  });

  it("should reject unauthenticated requests", async () => {
    const response = await request(app)
      .get("/api/v1/organizations");

    expect(response.status).toBe(401);

    expect(response.body).toHaveProperty(
      "success",
      false
    );
  });

  it("should reject unauthenticated organization creation", async () => {
    const response = await request(app)
      .post("/api/v1/organizations")
      .send({
        name: "Test Organization",
        description: "Test organization",
      });

    expect(response.status).toBe(401);

    expect(response.body).toHaveProperty(
      "success",
      false
    );
  });

  it("reads and updates only the JWT organization profile fields", async () => {
    const before = await Organization.findById(organizationId);
    expect(before).not.toBeNull();

    const response = await request(app)
      .put(`/api/v1/organizations/${organizationId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        description: "Phase 13A profile validation",
        organizationId: "507f1f77bcf86cd799439011",
        unknown: "rejected",
      });

    expect(response.status).toBe(400);
    const after = await Organization.findById(organizationId);
    expect(after?.description).toBe(before?.description);
  });

  it("prevents deleting an organization that contains tenant data", async () => {
    const response = await request(app)
      .delete(`/api/v1/organizations/${organizationId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/tenant-owned data exists/i);
    expect(await Organization.exists({ _id: organizationId })).not.toBeNull();
  });
});