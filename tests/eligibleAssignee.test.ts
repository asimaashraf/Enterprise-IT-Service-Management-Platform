import request from "supertest";

import app from "../src/app";
import { connectDB } from "../src/config/db";
import AuthUser from "../src/modules/auth/auth.model";
import Organization from "../src/modules/organization/organization.model";
import SupportTeam from "../src/modules/support-team/supportTeam.model";
import { isEligibleOperationalAssignee } from "../src/modules/auth/user.service";
import {
  createTestUser,
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
  TEST_EMPLOYEE_EMAIL,
  TEST_EMPLOYEE_PASSWORD,
} from "./test-fixtures";

describe("Eligible Operational Assignees API", () => {
  let adminToken: string;
  let employeeToken: string;
  let organizationId: string;
  let employeeId: string;
  let eligibleAdminId: string;
  let unassignedAdminId: string;
  let inactiveTeamAdminId: string;
  let inactiveAdminId: string;
  let otherOrganizationId: string;
  let otherAdminId: string;
  const createdUserIds: string[] = [];
  const createdTeamIds: string[] = [];

  beforeAll(async () => {
    await connectDB();
    const suffix = Date.now();

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

    const eligibleAdmin = await createTestUser({
      name: "Eligible Operations Admin",
      email: `eligible-assignee-${suffix}@example.com`,
      password: "EligibleAssignee123!",
      role: "admin",
      organizationId,
    });
    eligibleAdminId = eligibleAdmin._id.toString();
    createdUserIds.push(eligibleAdminId);

    const unassignedAdmin = await createTestUser({
      name: "Unassigned Operations Admin",
      email: `unassigned-assignee-${suffix}@example.com`,
      password: "UnassignedAssignee123!",
      role: "admin",
      organizationId,
    });
    unassignedAdminId = unassignedAdmin._id.toString();
    createdUserIds.push(unassignedAdminId);

    const inactiveTeamAdmin = await createTestUser({
      name: "Inactive Team Admin",
      email: `inactive-team-assignee-${suffix}@example.com`,
      password: "InactiveTeamAssignee123!",
      role: "admin",
      organizationId,
    });
    inactiveTeamAdminId = inactiveTeamAdmin._id.toString();
    createdUserIds.push(inactiveTeamAdminId);

    const inactiveAdmin = await createTestUser({
      name: "Inactive Operations Admin",
      email: `inactive-assignee-${suffix}@example.com`,
      password: "InactiveAssignee123!",
      role: "admin",
      organizationId,
    });
    inactiveAdminId = inactiveAdmin._id.toString();
    createdUserIds.push(inactiveAdminId);
    await AuthUser.findByIdAndUpdate(inactiveAdminId, { isActive: false });

    const otherOrganization = await Organization.create({
      name: `Eligible Assignee Other Organization ${suffix}`,
      slug: `eligible-assignee-other-${suffix}`,
      isActive: true,
    });
    otherOrganizationId = otherOrganization._id.toString();

    const otherAdmin = await createTestUser({
      name: "Other Tenant Eligible Admin",
      email: `other-eligible-assignee-${suffix}@example.com`,
      password: "OtherEligibleAssignee123!",
      role: "admin",
      organizationId: otherOrganizationId,
    });
    otherAdminId = otherAdmin._id.toString();
    createdUserIds.push(otherAdminId);

    const teams = await SupportTeam.create([
      {
        name: `Eligible Operations Team ${suffix}`,
        organizationId,
        members: [eligibleAdminId, inactiveAdminId],
        isActive: true,
      },
      {
        name: `Second Eligible Operations Team ${suffix}`,
        organizationId,
        members: [eligibleAdminId],
        isActive: true,
      },
      {
        name: `Inactive Operations Team ${suffix}`,
        organizationId,
        members: [inactiveTeamAdminId],
        isActive: false,
      },
      {
        name: `Other Tenant Operations Team ${suffix}`,
        organizationId: otherOrganizationId,
        members: [otherAdminId],
        isActive: true,
      },
    ]);
    createdTeamIds.push(...teams.map((team) => team._id.toString()));
  });

  afterAll(async () => {
    await SupportTeam.deleteMany({ _id: { $in: createdTeamIds } });
    await AuthUser.deleteMany({ _id: { $in: createdUserIds } });
    await Organization.deleteOne({ _id: otherOrganizationId });
  });

  it("rejects unauthenticated requests", async () => {
    const response = await request(app).get(
      "/api/v1/users/eligible-assignees"
    );

    expect(response.status).toBe(401);
  });

  it("rejects employee requesters from the admin-only endpoint", async () => {
    const response = await request(app)
      .get("/api/v1/users/eligible-assignees")
      .set("Authorization", `Bearer ${employeeToken}`);

    expect(response.status).toBe(403);
  });

  it("returns each eligible same-tenant admin once and excludes ineligible users", async () => {
    const response = await request(app)
      .get("/api/v1/users/eligible-assignees")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const users = response.body.data as Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      password?: string;
    }>;
    const ids = users.map((user) => user.id);

    expect(ids.filter((id) => id === eligibleAdminId)).toHaveLength(1);
    expect(ids).not.toContain(employeeId);
    expect(ids).not.toContain(unassignedAdminId);
    expect(ids).not.toContain(inactiveTeamAdminId);
    expect(ids).not.toContain(inactiveAdminId);
    expect(ids).not.toContain(otherAdminId);

    const eligibleUser = users.find((user) => user.id === eligibleAdminId);
    expect(eligibleUser).toEqual({
      id: eligibleAdminId,
      name: "Eligible Operations Admin",
      email: expect.stringMatching(/^eligible-assignee-/),
      role: "admin",
    });
    expect(eligibleUser?.password).toBeUndefined();
  });

  it("exposes the same eligibility rule for backend consumers", async () => {
    await expect(
      isEligibleOperationalAssignee(eligibleAdminId, organizationId)
    ).resolves.toBe(true);
    await expect(
      isEligibleOperationalAssignee(employeeId, organizationId)
    ).resolves.toBe(false);
    await expect(
      isEligibleOperationalAssignee(unassignedAdminId, organizationId)
    ).resolves.toBe(false);
    await expect(
      isEligibleOperationalAssignee(inactiveTeamAdminId, organizationId)
    ).resolves.toBe(false);
    await expect(
      isEligibleOperationalAssignee(inactiveAdminId, organizationId)
    ).resolves.toBe(false);
    await expect(
      isEligibleOperationalAssignee(otherAdminId, organizationId)
    ).resolves.toBe(false);
  });
});
