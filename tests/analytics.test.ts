import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app";
import Organization from "../src/modules/organization/organization.model";
import AuthUser from "../src/modules/auth/auth.model";
import Incident from "../src/modules/incident/incident.model";
import SLA from "../src/modules/sla/sla.model";
import Asset from "../src/modules/asset/asset.model";
import Maintenance from "../src/modules/asset/assetMaintenance.model";
import Lifecycle from "../src/modules/asset/assetLifecycle.model";
import SupportTeam from "../src/modules/support-team/supportTeam.model";
import Change from "../src/modules/change/change.model";
import { createTestUser } from "./test-fixtures";
import { getAssetHealth } from "../src/modules/analytics/analytics.service";
import {
  DAY,
  parseAnalyticsDateRange,
} from "../src/modules/analytics/analytics.validation";

describe("Analytics backend contracts", () => {
  const endpoints = [
    "incident-trends",
    "sla-compliance",
    "resolution-time",
    "technician-performance",
    "asset-health",
    "change-success-rate",
  ];
  const org = new mongoose.Types.ObjectId();
  const foreign = new mongoose.Types.ObjectId();
  const period = "?startDate=2026-01-01&endDate=2026-01-02";
  const models = [Incident, SLA, Asset, Maintenance, Lifecycle, Change];
  const date = (value: string) => new Date(value);
  let admin: mongoose.Types.ObjectId;
  let employee: mongoose.Types.ObjectId;
  let inactive: mongoose.Types.ObjectId;
  let foreignAdmin: mongoose.Types.ObjectId;
  let token: string;
  let employeeToken: string;
  let foreignToken: string;
  const get = (endpoint: string, query = "", bearer = token) =>
    request(app)
      .get(`/api/v1/analytics/${endpoint}${query}`)
      .set("Authorization", `Bearer ${bearer}`);
  // Raw fixtures deliberately preserve historical/malformed timestamps for reporting tests.
  // Normal fixture assignments use the active ADMIN; employee assignments only model legacy data.
  const incident = (extra: Record<string, unknown> = {}) => ({
    _id: new mongoose.Types.ObjectId(),
    organizationId: org,
    assignedTo: admin,
    incidentId: new mongoose.Types.ObjectId().toString(),
    title: "Analytics fixture",
    description: "Reporting regression",
    reportedBy: employee,
    status: "Open",
    priority: "High",
    severity: "Major",
    createdAt: date("2026-01-01T00:00:00Z"),
    ...extra,
  });

  beforeAll(async () => {
    await Organization.create([
      {
        _id: org,
        name: `Analytics regression ${org}`,
        slug: `analytics-${org}`,
      },
      {
        _id: foreign,
        name: `Analytics foreign ${foreign}`,
        slug: `analytics-${foreign}`,
      },
    ]);
    const makeUser = async (role: "admin" | "employee", tenant = org) => {
      const user = await createTestUser({
        name: `Analytics ${role}`,
        email: `${new mongoose.Types.ObjectId()}@analytics.test`,
        password: "AnalyticsTest123!",
        role,
        organizationId: tenant.toString(),
      });
      const login = await request(app).post("/api/v1/auth/login").send({
        email: user.email,
        password: "AnalyticsTest123!",
      });
      expect(login.status).toBe(200);
      return {
        id: user._id as mongoose.Types.ObjectId,
        token: login.body.data?.token ?? login.body.token,
      };
    };
    const a = await makeUser("admin");
    admin = a.id;
    token = a.token;
    const e = await makeUser("employee");
    employee = e.id;
    employeeToken = e.token;
    const f = await makeUser("admin", foreign);
    foreignAdmin = f.id;
    foreignToken = f.token;
    const i = await makeUser("admin");
    inactive = i.id;
    await AuthUser.updateOne({ _id: inactive }, { isActive: false });
    await SupportTeam.create([
      {
        name: "Analytics operational team",
        organizationId: org,
        members: [admin],
        isActive: true,
      },
      {
        name: "Analytics operational team",
        organizationId: foreign,
        members: [foreignAdmin],
        isActive: true,
      },
    ]);
  }, 30000);

  beforeEach(async () => {
    for (const model of models)
      await model.collection.deleteMany({
        organizationId: { $in: [org, foreign] },
      });
  });
  afterAll(async () => {
    for (const model of models)
      await model.collection.deleteMany({
        organizationId: { $in: [org, foreign] },
      });
    await SupportTeam.deleteMany({ organizationId: { $in: [org, foreign] } });
    await AuthUser.deleteMany({ organizationId: { $in: [org, foreign] } });
    await Organization.deleteMany({ _id: { $in: [org, foreign] } });
  });

  describe.each(endpoints)("%s access and validation", (endpoint) => {
    it("allows both verified roles and rejects unauthenticated access", async () => {
      for (const bearer of [token, employeeToken]) {
        const result = await get(endpoint, "", bearer);
        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
      }
      expect(
        (await request(app).get(`/api/v1/analytics/${endpoint}`)).status,
      ).toBe(401);
    });
    it.each([
      "?startDate=2026-02-30&endDate=2026-03-01",
      "?startDate=2026-01-03&endDate=2026-01-02",
      "?startDate=2026-01-01&startDate=2026-01-01&endDate=2026-01-02",
      "?startDate=2026-01-01&endDate=2026-01-02&endDate=2026-01-03",
      "?startDate[]=2026-01-01&endDate=2026-01-02",
      "?startDate=null&endDate=2026-01-02",
      "?startDate=&endDate=2026-01-02",
      "?startDate=2026-01-01T00:00:00Z&endDate=2026-01-02",
      "?startDate=2026-01-01&endDate=2026-02-30",
      "?endDate=2026-01-01",
      "?startDate=2026-01-01",
      "?startDate=2020-01-01&endDate=2026-01-02",
    ])("returns clean 400 for %s", async (query) => {
      const result = await get(endpoint, query);
      expect(result.status).toBe(400);
      expect(result.body).toEqual({
        success: false,
        message: expect.any(String),
      });
    });
    it("isolates the tenant and ignores organization query spoofing", async () => {
      await Incident.collection.insertOne(
        incident({
          organizationId: foreign,
          assignedTo: foreignAdmin,
          createdAt: new Date(),
          status: "Resolved",
          resolvedAt: date("2026-01-01T01:00:00Z"),
        }),
      );
      await SLA.collection.insertOne({
        organizationId: foreign,
        incidentId: new mongoose.Types.ObjectId(),
        status: "Completed",
        priority: "High",
        responseBreached: true,
        resolutionBreached: true,
      });
      await Asset.collection.insertOne({
        organizationId: foreign,
        status: "Retired",
      });
      await Change.collection.insertOne({
        organizationId: foreign,
        status: "Completed",
      });
      const own = await get(endpoint);
      const spoof = await get(endpoint, `?organizationId=${foreign}`);
      expect(spoof.body).toEqual(own.body);
      const other = await get(endpoint, "", foreignToken);
      expect(other.status).toBe(200);
      expect(other.body.data).not.toEqual(own.body.data);
    });
  });

  it("matches UTC incident totals to every selected bucket, including exact boundaries", async () => {
    for (const createdAt of [
      "2025-12-31T23:59:59.999Z",
      "2026-01-01T00:00:00Z",
      "2026-01-02T23:59:59.999Z",
      "2026-01-03T00:00:00Z",
    ]) {
      await Incident.collection.insertOne(
        incident({ createdAt: date(createdAt) }),
      );
    }
    const { body } = await get("incident-trends", period);
    expect(body.data.totalIncidents).toBe(2);
    expect(body.data.trend).toEqual([
      { date: "2026-01-01", count: 1 },
      { date: "2026-01-02", count: 1 },
    ]);
    expect(body.data.byPriority).toEqual({ High: 2 });
  });

  it("defaults both incident totals and buckets to the same 30 UTC days", async () => {
    await Incident.collection.insertMany([
      incident({ createdAt: new Date() }),
      incident({ createdAt: new Date(Date.now() - 40 * DAY) }),
    ]);
    const { body } = await get("incident-trends");
    expect(body.data.totalIncidents).toBe(1);
    expect(body.data.trend).toHaveLength(30);
    expect(
      body.data.trend.reduce(
        (sum: number, item: { count: number }) => sum + item.count,
        0,
      ),
    ).toBe(1);
  });

  it("counts each breached SLA once and filters the creation cohort", async () => {
    for (const [responseBreached, resolutionBreached] of [
      [true, true],
      [true, false],
      [false, false],
      [false, false],
    ]) {
      await SLA.collection.insertOne({
        organizationId: org,
        incidentId: new mongoose.Types.ObjectId(),
        status: responseBreached ? "Resolution Breached" : "Completed",
        priority: "High",
        responseBreached,
        resolutionBreached,
        createdAt: date("2026-01-02T23:59:59.999Z"),
      });
    }
    await SLA.collection.insertOne({
      organizationId: org,
      incidentId: new mongoose.Types.ObjectId(),
      status: "Active",
      createdAt: date("2026-01-03T00:00:00Z"),
    });
    expect((await get("sla-compliance", period)).body.data).toMatchObject({
      totalSLAs: 4,
      responseBreached: 2,
      resolutionBreached: 1,
      totalBreached: 2,
      compliant: 2,
      complianceRate: 50,
    });
  });

  it.each([
    { hours: [1, 3], median: 2, mean: 2 },
    { hours: [1, 3, 8], median: 3, mean: 4 },
    { hours: [] as number[], median: null, mean: null },
  ])(
    "calculates exact median $median for $hours",
    async ({ hours, median, mean }) => {
      for (const h of hours)
        await Incident.collection.insertOne(
          incident({
            status: "Resolved",
            resolvedAt: new Date(
              date("2026-01-01T00:00:00Z").getTime() + h * 3600000,
            ),
          }),
        );
      const { body } = await get("resolution-time");
      expect(body.data.medianResolutionHours).toBe(median);
      expect(body.data.averageResolutionHours).toBe(mean);
    },
  );

  it("excludes unusable durations and filters by resolvedAt with closedAt fallback", async () => {
    for (const resolvedAt of [
      undefined,
      null,
      "invalid",
      date("2025-12-31"),
      date("2026-01-01"),
    ]) {
      await Incident.collection.insertOne(
        incident({ status: "Resolved", resolvedAt }),
      );
    }
    await Incident.collection.insertOne(
      incident({ status: "Closed", closedAt: date("2026-01-02T00:00:00Z") }),
    );
    await Incident.collection.insertOne(
      incident({
        status: "Closed",
        resolvedAt: date("2026-01-03T00:00:00Z"),
        closedAt: date("2026-01-02T00:00:00Z"),
      }),
    );
    const result = (await get("resolution-time", period)).body.data;
    expect(result.totalResolvedIncidents).toBe(2);
    expect(result.averageResolutionHours).toBe(24);
    expect(result.medianResolutionHours).toBe(24);
    await Incident.collection.deleteMany({
      organizationId: org,
      status: "Closed",
    });
    expect(
      (await get("resolution-time")).body.data.averageResolutionHours,
    ).toBeNull();
  });

  it("reports only active local ADMINs and filters current assignments by creation date", async () => {
    for (const assignedTo of [admin, employee, inactive, foreignAdmin]) {
      await Incident.collection.insertOne(
        incident({
          assignedTo,
          status: "Resolved",
          resolvedAt: date("2026-01-01T02:00:00Z"),
        }),
      );
    }
    await Incident.collection.insertOne(
      incident({ createdAt: date("2026-01-03T00:00:00Z") }),
    );
    const rows = (await get("technician-performance", period)).body.data;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      technicianId: admin.toString(),
      totalAssigned: 1,
      totalResolvedOrClosed: 1,
      resolutionRate: 100,
      averageResolutionTimeHours: 2,
    });
  });

  it("handles every Change status and filters outcomes by their own timestamp", async () => {
    const statuses = [
      "Draft",
      "Pending Approval",
      "Approved",
      "Rejected",
      "Scheduled",
      "In Progress",
      "Completed",
      "Failed",
      "Cancelled",
    ];
    for (const status of statuses)
      await Change.collection.insertOne({
        organizationId: org,
        status,
        changeId: status,
        createdAt: date("2020-01-01"),
        completedAt: date("2026-01-01T00:00:00Z"),
        failedAt: date("2026-01-02T23:59:59.999Z"),
        cancelledAt: date("2026-01-03T00:00:00Z"),
      });
    expect((await get("change-success-rate")).body.data).toMatchObject({
      totalChanges: 9,
      evaluatedChanges: 3,
      unevaluatedChanges: 6,
      successRate: 33.33,
      failureRate: 66.67,
    });
    expect((await get("change-success-rate", period)).body.data).toMatchObject({
      totalChanges: 2,
      completed: 1,
      failed: 1,
      cancelled: 0,
      evaluatedChanges: 2,
      unevaluatedChanges: 0,
      successRate: 50,
      failureRate: 50,
    });
  });

  it("keeps asset inventory current while excluding future/cancelled/deleted/foreign history", async () => {
    const now = date("2026-01-10T12:00:00Z").getTime();
    const clock = jest.spyOn(Date, "now").mockReturnValue(now);
    try {
      const ids = Array.from(
        { length: 8 },
        () => new mongoose.Types.ObjectId(),
      );
      await Asset.collection.insertMany(
        ids.slice(0, 7).map((_id, index) => ({
          _id,
          assetId: _id.toString(),
          organizationId: org,
          status:
            index === 5 ? "Maintenance" : index === 6 ? "Retired" : "Available",
          warrantyEndDate: new Date(
            now + (index === 0 ? -DAY : 30 * DAY + index - 1),
          ),
        })),
      );
      for (const [index, time, status] of [
        [0, now - DAY, "Completed"],
        [1, now + DAY, "Scheduled"],
        [2, now - DAY, "Cancelled"],
        [7, now - DAY, "Completed"],
      ] as const) {
        await Maintenance.collection.insertOne({
          organizationId: org,
          assetId: ids[index],
          date: new Date(time),
          status,
        });
      }
      await Maintenance.collection.insertOne({
        organizationId: foreign,
        assetId: ids[3],
        date: new Date(now),
        status: "Completed",
      });
      for (const index of [0, 6, 7])
        await Lifecycle.collection.insertOne({
          organizationId: org,
          assetId: ids[index],
          previousStatus: "Available",
          newStatus: "Retired",
          changedAt: date("2026-01-02"),
        });
      const result = await getAssetHealth(org.toString());
      expect(result).toMatchObject({
        totalAssets: 7,
        warrantyAlerts: 2,
        maintenanceAlerts: 2,
        lifecycleAlerts: 1,
        healthyAssets: 5,
        healthRate: 71.43,
      });
      const filtered = await getAssetHealth(
        org.toString(),
        parseAnalyticsDateRange({
          startDate: "2026-01-01",
          endDate: "2026-01-02",
        }),
      );
      expect(filtered).toMatchObject({
        totalAssets: 7,
        warrantyAlerts: 2,
        maintenanceAlerts: 1,
        lifecycleAlerts: 1,
      });
      const outside = await getAssetHealth(
        org.toString(),
        parseAnalyticsDateRange({
          startDate: "2026-01-03",
          endDate: "2026-01-04",
        }),
      );
      expect(outside.lifecycleAlerts).toBe(0);
    } finally {
      clock.mockRestore();
    }
  });

  it("returns zero percentages and nullable durations for empty datasets", async () => {
    expect((await get("sla-compliance")).body.data).toMatchObject({
      totalSLAs: 0,
      complianceRate: 0,
    });
    expect((await get("resolution-time")).body.data).toMatchObject({
      totalResolvedIncidents: 0,
      averageResolutionHours: null,
      medianResolutionHours: null,
    });
    expect((await get("asset-health")).body.data).toMatchObject({
      totalAssets: 0,
      healthRate: 0,
      maintenanceAlerts: 0,
      lifecycleAlerts: 0,
    });
    expect((await get("change-success-rate")).body.data).toMatchObject({
      totalChanges: 0,
      successRate: 0,
      failureRate: 0,
    });
    expect((await get("technician-performance")).body.data[0]).toMatchObject({
      totalAssigned: 0,
      resolutionRate: 0,
      averageResolutionTimeHours: null,
    });
  });

  it("accepts leap days, same-day periods, and the inclusive 366-day limit", async () => {
    for (const query of [
      "?startDate=2024-02-29&endDate=2024-02-29",
      "?startDate=2024-01-01&endDate=2024-12-31",
    ]) {
      const response = await get("incident-trends", query);
      expect(response.status).toBe(200);
      expect(response.body.data.trend.length).toBe(
        query.includes("01-01") ? 366 : 1,
      );
    }
  });

  it("bounds recent maintenance to the past 90 days, including now, and deduplicates history", async () => {
    const now = date("2026-01-10T12:00:00Z").getTime();
    const clock = jest.spyOn(Date, "now").mockReturnValue(now);
    try {
      const ids = Array.from(
        { length: 4 },
        () => new mongoose.Types.ObjectId(),
      );
      await Asset.collection.insertMany(
        ids.map((_id) => ({
          _id,
          assetId: _id.toString(),
          organizationId: org,
          status: "Available",
        })),
      );
      for (const [index, time] of [
        [0, now - 90 * DAY],
        [1, now - 90 * DAY - 1],
        [2, now],
        [2, now],
        [3, now + 1],
      ]) {
        await Maintenance.collection.insertOne({
          organizationId: org,
          assetId: ids[index],
          status: "Completed",
          date: new Date(time),
        });
      }
      expect((await getAssetHealth(org.toString())).maintenanceAlerts).toBe(2);
    } finally {
      clock.mockRestore();
    }
  });

  it("filters every endpoint without allowing organization override", async () => {
    for (const endpoint of endpoints) {
      const own = await get(endpoint, period);
      const spoof = await get(endpoint, `${period}&organizationId=${foreign}`);
      expect(own.status).toBe(200);
      expect(spoof.body).toEqual(own.body);
    }
  });
  it("excludes a null creation timestamp from operational duration averages", async () => {
    await Incident.collection.insertOne(
      incident({
        status: "Resolved",
        createdAt: null,
        resolvedAt: date("2026-01-02"),
      }),
    );
    expect((await get("technician-performance")).body.data[0]).toMatchObject({
      totalAssigned: 1,
      totalResolvedOrClosed: 1,
      averageResolutionTimeHours: null,
    });
  });
});
