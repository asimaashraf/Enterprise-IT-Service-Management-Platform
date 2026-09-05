
import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app";
import Organization from "../src/modules/organization/organization.model";
import AuthUser from "../src/modules/auth/auth.model";
import Incident from "../src/modules/incident/incident.model";
import Asset from "../src/modules/asset/asset.model";
import Change from "../src/modules/change/change.model";
import SLA from "../src/modules/sla/sla.model";
import AssetMaintenance from "../src/modules/asset/assetMaintenance.model";
import AssetLifecycle from "../src/modules/asset/assetLifecycle.model";
import { connectDB } from "../src/config/db";

describe("Analytics Module", () => {
  let token: string;
  let organizationId: string;
  let secondToken: string;
  let secondOrganizationId: string;
  let firstUserId: string;
  let secondUserId: string;

  const createAnalyticsFixtures = async (
    orgId: string,
    userId: string,
    incidentCount: number
  ) => {
    const now = new Date();
    const suffix = `${Date.now()}-${orgId.slice(-4)}`;
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const twelveDaysAgo = new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000);

    await Promise.all([
      Incident.deleteMany({ organizationId: orgId }),
      Asset.deleteMany({ organizationId: orgId }),
      Change.deleteMany({ organizationId: orgId }),
      SLA.deleteMany({ organizationId: orgId }),
      AssetMaintenance.deleteMany({ organizationId: orgId }),
      AssetLifecycle.deleteMany({ organizationId: orgId }),
    ]);

    for (let index = 0; index < incidentCount; index += 1) {
      const status = index % 2 === 0 ? "Resolved" : "In Progress";

      await Incident.create({
        incidentId: `INC-${suffix}-${index + 1}`,
        title: `Incident ${index + 1}`,
        description: `Incident ${index + 1} in tenant ${orgId}`,
        priority: index % 2 === 0 ? "High" : "Critical",
        severity: index % 2 === 0 ? "Major" : "Critical",
        status,
        reportedBy: userId,
        assignedTo: userId,
        organizationId: orgId,
        resolvedAt: status === "Resolved" ? now : undefined,
        createdAt: status === "Resolved" ? twelveDaysAgo : twoDaysAgo,
      });
    }

    const asset = await Asset.create({
      assetId: `ASSET-${suffix}-1`,
      name: "Laptop A",
      category: "Laptop",
      status: "Assigned",
      warrantyEndDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      organizationId: orgId,
    });

    await Asset.create({
      assetId: `ASSET-${suffix}-2`,
      name: "Laptop B",
      category: "Laptop",
      status: "Maintenance",
      organizationId: orgId,
    });

    await Asset.create({
      assetId: `ASSET-${suffix}-3`,
      name: "Retired Server",
      category: "Server",
      status: "Retired",
      organizationId: orgId,
    });

    await AssetMaintenance.create({
      assetId: asset._id,
      organizationId: orgId,
      date: now,
      type: "Preventive",
      description: "Quarterly maintenance",
      status: "Completed",
      createdBy: userId,
    });

    await AssetLifecycle.create({
      assetId: asset._id,
      organizationId: orgId,
      previousStatus: "Available",
      newStatus: "Retired",
      changedAt: now,
      changedBy: userId,
    });

    const changeCount = incidentCount >= 2 ? 2 : 1;

    for (let index = 0; index < changeCount; index += 1) {
      await Change.create({
        changeId: `CHG-${orgId.slice(-4)}-${index + 1}`,
        title: `Change ${index + 1}`,
        description: `Change ${index + 1} in tenant ${orgId}`,
        type: index % 2 === 0 ? "Normal" : "Emergency",
        risk: index % 2 === 0 ? "Medium" : "High",
        status: index % 2 === 0 ? "Completed" : "Failed",
        requestedBy: userId,
        assignedTo: userId,
        organizationId: orgId,
        completedAt: index % 2 === 0 ? now : undefined,
        failureReason: index % 2 === 0 ? undefined : "Integration issue",
      });
    }

    const slaIncident = await Incident.create({
      incidentId: `SLA-${suffix}-1`,
      title: "SLA incident",
      description: "SLA fixture for analytics",
      priority: "High",
      severity: "Major",
      status: "Resolved",
      reportedBy: userId,
      assignedTo: userId,
      organizationId: orgId,
      resolvedAt: now,
      createdAt: twelveDaysAgo,
    });

    const breachIncident = await Incident.create({
      incidentId: `SLA-${suffix}-2`,
      title: "SLA breach incident",
      description: "Breach fixture for analytics",
      priority: "Low",
      severity: "Minor",
      status: "Closed",
      reportedBy: userId,
      assignedTo: userId,
      organizationId: orgId,
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      resolvedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      closedAt: now,
    });

    await SLA.create({
      incidentId: slaIncident._id,
      organizationId: orgId,
      priority: "High",
      responseTimeMinutes: 60,
      resolutionTimeMinutes: 240,
      responseDueAt: new Date(now.getTime() - 60 * 60 * 1000),
      resolutionDueAt: new Date(now.getTime() + 60 * 60 * 1000),
      status: "Completed",
      responseBreached: false,
      resolutionBreached: false,
      businessHours: {
        timezone: "UTC",
        startHour: 9,
        startMinute: 0,
        endHour: 17,
        endMinute: 0,
        workingDays: [1, 2, 3, 4, 5],
      },
    });

    await SLA.create({
      incidentId: breachIncident._id,
      organizationId: orgId,
      priority: "Low",
      responseTimeMinutes: 30,
      resolutionTimeMinutes: 120,
      responseDueAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      resolutionDueAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      status: "Active",
      responseBreached: true,
      resolutionBreached: false,
      businessHours: {
        timezone: "UTC",
        startHour: 9,
        startMinute: 0,
        endHour: 17,
        endMinute: 0,
        workingDays: [1, 2, 3, 4, 5],
      },
    });
  };

  // ==========================================
  // TEST SETUP
  // ==========================================

  beforeAll(async () => {
    const timestamp = Date.now();

    // Make sure MongoDB is connected before using models
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }

    // Wait until MongoDB connection is actually ready
    if (mongoose.connection.readyState !== 1) {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(
            new Error(
              "MongoDB connection timeout during analytics test setup"
            )
          );
        }, 30000);

        mongoose.connection.once("connected", () => {
          clearTimeout(timeout);
          resolve();
        });

        mongoose.connection.once("error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    }

    expect(mongoose.connection.readyState).toBe(1);

    // ========================================
    // CREATE TEST ORGANIZATION
    // ========================================

    const organization = await Organization.create({
      name: `Analytics Test Organization ${timestamp}`,
      slug: `analytics-test-${timestamp}`,
      description: "Organization used for analytics tests",
    });

    organizationId = organization._id.toString();

    expect(organizationId).toBeDefined();

    // ========================================
    // REGISTER ADMIN
    // ========================================

    const email = `analytics-${timestamp}@test.com`;
    const password = "password123";

    const registerResponse = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Analytics Test Admin",
        email,
        password,
        role: "admin",
        organizationId,
      })
      .timeout(30000);

    console.log(
      "ANALYTICS REGISTER STATUS:",
      registerResponse.status
    );

    console.log(
      "ANALYTICS REGISTER RESPONSE:",
      registerResponse.body
    );

    expect(registerResponse.status).toBeLessThan(300);

    // ========================================
    // LOGIN ADMIN
    // ========================================

    const loginResponse = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email,
        password,
      })
      .timeout(30000);

    console.log(
      "ANALYTICS LOGIN STATUS:",
      loginResponse.status
    );

    console.log(
      "ANALYTICS LOGIN RESPONSE:",
      loginResponse.body
    );

    expect(loginResponse.status).toBe(200);

    token =
      loginResponse.body.token ||
      loginResponse.body.data?.token;

    expect(token).toBeDefined();

    const currentUser = await AuthUser.findOne({
      email: email,
    });

    firstUserId = currentUser!._id.toString();

    const secondOrganization = await Organization.create({
      name: `Analytics Isolation Org ${timestamp + 1}`,
      slug: `analytics-isolation-${timestamp + 1}`,
      description: "Secondary org for tenant isolation tests",
    });

    secondOrganizationId = secondOrganization._id.toString();

    const secondEmail = `analytics-isolated-${timestamp + 1}@test.com`;
    const secondRegisterResponse = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Analytics Secondary Admin",
        email: secondEmail,
        password,
        role: "admin",
        organizationId: secondOrganizationId,
      })
      .timeout(30000);

    expect(secondRegisterResponse.status).toBeLessThan(300);

    const secondLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: secondEmail,
        password,
      })
      .timeout(30000);

    expect(secondLogin.status).toBe(200);
    secondToken = secondLogin.body.token || secondLogin.body.data?.token;
    expect(secondToken).toBeDefined();

    const isolatedUser = await AuthUser.findOne({
      email: secondEmail,
    });

    secondUserId = isolatedUser!._id.toString();

    await createAnalyticsFixtures(organizationId, firstUserId, 3);
    await createAnalyticsFixtures(secondOrganizationId, secondUserId, 1);
  }, 60000);

  // ==========================================
  // TEST CLEANUP
  // ==========================================

  afterAll(async () => {
    try {
      if (
        organizationId &&
        mongoose.connection.readyState === 1
      ) {
        await Organization.findByIdAndDelete(
          organizationId
        );
      }
    } catch (error) {
      console.error(
        "Analytics cleanup error:",
        error
      );
    }
  });

  // ==========================================
  // TECHNICIAN PERFORMANCE
  // ==========================================

  it("should return all six analytics metrics for the current tenant", async () => {
    const incidentTrends = await request(app)
      .get("/api/v1/analytics/incident-trends")
      .set("Authorization", `Bearer ${token}`)
      .timeout(30000);

    expect(incidentTrends.status).toBe(200);
    expect(incidentTrends.body.data.totalIncidents).toBeGreaterThan(0);
    expect(incidentTrends.body.data.byStatus).toBeDefined();
    expect(incidentTrends.body.data.trend).toHaveLength(30);

    const slaCompliance = await request(app)
      .get("/api/v1/analytics/sla-compliance")
      .set("Authorization", `Bearer ${token}`)
      .timeout(30000);

    expect(slaCompliance.status).toBe(200);
    expect(slaCompliance.body.data.totalSLAs).toBeGreaterThan(0);
    expect(slaCompliance.body.data.complianceRate).toBeGreaterThanOrEqual(0);

    const resolutionTime = await request(app)
      .get("/api/v1/analytics/resolution-time")
      .set("Authorization", `Bearer ${token}`)
      .timeout(30000);

    expect(resolutionTime.status).toBe(200);
    expect(resolutionTime.body.data.totalResolvedIncidents).toBeGreaterThanOrEqual(0);
    expect(resolutionTime.body.data.averageResolutionHours).not.toBeUndefined();

    const technicianPerformance = await request(app)
      .get("/api/v1/analytics/technician-performance")
      .set("Authorization", `Bearer ${token}`)
      .timeout(30000);

    expect(technicianPerformance.status).toBe(200);
    expect(Array.isArray(technicianPerformance.body.data)).toBe(true);
    expect(technicianPerformance.body.data[0]).toHaveProperty("resolutionRate");

    const assetHealth = await request(app)
      .get("/api/v1/analytics/asset-health")
      .set("Authorization", `Bearer ${token}`)
      .timeout(30000);

    expect(assetHealth.status).toBe(200);
    expect(assetHealth.body.data.totalAssets).toBeGreaterThan(0);
    expect(assetHealth.body.data.warrantyAlerts).toBeGreaterThanOrEqual(0);
    expect(assetHealth.body.data.maintenanceAlerts).toBeGreaterThanOrEqual(0);
    expect(assetHealth.body.data.lifecycleAlerts).toBeGreaterThanOrEqual(0);

    const changeSuccessRate = await request(app)
      .get("/api/v1/analytics/change-success-rate")
      .set("Authorization", `Bearer ${token}`)
      .timeout(30000);

    expect(changeSuccessRate.status).toBe(200);
    expect(changeSuccessRate.body.data.totalChanges).toBeGreaterThan(0);
    expect(changeSuccessRate.body.data.successRate).toBeGreaterThanOrEqual(0);
  }, 40000);

  it("should isolate analytics results to the current tenant", async () => {
    const incidentTrends = await request(app)
      .get("/api/v1/analytics/incident-trends")
      .set("Authorization", `Bearer ${token}`)
      .timeout(30000);

    expect(incidentTrends.body.data.totalIncidents).toBeLessThanOrEqual(5);
    expect(incidentTrends.body.data.totalIncidents).toBeGreaterThan(0);

    const slaCompliance = await request(app)
      .get("/api/v1/analytics/sla-compliance")
      .set("Authorization", `Bearer ${token}`)
      .timeout(30000);

    expect(slaCompliance.body.data.totalSLAs).toBeLessThanOrEqual(2);

    const assetHealth = await request(app)
      .get("/api/v1/analytics/asset-health")
      .set("Authorization", `Bearer ${token}`)
      .timeout(30000);

    expect(assetHealth.body.data.totalAssets).toBeLessThanOrEqual(3);

    const changeSuccessRate = await request(app)
      .get("/api/v1/analytics/change-success-rate")
      .set("Authorization", `Bearer ${token}`)
      .timeout(30000);

    expect(changeSuccessRate.body.data.totalChanges).toBeLessThanOrEqual(2);

    const secondOrgIncidentTrends = await request(app)
      .get("/api/v1/analytics/incident-trends")
      .set("Authorization", `Bearer ${secondToken}`)
      .timeout(30000);

    expect(secondOrgIncidentTrends.body.data.totalIncidents).toBeGreaterThan(0);
    expect(secondOrgIncidentTrends.body.data.totalIncidents).not.toEqual(
      incidentTrends.body.data.totalIncidents
    );
  }, 40000);

  it(
    "should return technician performance analytics",
    async () => {
      const response = await request(app)
        .get(
          "/api/v1/analytics/technician-performance"
        )
        .set(
          "Authorization",
          `Bearer ${token}`
        )
        .timeout(30000);

      console.log(
        "TECHNICIAN PERFORMANCE STATUS:",
        response.status
      );

      console.log(
        "TECHNICIAN PERFORMANCE RESPONSE:",
        response.body
      );

      expect(response.status).toBe(200);

      expect(response.body).toHaveProperty(
        "success",
        true
      );

      expect(
        Array.isArray(response.body.data)
      ).toBe(true);
    },
    40000
  );

  // ==========================================
  // ASSET HEALTH
  // ==========================================

  it(
    "should return asset health analytics",
    async () => {
      const response = await request(app)
        .get(
          "/api/v1/analytics/asset-health"
        )
        .set(
          "Authorization",
          `Bearer ${token}`
        )
        .timeout(30000);

      console.log(
        "ASSET HEALTH STATUS:",
        response.status
      );

      console.log(
        "ASSET HEALTH RESPONSE:",
        response.body
      );

      expect(response.status).toBe(200);

      expect(response.body).toHaveProperty(
        "success",
        true
      );

      expect(response.body.data).toHaveProperty(
        "totalAssets"
      );

      expect(response.body.data).toHaveProperty(
        "available"
      );

      expect(response.body.data).toHaveProperty(
        "assigned"
      );

      expect(response.body.data).toHaveProperty(
        "maintenance"
      );

      expect(response.body.data).toHaveProperty(
        "retired"
      );

      expect(response.body.data).toHaveProperty(
        "healthRate"
      );

      expect(response.body.data).toHaveProperty(
        "maintenanceRate"
      );

      expect(response.body.data).toHaveProperty(
        "retiredRate"
      );
    },
    40000
  );

  // ==========================================
  // CHANGE SUCCESS RATE
  // ==========================================

  it(
    "should return change success rate analytics",
    async () => {
      const response = await request(app)
        .get(
          "/api/v1/analytics/change-success-rate"
        )
        .set(
          "Authorization",
          `Bearer ${token}`
        )
        .timeout(30000);

      console.log(
        "CHANGE SUCCESS RATE STATUS:",
        response.status
      );

      console.log(
        "CHANGE SUCCESS RATE RESPONSE:",
        response.body
      );

      expect(response.status).toBe(200);

      expect(response.body).toHaveProperty(
        "success",
        true
      );

      expect(response.body.data).toHaveProperty(
        "totalChanges"
      );

      expect(response.body.data).toHaveProperty(
        "completed"
      );

      expect(response.body.data).toHaveProperty(
        "failed"
      );

      expect(response.body.data).toHaveProperty(
        "cancelled"
      );

      expect(response.body.data).toHaveProperty(
        "successfulChanges"
      );

      expect(response.body.data).toHaveProperty(
        "unsuccessfulChanges"
      );

      expect(response.body.data).toHaveProperty(
        "evaluatedChanges"
      );

      expect(response.body.data).toHaveProperty(
        "unevaluatedChanges"
      );

      expect(response.body.data).toHaveProperty(
        "successRate"
      );

      expect(response.body.data).toHaveProperty(
        "failureRate"
      );
    },
    40000
  );

  // ==========================================
  // AUTHENTICATION
  // ==========================================

  it(
    "should reject unauthenticated analytics requests",
    async () => {
      const response = await request(app)
        .get(
          "/api/v1/analytics/asset-health"
        )
        .timeout(30000);

      expect(response.status).toBe(401);
    },
    40000
  );
});
