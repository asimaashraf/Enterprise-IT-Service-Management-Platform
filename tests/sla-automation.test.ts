import mongoose from "mongoose";

import { connectDB } from "../src/config/db";
import Incident from "../src/modules/incident/incident.model";
import SLA from "../src/modules/sla/sla.model";
import { scanSLABreaches } from "../src/modules/sla/sla.service";
import IncidentEscalationPolicy from "../src/modules/incident-escalation/incidentEscalation.model";
import AuthUser from "../src/modules/auth/auth.model";
import Organization from "../src/modules/organization/organization.model";
import SupportTeam from "../src/modules/support-team/supportTeam.model";
import { notificationQueue } from "../src/jobs/queues/notification.queue";
import { createTestUser } from "./test-fixtures";

jest.setTimeout(60000);

describe("Scheduled SLA automation", () => {
  let organizationId: string;
  let userId: string;
  const incidentIds: string[] = [];
  const slaIds: string[] = [];
  const policyIds: string[] = [];
  const supportTeamIds: string[] = [];
  const temporaryUserIds: string[] = [];

  beforeAll(async () => {
    await connectDB();

    const organization = await Organization.create({
      name: `SLA Automation Organization ${Date.now()}`,
      slug: `sla-automation-${Date.now()}`,
      isActive: true,
    });
    organizationId = organization._id.toString();

    const user = await createTestUser({
      name: "SLA Automation User",
      email: `sla.automation.${Date.now()}@example.com`,
      password: "SlaAutomation123!",
      role: "admin",
      organizationId,
    });
    userId = user._id.toString();
  });

  afterEach(async () => {
    if (policyIds.length) {
      await IncidentEscalationPolicy.deleteMany({
        _id: { $in: policyIds.splice(0) },
      });
    }
    if (supportTeamIds.length) {
      await SupportTeam.deleteMany({ _id: { $in: supportTeamIds.splice(0) } });
    }
    if (slaIds.length) {
      await SLA.deleteMany({ _id: { $in: slaIds.splice(0) } });
    }
    if (incidentIds.length) {
      await Incident.deleteMany({ _id: { $in: incidentIds.splice(0) } });
    }
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    if (temporaryUserIds.length) {
      await AuthUser.deleteMany({ _id: { $in: temporaryUserIds } });
    }
    await AuthUser.deleteOne({ _id: userId });
    await Organization.deleteOne({ _id: organizationId });
  });

  const createIncidentAndSLA = async ({
    status = "Open",
    responseDueAt = new Date(Date.now() - 60000),
    resolutionDueAt = new Date(Date.now() + 3600000),
  }: {
    status?: "Open" | "In Progress" | "Resolved" | "Closed";
    responseDueAt?: Date;
    resolutionDueAt?: Date;
  } = {}) => {
    const incident = await Incident.create({
      incidentId: `INC-SLA-AUTO-${Date.now()}-${Math.random()}`,
      title: "SLA automation incident",
      description: "SLA automation test incident",
      priority: "High",
      severity: "Major",
      status,
      reportedBy: userId,
      organizationId,
    });
    incidentIds.push(incident._id.toString());

    await Incident.collection.updateOne(
      { _id: incident._id },
      { $set: { createdAt: new Date(Date.now() - 3600000) } }
    );

    const sla = await SLA.create({
      incidentId: incident._id,
      organizationId,
      priority: "High",
      responseTimeMinutes: 30,
      resolutionTimeMinutes: 240,
      responseDueAt,
      resolutionDueAt,
      status: "Active",
      responseBreached: false,
      resolutionBreached: false,
      businessHours: {
        timezone: "UTC",
        startHour: 0,
        startMinute: 0,
        endHour: 23,
        endMinute: 59,
        workingDays: [0, 1, 2, 3, 4, 5, 6],
      },
    });
    slaIds.push(sla._id.toString());

    return { incident, sla };
  };

  it("detects response and resolution breaches and queues one notification each", async () => {
    const { sla } = await createIncidentAndSLA({
      responseDueAt: new Date(Date.now() - 120000),
      resolutionDueAt: new Date(Date.now() - 60000),
    });
    const add = jest.spyOn(notificationQueue, "add");

    await scanSLABreaches();

    const callsForSLA = add.mock.calls.filter(
      ([, data]) => data.entityId === sla._id.toString()
    );
    expect(callsForSLA).toHaveLength(2);
    expect(callsForSLA.map(([, data]) => data.type)).toEqual([
      "SLA Breached",
      "SLA Breached",
    ]);

    const updated = await SLA.findById(sla._id);
    expect(updated?.responseBreached).toBe(true);
    expect(updated?.resolutionBreached).toBe(true);
  });

  it("leaves a non-breached SLA unchanged", async () => {
    const { sla } = await createIncidentAndSLA({
      responseDueAt: new Date(Date.now() + 60000),
      resolutionDueAt: new Date(Date.now() + 3600000),
    });
    const add = jest.spyOn(notificationQueue, "add");

    await scanSLABreaches();

    expect(
      add.mock.calls.some(([, data]) => data.entityId === sla._id.toString())
    ).toBe(false);
    const unchanged = await SLA.findById(sla._id);
    expect(unchanged?.responseBreached).toBe(false);
    expect(unchanged?.resolutionBreached).toBe(false);
  });

  it.each(["Resolved", "Closed"] as const)(
    "does not process a %s incident",
    async (status) => {
      const { sla } = await createIncidentAndSLA({
        status,
        responseDueAt: new Date(Date.now() - 120000),
        resolutionDueAt: new Date(Date.now() - 60000),
      });
      const add = jest.spyOn(notificationQueue, "add");

      await scanSLABreaches();

      expect(
        add.mock.calls.some(([, data]) => data.entityId === sla._id.toString())
      ).toBe(false);
      const unchanged = await SLA.findById(sla._id);
      expect(unchanged?.responseBreached).toBe(false);
      expect(unchanged?.resolutionBreached).toBe(false);
    }
  );

  it("executes a same-tenant escalation policy and does not repeat it", async () => {
    const { sla } = await createIncidentAndSLA({
      responseDueAt: new Date(Date.now() - 120000),
    });
    const policy = await IncidentEscalationPolicy.create({
      name: `SLA policy ${Date.now()}`,
      organizationId,
      priority: "High",
      escalationLevel: "Level 1",
      thresholdMinutes: 1,
      targetType: "User",
      targetUser: userId,
      isActive: true,
      createdBy: userId,
    });
    policyIds.push(policy._id.toString());
    const add = jest.spyOn(notificationQueue, "add");

    const firstScan = await scanSLABreaches();
    const firstCount = add.mock.calls.filter(
      ([, data]) => data.entityId === sla._id.toString()
    ).length;

    await scanSLABreaches();
    const secondCount = add.mock.calls.filter(
      ([, data]) => data.entityId === sla._id.toString()
    ).length;

    expect(firstCount).toBe(2);
    expect(secondCount).toBe(firstCount);
    const updated = await SLA.findById(sla._id);
    expect(updated?.escalatedPolicyIds.map(String)).toContain(
      policy._id.toString()
    );
  });

  it("keeps escalation policy lookup tenant-scoped", async () => {
    const otherOrganization = await Organization.create({
      name: `Other SLA Organization ${Date.now()}`,
      slug: `other-sla-${Date.now()}`,
      isActive: true,
    });
    const otherPolicy = await IncidentEscalationPolicy.create({
      name: `Other tenant SLA policy ${Date.now()}`,
      organizationId: otherOrganization._id,
      priority: "High",
      escalationLevel: "Level 1",
      thresholdMinutes: 1,
      targetType: "User",
      targetUser: userId,
      isActive: true,
      createdBy: userId,
    });
    const { sla } = await createIncidentAndSLA({
      responseDueAt: new Date(Date.now() - 120000),
    });
    const add = jest.spyOn(notificationQueue, "add");

    await scanSLABreaches();

    expect(
      add.mock.calls.some(
        ([, data]) =>
          data.entityId === sla._id.toString() &&
          data.message.includes(otherPolicy.name)
      )
    ).toBe(false);

    await IncidentEscalationPolicy.deleteOne({ _id: otherPolicy._id });
    await Organization.deleteOne({ _id: otherOrganization._id });
  });

  it("filters legacy Support Team members to active same-tenant ADMIN escalation recipients", async () => {
    const legacyEmployee = await createTestUser({
      name: "Legacy escalation employee",
      email: `legacy-escalation.${Date.now()}@example.com`,
      password: "SlaAutomation123!",
      role: "employee",
      organizationId,
    });
    temporaryUserIds.push(legacyEmployee._id.toString());
    const inactiveAdmin = await createTestUser({
      name: "Inactive escalation admin",
      email: `inactive-escalation.${Date.now()}@example.com`,
      password: "SlaAutomation123!",
      role: "admin",
      organizationId,
    });
    temporaryUserIds.push(inactiveAdmin._id.toString());
    await AuthUser.updateOne({ _id: inactiveAdmin._id }, { $set: { isActive: false } });
    const foreignAdmin = await createTestUser({
      name: "Foreign escalation admin",
      email: `foreign-escalation.${Date.now()}@example.com`,
      password: "SlaAutomation123!",
      role: "admin",
      organizationId: new mongoose.Types.ObjectId().toString(),
    });
    temporaryUserIds.push(foreignAdmin._id.toString());
    const team = await SupportTeam.create({
      name: `Legacy team ${Date.now()}`,
      organizationId,
      members: [userId, legacyEmployee._id, inactiveAdmin._id, foreignAdmin._id],
      isActive: true,
    });
    supportTeamIds.push(team._id.toString());
    const { sla } = await createIncidentAndSLA({
      responseDueAt: new Date(Date.now() - 120000),
    });
    policyIds.push(
      (
        await IncidentEscalationPolicy.create({
          name: `Legacy team policy ${Date.now()}`,
          organizationId,
          priority: "High",
          escalationLevel: "Level 1",
          thresholdMinutes: 1,
          targetType: "SupportTeam",
          targetTeam: team._id,
          isActive: true,
          createdBy: userId,
        })
      )._id.toString()
    );
    const add = jest.spyOn(notificationQueue, "add");

    await scanSLABreaches();

    const escalationJobs = add.mock.calls.filter(
      ([, data]) =>
        data.entityId === sla._id.toString() &&
        data.title === "Incident Escalated"
    );
    expect(escalationJobs).toHaveLength(1);
    expect(escalationJobs[0][1].userId).toBe(userId);
    expect(
      escalationJobs.some(([, data]) => data.userId === legacyEmployee._id.toString())
    ).toBe(false);
    expect(
      escalationJobs.some(([, data]) => data.userId === inactiveAdmin._id.toString())
    ).toBe(false);
    expect(
      escalationJobs.some(([, data]) => data.userId === foreignAdmin._id.toString())
    ).toBe(false);
  });
});
