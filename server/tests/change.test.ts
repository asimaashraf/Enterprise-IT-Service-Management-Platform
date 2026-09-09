import dotenv from "dotenv";

dotenv.config();

import request from "supertest";
import mongoose from "mongoose";

import app from "../src/app";
import { connectDB } from "../src/config/db";
import Change from "../src/modules/change/change.model";
import AuthUser from "../src/modules/auth/auth.model";
import Organization from "../src/modules/organization/organization.model";
import {
  createTestUser,
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
  TEST_EMPLOYEE_EMAIL,
  TEST_EMPLOYEE_PASSWORD,
} from "./test-fixtures";

type ChangeRecord = {
  _id: string;
  organizationId: string;
  requestedBy: string | { _id: string };
  status: string;
  failedAt?: string;
  cancelledAt?: string;
};

const objectId = (value: string | { _id: string }) =>
  typeof value === "string" ? value : value._id;

describe("Change Management authorization and workflow", () => {
  let adminToken: string;
  let adminId: string;
  let employeeToken: string;
  let employeeId: string;
  let secondEmployeeToken: string;
  let secondEmployeeId: string;
  let inactiveEmployeeId: string;
  let otherAdminToken: string;
  let otherAdminId: string;
  let otherOrganizationId: string;
  const createdChangeIds: string[] = [];
  const transientUserIds: string[] = [];
  let sequence = 0;

  const createChange = async (
    token: string,
    label: string
  ): Promise<ChangeRecord> => {
    const response = await request(app)
      .post("/api/v1/changes")
      .set("Authorization", `Bearer ${token}`)
      .send({
        changeId: `CHG-P8-${Date.now()}-${++sequence}`,
        title: `${label} change`,
        description: `${label} change description`,
        type: "Normal",
        risk: "Medium",
      });

    expect(response.status).toBe(201);
    const change = response.body.data as ChangeRecord;
    createdChangeIds.push(change._id);
    return change;
  };

  const transition = async (
    id: string,
    status: string,
    data: Record<string, unknown> = {}
  ) => request(app)
    .put(`/api/v1/changes/${id}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ status, ...data });

  beforeAll(async () => {
    await connectDB();

    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.data.token;
    adminId = adminLogin.body.data.user.id;

    const employeeLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: TEST_EMPLOYEE_EMAIL, password: TEST_EMPLOYEE_PASSWORD });
    expect(employeeLogin.status).toBe(200);
    employeeToken = employeeLogin.body.data.token;
    employeeId = employeeLogin.body.data.user.id;
    const organizationId = employeeLogin.body.data.user.organizationId;

    const secondEmployee = await createTestUser({
      name: "Second Change Employee",
      email: `second.change.employee.${Date.now()}@example.com`,
      password: "SecondChangeEmployee123!",
      role: "employee",
      organizationId,
    });
    transientUserIds.push(secondEmployee._id.toString());
    secondEmployeeId = secondEmployee._id.toString();

    const secondEmployeeLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: secondEmployee.email, password: "SecondChangeEmployee123!" });
    expect(secondEmployeeLogin.status).toBe(200);
    secondEmployeeToken = secondEmployeeLogin.body.data.token;

    const inactiveEmployee = await createTestUser({
      name: "Inactive Change Employee",
      email: `inactive.change.employee.${Date.now()}@example.com`,
      password: "InactiveChangeEmployee123!",
      role: "employee",
      organizationId,
    });
    transientUserIds.push(inactiveEmployee._id.toString());
    inactiveEmployeeId = inactiveEmployee._id.toString();
    await AuthUser.findByIdAndUpdate(inactiveEmployeeId, { isActive: false });

    const otherOrganization = await Organization.create({
      name: `Other Change Organization ${Date.now()}`,
      slug: `other-change-${Date.now()}`,
      isActive: true,
    });
    otherOrganizationId = otherOrganization._id.toString();

    const otherAdmin = await createTestUser({
      name: "Other Change Admin",
      email: `other.change.admin.${Date.now()}@example.com`,
      password: "OtherChangeAdmin123!",
      role: "admin",
      organizationId: otherOrganizationId,
    });
    transientUserIds.push(otherAdmin._id.toString());
    otherAdminId = otherAdmin._id.toString();

    const otherAdminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: otherAdmin.email, password: "OtherChangeAdmin123!" });
    expect(otherAdminLogin.status).toBe(200);
    otherAdminToken = otherAdminLogin.body.data.token;
  });

  afterAll(async () => {
    await Change.deleteMany({ _id: { $in: createdChangeIds } });
    await AuthUser.deleteMany({ _id: { $in: transientUserIds } });
    await Organization.deleteOne({ _id: otherOrganizationId });
    await mongoose.connection.close();
  });

  it("rejects unauthenticated Change reads", async () => {
    const response = await request(app).get("/api/v1/changes");
    expect(response.status).toBe(401);
  });

  it("scopes employee lists to their own Changes while admins see tenant Changes", async () => {
    const employeeChange = await createChange(employeeToken, "Employee list");
    const secondEmployeeChange = await createChange(secondEmployeeToken, "Second employee list");
    const adminChange = await createChange(adminToken, "Admin list");

    const employeeList = await request(app)
      .get("/api/v1/changes")
      .set("Authorization", `Bearer ${employeeToken}`);
    expect(employeeList.status).toBe(200);
    const employeeChanges = employeeList.body.data as ChangeRecord[];
    expect(employeeChanges.some((change) => change._id === employeeChange._id)).toBe(true);
    expect(employeeChanges.some((change) => change._id === secondEmployeeChange._id)).toBe(false);
    expect(employeeChanges.some((change) => change._id === adminChange._id)).toBe(false);
    expect(employeeChanges.every((change) => objectId(change.requestedBy) === employeeId)).toBe(true);

    const adminList = await request(app)
      .get("/api/v1/changes")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(adminList.status).toBe(200);
    const adminChanges = adminList.body.data as ChangeRecord[];
    expect(adminChanges.some((change) => change._id === employeeChange._id)).toBe(true);
    expect(adminChanges.some((change) => change._id === secondEmployeeChange._id)).toBe(true);
    expect(adminChanges.some((change) => change._id === adminChange._id)).toBe(true);
  });

  it("prevents an employee from reading or editing another employee's Change", async () => {
    const otherEmployeeChange = await createChange(secondEmployeeToken, "Other employee");

    const readResponse = await request(app)
      .get(`/api/v1/changes/${otherEmployeeChange._id}`)
      .set("Authorization", `Bearer ${employeeToken}`);
    expect(readResponse.status).toBe(404);

    const updateResponse = await request(app)
      .put(`/api/v1/changes/${otherEmployeeChange._id}`)
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ description: "Unauthorized edit" });
    expect(updateResponse.status).toBe(404);
  });

  it("rejects cross-tenant Change reads and updates", async () => {
    const change = await createChange(adminToken, "Cross tenant");

    const readResponse = await request(app)
      .get(`/api/v1/changes/${change._id}`)
      .set("Authorization", `Bearer ${otherAdminToken}`);
    expect(readResponse.status).toBe(404);

    const updateResponse = await request(app)
      .put(`/api/v1/changes/${change._id}`)
      .set("Authorization", `Bearer ${otherAdminToken}`)
      .send({ description: "Cross-tenant edit" });
    expect(updateResponse.status).toBe(404);
  });

  it("allows employees to edit only their own Draft Changes", async () => {
    const change = await createChange(employeeToken, "Employee editable");

    const editResponse = await request(app)
      .put(`/api/v1/changes/${change._id}`)
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ description: "Employee draft edit" });
    expect(editResponse.status).toBe(200);
    expect(editResponse.body.data.description).toBe("Employee draft edit");

    expect((await transition(change._id, "Pending Approval")).status).toBe(200);
    const lateEditResponse = await request(app)
      .put(`/api/v1/changes/${change._id}`)
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ description: "Late employee edit" });
    expect(lateEditResponse.status).toBe(400);
  });

  it("rejects protected-field injection", async () => {
    const change = await createChange(adminToken, "Protected fields");

    const response = await request(app)
      .put(`/api/v1/changes/${change._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        organizationId: otherOrganizationId,
        requestedBy: secondEmployeeId,
        approvedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    expect(response.status).toBe(400);

    const persisted = await request(app)
      .get(`/api/v1/changes/${change._id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(persisted.status).toBe(200);
    expect(persisted.body.data.organizationId).toBe(change.organizationId);
    expect(objectId(persisted.body.data.requestedBy as string | { _id: string })).toBe(adminId);
  });

  it("allows only admins to assign active same-tenant employees", async () => {
    const change = await createChange(adminToken, "Assignment validation");

    const employeeAssignment = await request(app)
      .put(`/api/v1/changes/${change._id}`)
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ assignedTo: employeeId });
    expect(employeeAssignment.status).toBe(403);

    for (const targetId of [adminId, inactiveEmployeeId, otherAdminId, new mongoose.Types.ObjectId().toString(), "not-an-id"]) {
      const invalidAssignment = await request(app)
        .put(`/api/v1/changes/${change._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ assignedTo: targetId });
      expect(invalidAssignment.status).toBe(400);
    }

    const validAssignment = await request(app)
      .put(`/api/v1/changes/${change._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ assignedTo: secondEmployeeId });
    expect(validAssignment.status).toBe(200);
    expect(objectId(validAssignment.body.data.assignedTo as string | { _id: string })).toBe(secondEmployeeId);
  });

  it("enforces the ADMIN-only Change transition matrix", async () => {
    const change = await createChange(adminToken, "Transition matrix");

    const invalidApproval = await transition(change._id, "Approved");
    expect(invalidApproval.status).toBe(400);

    const employeeTransition = await request(app)
      .put(`/api/v1/changes/${change._id}`)
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ status: "Pending Approval" });
    expect(employeeTransition.status).toBe(403);

    expect((await transition(change._id, "Pending Approval")).status).toBe(200);
    const approval = await transition(change._id, "Approved", {
      approvalReason: "Approved after review",
    });
    expect(approval.status).toBe(200);
    expect(approval.body.data.approvedBy).toBeDefined();
    expect(approval.body.data.approvedAt).toBeDefined();

    expect((await transition(change._id, "Scheduled")).status).toBe(200);
    expect((await transition(change._id, "In Progress")).status).toBe(200);
    expect((await transition(change._id, "Completed")).status).toBe(200);
    expect((await transition(change._id, "Cancelled")).status).toBe(400);
  });

  it("requires an ADMIN rejection reason and keeps rejected Changes terminal", async () => {
    const change = await createChange(employeeToken, "Rejection");
    expect((await transition(change._id, "Pending Approval")).status).toBe(200);

    const noReason = await transition(change._id, "Rejected");
    expect(noReason.status).toBe(400);

    const rejected = await transition(change._id, "Rejected", {
      approvalReason: "Risk is not acceptable",
    });
    expect(rejected.status).toBe(200);
    expect(rejected.body.data.rejectedBy).toBeDefined();
    expect(rejected.body.data.rejectedAt).toBeDefined();
    expect((await transition(change._id, "Cancelled")).status).toBe(400);
  });

  it("persists failedAt and cancelledAt for valid terminal transitions", async () => {
    const failedChange = await createChange(adminToken, "Failure timestamp");
    expect((await transition(failedChange._id, "Pending Approval")).status).toBe(200);
    expect((await transition(failedChange._id, "Approved")).status).toBe(200);
    expect((await transition(failedChange._id, "In Progress")).status).toBe(200);
    const failed = await transition(failedChange._id, "Failed", {
      failureReason: "Deployment health check failed",
    });
    expect(failed.status).toBe(200);
    expect(failed.body.data.failedAt).toBeDefined();

    const persistedFailure = await request(app)
      .get(`/api/v1/changes/${failedChange._id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect((persistedFailure.body.data as ChangeRecord).failedAt).toBeDefined();

    const cancelledChange = await createChange(adminToken, "Cancellation timestamp");
    const cancelled = await transition(cancelledChange._id, "Cancelled");
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.cancelledAt).toBeDefined();

    const persistedCancellation = await request(app)
      .get(`/api/v1/changes/${cancelledChange._id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect((persistedCancellation.body.data as ChangeRecord).cancelledAt).toBeDefined();
  });

  it("allows only admins to delete Changes", async () => {
    const change = await createChange(adminToken, "Deletion");

    const employeeDelete = await request(app)
      .delete(`/api/v1/changes/${change._id}`)
      .set("Authorization", `Bearer ${employeeToken}`);
    expect(employeeDelete.status).toBe(403);

    const adminDelete = await request(app)
      .delete(`/api/v1/changes/${change._id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(adminDelete.status).toBe(200);
  });
});
