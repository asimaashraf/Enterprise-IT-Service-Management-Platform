import request from "supertest";
import mongoose from "mongoose";

import app from "../src/app";
import { connectDB } from "../src/config/db";
import AuthUser from "../src/modules/auth/auth.model";
import Organization from "../src/modules/organization/organization.model";
import SupportTeam from "../src/modules/support-team/supportTeam.model";
import IncidentEscalationPolicy from "../src/modules/incident-escalation/incidentEscalation.model";
import {
  createTestUser,
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
  TEST_EMPLOYEE_EMAIL,
  TEST_EMPLOYEE_PASSWORD,
} from "./test-fixtures";

describe("Support Team API", () => {
  let adminToken: string;
  let employeeToken: string;
  let organizationId: string;
  let employeeId: string;
  let activeAdminId: string;
  let inactiveAdminId: string;
  let otherOrganizationId: string;
  let otherAdminId: string;
  let createdTeamId: string;
  let otherTeamId: string;
  const createdUserIds: string[] = [];

  const uniqueName = (name: string) => `${name} ${Date.now()}`;

  beforeAll(async () => {
    await connectDB();

    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.data.token;
    organizationId = adminLogin.body.data.user.organizationId;

    const employeeLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: TEST_EMPLOYEE_EMAIL, password: TEST_EMPLOYEE_PASSWORD });
    expect(employeeLogin.status).toBe(200);
    employeeToken = employeeLogin.body.data.token;
    employeeId = employeeLogin.body.data.user.id;

    const activeAdmin = await createTestUser({
      name: "Support Team Active Admin",
      email: `support-team-admin-${Date.now()}@example.com`,
      password: "SupportTeamAdmin123!",
      role: "admin",
      organizationId,
    });
    activeAdminId = activeAdmin._id.toString();
    createdUserIds.push(activeAdminId);

    const inactiveAdmin = await createTestUser({
      name: "Support Team Inactive Admin",
      email: `support-team-inactive-${Date.now()}@example.com`,
      password: "SupportTeamInactive123!",
      role: "admin",
      organizationId,
    });
    inactiveAdminId = inactiveAdmin._id.toString();
    createdUserIds.push(inactiveAdminId);
    await AuthUser.findByIdAndUpdate(inactiveAdminId, { isActive: false });

    const otherOrganization = await Organization.create({
      name: uniqueName("Other Support Team Organization"),
      slug: `other-support-team-${Date.now()}`,
      isActive: true,
    });
    otherOrganizationId = otherOrganization._id.toString();

    const otherAdmin = await createTestUser({
      name: "Other Support Team Admin",
      email: `other-support-team-admin-${Date.now()}@example.com`,
      password: "OtherSupportTeamAdmin123!",
      role: "admin",
      organizationId: otherOrganizationId,
    });
    otherAdminId = otherAdmin._id.toString();
    createdUserIds.push(otherAdminId);

    const otherTeam = await SupportTeam.create({
      name: uniqueName("Other Tenant Support Team"),
      organizationId: otherOrganizationId,
      members: [otherAdminId],
    });
    otherTeamId = otherTeam._id.toString();
  });

  afterAll(async () => {
    await IncidentEscalationPolicy.deleteMany({
      organizationId: { $in: [organizationId, otherOrganizationId].filter(Boolean) },
    });
    await SupportTeam.deleteMany({
      _id: { $in: [createdTeamId, otherTeamId].filter(Boolean) },
    });
    await AuthUser.deleteMany({ _id: { $in: createdUserIds } });
    await Organization.deleteOne({ _id: otherOrganizationId });
  });

  it("allows an admin to create a team with an active same-tenant admin member", async () => {
    const response = await request(app)
      .post("/api/v1/support-teams")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: uniqueName("Operations Support"),
        description: "Operational support team",
        members: [activeAdminId],
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.members).toEqual([activeAdminId]);
    createdTeamId = response.body.data._id;
  });

  it("rejects a same-tenant employee as a support team member", async () => {
    const response = await request(app)
      .post("/api/v1/support-teams")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: uniqueName("Employee Member Team"), members: [employeeId] });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Support team members must be active admins in this organization"
    );
  });

  it("rejects an admin from another tenant as a support team member", async () => {
    const response = await request(app)
      .post("/api/v1/support-teams")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: uniqueName("Cross Tenant Member Team"), members: [otherAdminId] });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Support team members must be active admins in this organization"
    );
  });

  it("rejects an inactive admin as a support team member", async () => {
    const response = await request(app)
      .post("/api/v1/support-teams")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: uniqueName("Inactive Member Team"), members: [inactiveAdminId] });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Support team members must be active admins in this organization"
    );
  });

  it("rejects a nonexistent user as a support team member", async () => {
    const response = await request(app)
      .post("/api/v1/support-teams")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: uniqueName("Missing Member Team"),
        members: [new mongoose.Types.ObjectId().toString()],
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Support team members must be active admins in this organization"
    );
  });

  it("uses the same membership validation when updating a team", async () => {
    const response = await request(app)
      .put(`/api/v1/support-teams/${createdTeamId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ members: [employeeId] });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Support team members must be active admins in this organization"
    );
  });

  it("prevents employees from creating, updating, and deleting support teams", async () => {
    const createResponse = await request(app)
      .post("/api/v1/support-teams")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ name: uniqueName("Employee Team") });
    const updateResponse = await request(app)
      .put(`/api/v1/support-teams/${createdTeamId}`)
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ description: "Unauthorized update" });
    const deleteResponse = await request(app)
      .delete(`/api/v1/support-teams/${createdTeamId}`)
      .set("Authorization", `Bearer ${employeeToken}`);

    for (const response of [createResponse, updateResponse, deleteResponse]) {
      expect(response.status).toBe(403);
      expect(response.body.message).toBe(
        "You are not authorized to perform this action"
      );
    }
  });

  it("prevents deleting a team referenced by an escalation policy", async () => {
    await IncidentEscalationPolicy.create({
      name: uniqueName("Referenced Team Policy"),
      organizationId,
      priority: "High",
      escalationLevel: "Level 1",
      thresholdMinutes: 15,
      targetType: "SupportTeam",
      targetTeam: createdTeamId,
      createdBy: adminToken ? new mongoose.Types.ObjectId() : undefined,
    });

    const response = await request(app)
      .delete(`/api/v1/support-teams/${createdTeamId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/referenced by an escalation policy/i);
    expect(await SupportTeam.exists({ _id: createdTeamId })).not.toBeNull();
  });

  it("keeps support team reads tenant-scoped while allowing authenticated employees to read their tenant", async () => {
    const ownResponse = await request(app)
      .get("/api/v1/support-teams")
      .set("Authorization", `Bearer ${employeeToken}`);

    expect(ownResponse.status).toBe(200);
    expect(ownResponse.body.data.some((team: { _id: string }) => team._id === createdTeamId)).toBe(true);
    expect(ownResponse.body.data.some((team: { _id: string }) => team._id === otherTeamId)).toBe(false);

    const crossTenantResponse = await request(app)
      .get(`/api/v1/support-teams/${otherTeamId}`)
      .set("Authorization", `Bearer ${employeeToken}`);
    expect(crossTenantResponse.status).toBe(404);
  });
});
