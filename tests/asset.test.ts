import request from "supertest";
import app from "../src/app";
import { connectDB } from "../src/config/db";
import Asset from "../src/modules/asset/asset.model";
import AssetMaintenance from "../src/modules/asset/assetMaintenance.model";
import AssetLifecycle from "../src/modules/asset/assetLifecycle.model";
import AuthUser from "../src/modules/auth/auth.model";
import Organization from "../src/modules/organization/organization.model";
import {
  createTestUser,
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
  TEST_EMPLOYEE_EMAIL,
  TEST_EMPLOYEE_PASSWORD,
} from "./test-fixtures";

describe("Asset API", () => {
  let adminToken: string;
  let employeeToken: string;
  let employeeId: string;
  let organizationId: string;
  let otherOrganizationId: string;
  let otherAdminId: string;
  let otherAdminEmail: string;
  const assetIds: string[] = [];

  beforeAll(async () => {
    await connectDB();

    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: TEST_ADMIN_EMAIL,
        password: TEST_ADMIN_PASSWORD,
      });
    adminToken = adminLogin.body.data.token;
    organizationId = adminLogin.body.data.user.organizationId;

    const employeeLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: TEST_EMPLOYEE_EMAIL,
        password: TEST_EMPLOYEE_PASSWORD,
      });
    employeeToken = employeeLogin.body.data.token;
      employeeId = employeeLogin.body.data.user.id;

    const otherOrganization = await Organization.create({
      name: `Other Asset Organization ${Date.now()}`,
      slug: `other-asset-${Date.now()}`,
      isActive: true,
    });
    otherOrganizationId = otherOrganization._id.toString();

    otherAdminEmail = `other.asset.admin.${Date.now()}@example.com`;
    const otherAdmin = await createTestUser({
      name: "Other Asset Admin",
      email: otherAdminEmail,
      password: "OtherAssetAdmin123!",
      role: "admin",
      organizationId: otherOrganizationId,
    });
    otherAdminId = otherAdmin._id.toString();
  });

  afterAll(async () => {
    if (assetIds.length) {
      await AssetMaintenance.deleteMany({ assetId: { $in: assetIds } });
      await AssetLifecycle.deleteMany({ assetId: { $in: assetIds } });
      await Asset.deleteMany({ _id: { $in: assetIds } });
    }
    if (otherAdminId) {
      await AuthUser.deleteOne({ _id: otherAdminId });
    }
    if (otherOrganizationId) {
      await Organization.deleteOne({ _id: otherOrganizationId });
    }
  });
  it("should reject unauthenticated requests when getting assets", async () => {
    const response = await request(app)
      .get("/api/v1/assets");

    expect(response.status).toBe(401);

    expect(response.body).toHaveProperty(
      "success",
      false
    );
  });

  it("should reject unauthenticated asset creation", async () => {
    const response = await request(app)
      .post("/api/v1/assets")
      .send({
        assetId: "TEST-001",
        name: "Test Laptop",
      });

    expect(response.status).toBe(401);

    expect(response.body).toHaveProperty(
      "success",
      false
    );
  });

  it("should save and report active and expired warranty status", async () => {
    const createResponse = await request(app)
      .post("/api/v1/assets")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        assetId: `AST-WARRANTY-${Date.now()}`,
        name: "Warranty Laptop",
        category: "Laptop",
        warrantyProvider: "Example Vendor",
        warrantyStartDate: new Date(Date.now() - 86400000).toISOString(),
        warrantyEndDate: new Date(Date.now() + 86400000).toISOString(),
      });

    expect(createResponse.status).toBe(201);
    const assetId = createResponse.body.data._id;
    assetIds.push(assetId);
    expect(createResponse.body.data.warrantyProvider).toBe("Example Vendor");

    const activeResponse = await request(app)
      .get(`/api/v1/assets/${assetId}`)
      .set("Authorization", `Bearer ${employeeToken}`);
    expect(activeResponse.status).toBe(200);
    expect(activeResponse.body.data.warrantyStatus).toBe("Active");

    await request(app)
      .put(`/api/v1/assets/${assetId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ warrantyEndDate: new Date(Date.now() - 86400000).toISOString() });

    const expiredResponse = await request(app)
      .get(`/api/v1/assets/${assetId}`)
      .set("Authorization", `Bearer ${employeeToken}`);
    expect(expiredResponse.body.data.warrantyStatus).toBe("Expired");
  });

  it("should reject unsupported asset categories", async () => {
    const response = await request(app)
      .post("/api/v1/assets")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        assetId: `AST-INVALID-CATEGORY-${Date.now()}`,
        name: "Unsupported Asset",
        category: "Tablet",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("should accept every required asset category", async () => {
    const categories = [
      "Laptop",
      "Desktop",
      "Server",
      "Switch",
      "Router",
      "License",
      "Mobile Device",
    ];

    for (const category of categories) {
      const response = await request(app)
        .post("/api/v1/assets")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          assetId: `AST-${category.replace(/ /g, "-")}-${Date.now()}`,
          name: `${category} asset`,
          category,
        });

      expect(response.status).toBe(201);
      assetIds.push(response.body.data._id);
    }
  });

  it("should create and read tenant-scoped maintenance history", async () => {
    const assetResponse = await request(app)
      .post("/api/v1/assets")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        assetId: `AST-MAINTENANCE-${Date.now()}`,
        name: "Maintenance Server",
        category: "Server",
      });
    const assetId = assetResponse.body.data._id;
    assetIds.push(assetId);

    const createResponse = await request(app)
      .post(`/api/v1/assets/${assetId}/maintenance`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        date: "2026-09-03T10:00:00.000Z",
        type: "Preventive",
        description: "Quarterly hardware inspection",
        cost: 125,
        status: "Completed",
      });
    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.description).toBe(
      "Quarterly hardware inspection"
    );

    const historyResponse = await request(app)
      .get(`/api/v1/assets/${assetId}/maintenance`)
      .set("Authorization", `Bearer ${employeeToken}`);
    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body.data).toHaveLength(1);
    expect(historyResponse.body.data[0].cost).toBe(125);
  });

  it("should reject maintenance history from another tenant", async () => {
    const otherAdminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: otherAdminEmail,
        password: "OtherAssetAdmin123!",
      });

    const otherAdmin = await AuthUser.findById(otherAdminId);
    expect(otherAdmin).toBeDefined();
    const otherToken = otherAdminLogin.body.data?.token;

    const assetResponse = await request(app)
      .post("/api/v1/assets")
      .set("Authorization", `Bearer ${otherToken}`)
      .send({
        assetId: `AST-OTHER-${Date.now()}`,
        name: "Other Tenant Asset",
        category: "Desktop",
      });
    expect(assetResponse.status).toBe(201);
    const otherAssetId = assetResponse.body.data._id;
    assetIds.push(otherAssetId);

    const response = await request(app)
      .get(`/api/v1/assets/${otherAssetId}/maintenance`)
      .set("Authorization", `Bearer ${employeeToken}`);
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);

    const lifecycleResponse = await request(app)
      .get(`/api/v1/assets/${otherAssetId}/lifecycle`)
      .set("Authorization", `Bearer ${employeeToken}`);
    expect(lifecycleResponse.status).toBe(404);
  });

  it("should record lifecycle and assignment transitions for the tenant", async () => {
    const assetResponse = await request(app)
      .post("/api/v1/assets")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        assetId: `AST-HISTORY-${Date.now()}`,
        name: "History Laptop",
        category: "Laptop",
      });
    const assetId = assetResponse.body.data._id;
    assetIds.push(assetId);

    const maintenanceResponse = await request(app)
      .put(`/api/v1/assets/${assetId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "Maintenance" });
    expect(maintenanceResponse.status).toBe(200);

    const availableResponse = await request(app)
      .put(`/api/v1/assets/${assetId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "Available" });
    expect(availableResponse.status).toBe(200);

    const assignResponse = await request(app)
      .post(`/api/v1/assets/${assetId}/assign`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ employeeId });
    expect(assignResponse.status).toBe(200);

    const unassignResponse = await request(app)
      .post(`/api/v1/assets/${assetId}/unassign`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(unassignResponse.status).toBe(200);

    const historyResponse = await request(app)
      .get(`/api/v1/assets/${assetId}/lifecycle`)
      .set("Authorization", `Bearer ${employeeToken}`);
    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body.data).toHaveLength(4);
    expect(historyResponse.body.data.map((entry: any) => entry.newStatus)).toEqual([
      "Available",
      "Assigned",
      "Available",
      "Maintenance",
    ]);
    expect(historyResponse.body.data.every((entry: any) => entry.organizationId)).toBe(true);
  });

  it("should enforce valid lifecycle transitions", async () => {
    const createResponse = await request(app)
      .post("/api/v1/assets")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        assetId: `AST-LIFECYCLE-${Date.now()}`,
        name: "Lifecycle Laptop",
        category: "Laptop",
      });
    const assetId = createResponse.body.data._id;
    assetIds.push(assetId);

    const maintenanceResponse = await request(app)
      .put(`/api/v1/assets/${assetId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "Maintenance" });
    expect(maintenanceResponse.status).toBe(200);

    const availableResponse = await request(app)
      .put(`/api/v1/assets/${assetId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "Available" });
    expect(availableResponse.status).toBe(200);

    const assignedResponse = await request(app)
      .post(`/api/v1/assets/${assetId}/assign`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ employeeId });
    expect(assignedResponse.status).toBe(200);

    const invalidMaintenanceResponse = await request(app)
      .put(`/api/v1/assets/${assetId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "Maintenance" });
    expect(invalidMaintenanceResponse.status).toBe(400);

    const unassignResponse = await request(app)
      .post(`/api/v1/assets/${assetId}/unassign`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(unassignResponse.status).toBe(200);

    const retireResponse = await request(app)
      .put(`/api/v1/assets/${assetId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "Retired" });
    expect(retireResponse.status).toBe(200);

    const invalidAvailableResponse = await request(app)
      .put(`/api/v1/assets/${assetId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "Available" });
    expect(invalidAvailableResponse.status).toBe(400);
  });
});