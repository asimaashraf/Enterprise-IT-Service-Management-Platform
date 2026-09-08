import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import app from "../src/app";
import RCA, { RCAStatus } from "../src/modules/rca/rca.model";
import Action from "../src/modules/rca/rcaCorrectiveAction.model";
import Problem from "../src/modules/problem/problem.model";
import Incident from "../src/modules/incident/incident.model";
import AuthUser from "../src/modules/auth/auth.model";
import Organization from "../src/modules/organization/organization.model";
import { withRCAMutation } from "../src/modules/rca/rca.mutation";

jest.setTimeout(30000);

describe("RCA security and workflow hardening", () => {
  let org: string, otherOrg: string, admin: string, employee: string, inactive: string, foreignAdmin: string;
  let token: string, employeeToken: string, foreignToken: string;
  let id: string, problem: string, incident: string, actionId: string;
  const base = "/api/v1/rcas";
  const oid = () => new mongoose.Types.ObjectId().toString();
  const body = () => ({ rcaId: `RCA-${oid()}`, problem, rootCause: "Root cause", investigation: "Investigation" });
  const actionBody = () => ({ title: "Repair", description: "Repair the service", assignedTo: admin, dueDate: "2026-12-01T00:00:00.000Z" });
  const update = (data: unknown, auth = token, target = id) => request(app).put(`${base}/${target}`).set("Authorization", `Bearer ${auth}`).send(data as object);

  beforeAll(async () => {
    const organizations = await Organization.create([
      { name: "RCA security", slug: `rca-security-${oid()}` },
      { name: "Other RCA tenant", slug: `rca-other-${oid()}` },
    ]);
    [org, otherOrg] = organizations.map(item => String(item._id));
    const users = await AuthUser.create([
      { role: "admin" as const, organizationId: org, isActive: true },
      { role: "employee" as const, organizationId: org, isActive: true },
      { role: "admin" as const, organizationId: org, isActive: false },
      { role: "admin" as const, organizationId: otherOrg, isActive: true },
    ].map((user, index) => ({ ...user, name: `RCA user ${index}`, email: `${oid()}@example.test`, password: "unused-test-hash", isEmailVerified: true })));
    [admin, employee, inactive, foreignAdmin] = users.map(user => String(user._id));
    const sign = (userId: string, role: string, organizationId: string) => jwt.sign({ id: userId, role, organizationId }, process.env.JWT_SECRET!, { expiresIn: "1h" });
    token = sign(admin, "admin", org);
    employeeToken = sign(employee, "employee", org);
    foreignToken = sign(foreignAdmin, "admin", otherOrg);
  });

  beforeEach(async () => {
    const p = await Problem.create({ problemId: oid(), title: "Problem", description: "Recurring issue", priority: "High", impact: "High", urgency: "High", reportedBy: admin, organizationId: org });
    problem = String(p._id);
    const i = await Incident.create({ incidentId: oid(), title: "Incident", description: "Service issue", priority: "High", severity: "Major", reportedBy: admin, organizationId: org });
    incident = String(i._id);
    const rca = await RCA.create({ ...body(), identifiedBy: admin, organizationId: org, relatedIncidents: [incident], contributingFactors: ["factor"], correctiveActions: ["repair"], preventiveActions: ["prevent"], lessonsLearned: ["lesson"] });
    id = String(rca._id);
    const action = await Action.create({ ...actionBody(), rca: id, createdBy: admin, organizationId: org });
    actionId = String(action._id);
  });

  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    if (!org) return;
    for (const model of [Action, RCA, Incident, Problem, AuthUser] as mongoose.Model<any>[]) {
      await model.deleteMany({ organizationId: { $in: [org, otherOrg] } });
    }
    await Organization.deleteMany({ _id: { $in: [org, otherOrg] } });
  });

  test.each(["organizationId", "rcaId", "identifiedBy", "createdAt", "updatedAt", "_id", "__v", "mutationLock", "approvedBy", "relatedIncidents.0", "organizationId.anything", "$set"])("rejects protected/dotted field %s", async field => {
    const response = await update({ [field]: otherOrg });
    expect(response.status).toBe(400);
    expect(response.body.message).toContain("Unsupported or protected field");
    expect(String((await RCA.findById(id))!.organizationId)).toBe(org);
  });

  test.each(["contributingFactors", "correctiveActions", "preventiveActions", "lessonsLearned", "relatedIncidents"])("clears %s with []", async field => {
    const response = await update({ [field]: [] });
    expect(response.status).toBe(200);
    expect(response.body.data[field]).toEqual([]);
    expect((await RCA.findById(id))!.get(field)).toEqual([]);
  });

  const invalidInputs = [
    { rootCause: null }, { rootCause: 1 }, { rootCause: " " }, { investigation: {} }, { investigation: "" },
    { problem: [] }, { problem: "invalid" }, { status: null }, { status: [] }, { status: "Unknown" },
    ...["contributingFactors", "correctiveActions", "preventiveActions", "lessonsLearned", "relatedIncidents"].flatMap(field => [
      { [field]: null }, { [field]: "text" }, { [field]: [1] }, { [field]: [{}] },
    ]),
    { relatedIncidents: ["invalid"] },
  ];
  test.each(invalidInputs)("rejects malformed update %j", async data => {
    const response = await update(data);
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).not.toMatch(/TypeError|is not a function|Cannot read/);
  });
  test.each(invalidInputs)("rejects malformed create %j", async data => {
    const response = await request(app).post(base).set("Authorization", `Bearer ${token}`).send({ ...body(), ...data });
    expect(response.status).toBe(400);
    expect(response.body.message).not.toMatch(/TypeError|is not a function|Cannot read/);
  });
  test("rejects array request bodies", async () => {
    expect((await update([])).status).toBe(400);
    expect((await request(app).post(base).set("Authorization", `Bearer ${token}`).send([])).status).toBe(400);
  });
  test.each(["null", "42", '"text"', "{"])("returns clean JSON errors for invalid body %s", async raw => {
    for (const [method, path] of [["post", base], ["put", `${base}/${id}`], ["post", `${base}/${id}/corrective-actions`], ["put", `${base}/${id}/corrective-actions/${actionId}`]] as const) {
      const response = await request(app)[method](path).set("Authorization", `Bearer ${token}`).set("Content-Type", "application/json").send(raw);
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ success: false, message: "Request body must be a valid JSON object" });
    }
  });
  test("create derives tenant, defaults identifier, and starts Draft", async () => {
    await RCA.deleteOne({ _id: id });
    const response = await request(app).post(base).set("Authorization", `Bearer ${token}`).send({ ...body(), organizationId: otherOrg });
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ organizationId: org, identifiedBy: admin, status: "Draft" });
  });

  test.each(["invalid", "employee", "inactive", "foreign", "missing"])("rejects %s action assignee on create/update", async kind => {
    const assignedTo = { invalid: "invalid", employee, inactive, foreign: foreignAdmin, missing: oid() }[kind];
    expect((await request(app).post(`${base}/${id}/corrective-actions`).set("Authorization", `Bearer ${token}`).send({ ...actionBody(), assignedTo })).status).toBe(400);
    expect((await request(app).put(`${base}/${id}/corrective-actions/${actionId}`).set("Authorization", `Bearer ${token}`).send({ assignedTo })).status).toBe(400);
    expect(String((await Action.findById(actionId))!.assignedTo)).toBe(admin);
  });
  test("accepts an active same-tenant ADMIN assignee", async () => {
    const response = await request(app).post(`${base}/${id}/corrective-actions`).set("Authorization", `Bearer ${token}`).send(actionBody());
    expect(response.status).toBe(201);
    expect(response.body.data.assignedTo).toMatchObject({ _id: admin, role: "admin" });
    expect((await request(app).put(`${base}/${id}/corrective-actions/${actionId}`).set("Authorization", `Bearer ${token}`).send({ assignedTo: admin })).status).toBe(200);
  });
  test.each([{ title: null }, { description: 4 }, { assignedTo: {} }, { dueDate: null }, { dueDate: 0 }, { dueDate: [] }, { dueDate: "invalid" }])("rejects malformed action data %j", async data => {
    expect((await request(app).post(`${base}/${id}/corrective-actions`).set("Authorization", `Bearer ${token}`).send({ ...actionBody(), ...data })).status).toBe(400);
    expect((await request(app).put(`${base}/${id}/corrective-actions/${actionId}`).set("Authorization", `Bearer ${token}`).send(data)).status).toBe(400);
  });

  const statuses: RCAStatus[] = ["Draft", "Under Investigation", "Completed", "Approved"];
  const allowed: Record<RCAStatus, RCAStatus[]> = {
    Draft: ["Draft", "Under Investigation", "Completed"],
    "Under Investigation": ["Under Investigation", "Draft", "Completed"],
    Completed: ["Completed", "Under Investigation", "Approved"], Approved: [],
  };
  test.each(statuses.flatMap(from => statuses.map(to => [from, to] as const)))("transition %s -> %s", async (from, to) => {
    await RCA.updateOne({ _id: id }, { $set: { status: from } });
    const response = await update({ status: to });
    expect(response.status).toBe(allowed[from].includes(to) ? 200 : 400);
    expect((await RCA.findById(id))!.status).toBe(allowed[from].includes(to) ? to : from);
  });
  test.each(["Completed", "Approved"])("requires nonblank stored completion data for %s", async status => {
    await RCA.updateOne({ _id: id }, { $set: { status: "Completed", rootCause: " " } });
    expect((await update({ status })).status).toBe(400);
  });
  test("Approved blocks RCA and all child mutations", async () => {
    await RCA.updateOne({ _id: id }, { status: "Approved" });
    expect((await update({ rootCause: "Changed" })).status).toBe(400);
    expect((await request(app).delete(`${base}/${id}`).set("Authorization", `Bearer ${token}`)).status).toBe(400);
    expect((await request(app).post(`${base}/${id}/corrective-actions`).set("Authorization", `Bearer ${token}`).send(actionBody())).status).toBe(400);
    expect((await request(app).put(`${base}/${id}/corrective-actions/${actionId}`).set("Authorization", `Bearer ${token}`).send({ title: "Changed" })).status).toBe(400);
    expect((await request(app).delete(`${base}/${id}/corrective-actions/${actionId}`).set("Authorization", `Bearer ${token}`)).status).toBe(400);
    expect(await Action.exists({ _id: actionId })).toBeTruthy();
  });
  test("completedAt is set, preserved, explicitly cleared, and set on recompletion", async () => {
    const put = (status: string) => request(app).put(`${base}/${id}/corrective-actions/${actionId}`).set("Authorization", `Bearer ${token}`).send({ status });
    expect((await put("Completed")).body.data.completedAt).toBeTruthy();
    const historical = new Date("2020-01-01T00:00:00Z");
    await Action.updateOne({ _id: actionId }, { completedAt: historical });
    expect((await put("Completed")).body.data.completedAt).toBe(historical.toISOString());
    for (const status of ["Pending", "In Progress", "Cancelled"]) {
      expect((await put(status)).status).toBe(200);
      expect((await Action.findById(actionId))!.completedAt).toBeUndefined();
      expect((await put("Completed")).body.data.completedAt).not.toBe(historical.toISOString());
    }
  });
  test("deletion removes children and parent without exposing the lock", async () => {
    const response = await request(app).delete(`${base}/${id}`).set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.data.mutationLock).toBeUndefined();
    expect(await RCA.exists({ _id: id })).toBeNull();
    expect(await Action.countDocuments({ rca: id })).toBe(0);
  });
  test("failed child cleanup retains parent and releases lock for retry", async () => {
    jest.spyOn(Action, "deleteMany").mockRejectedValueOnce(new Error("Cleanup failed"));
    expect((await request(app).delete(`${base}/${id}`).set("Authorization", `Bearer ${token}`)).status).toBe(400);
    expect(await RCA.exists({ _id: id })).toBeTruthy();
    expect(await Action.exists({ _id: actionId })).toBeTruthy();
    expect((await update({ rootCause: "Retry succeeds" })).status).toBe(200);
  });
  test("failed parent deletion leaves no orphan children and can be retried", async () => {
    jest.spyOn(RCA, "findOneAndDelete").mockRejectedValueOnce(new Error("Parent delete failed"));
    expect((await request(app).delete(`${base}/${id}`).set("Authorization", `Bearer ${token}`)).status).toBe(400);
    expect(await RCA.exists({ _id: id })).toBeTruthy();
    expect(await Action.countDocuments({ rca: id })).toBe(0);
    expect((await request(app).delete(`${base}/${id}`).set("Authorization", `Bearer ${token}`)).status).toBe(200);
  });
  test("shared lock blocks concurrent approval, child writes and parent deletion", async () => {
    await RCA.updateOne({ _id: id }, { status: "Completed" });
    await withRCAMutation(id, org, async () => {
      const responses = await Promise.all([
        update({ status: "Approved" }),
        request(app).post(`${base}/${id}/corrective-actions`).set("Authorization", `Bearer ${token}`).send(actionBody()),
        request(app).put(`${base}/${id}/corrective-actions/${actionId}`).set("Authorization", `Bearer ${token}`).send({ status: "Completed" }),
        request(app).delete(`${base}/${id}`).set("Authorization", `Bearer ${token}`),
      ]);
      expect(responses.map(response => response.status)).toEqual([400, 400, 400, 400]);
    });
    expect((await update({ status: "Approved" })).status).toBe(200);
  });

  test("tenant isolation for list/detail/by-problem/update/delete and actions", async () => {
    const auth = { Authorization: `Bearer ${foreignToken}` };
    expect((await request(app).get(base).set(auth)).body.data).toEqual([]);
    expect((await request(app).get(`${base}/${id}`).set(auth)).status).toBe(404);
    expect((await request(app).get(`${base}/problem/${problem}`).set(auth)).status).toBe(404);
    expect((await update({ rootCause: "Intrusion" }, foreignToken)).status).toBe(400);
    expect((await request(app).delete(`${base}/${id}`).set(auth)).status).toBe(404);
    for (const suffix of ["corrective-actions", `corrective-actions/${actionId}`]) {
      expect((await request(app).get(`${base}/${id}/${suffix}`).set(auth)).status).toBe(400);
    }
    expect((await request(app).put(`${base}/${id}/corrective-actions/${actionId}`).set(auth).send({ title: "Intrusion" })).status).toBe(400);
    expect((await request(app).delete(`${base}/${id}/corrective-actions/${actionId}`).set(auth)).status).toBe(400);
    expect(await Action.exists({ _id: actionId })).toBeTruthy();
    expect((await RCA.findById(id))!.rootCause).toBe("Root cause");
  });
  test("cross-tenant relationships are rejected and stale populations are hidden", async () => {
    await Problem.updateOne({ _id: problem }, { organizationId: otherOrg });
    await Incident.updateOne({ _id: incident }, { organizationId: otherOrg });
    expect((await update({ problem })).status).toBe(400);
    expect((await update({ relatedIncidents: [incident] })).status).toBe(400);
    await RCA.updateOne({ _id: id }, { identifiedBy: foreignAdmin });
    await Action.updateOne({ _id: actionId }, { assignedTo: foreignAdmin, createdBy: foreignAdmin });
    for (const path of [`${base}/${id}`, `${base}/problem/${problem}`]) {
      const response = await request(app).get(path).set("Authorization", `Bearer ${token}`);
      expect(response.body.data).toMatchObject({ problem: null, identifiedBy: null, relatedIncidents: [] });
    }
    const list = await request(app).get(base).set("Authorization", `Bearer ${token}`);
    expect(list.body.data.find((rca: any) => rca._id === id)).toMatchObject({ problem: null, identifiedBy: null, relatedIncidents: [] });
    const action = await request(app).get(`${base}/${id}/corrective-actions/${actionId}`).set("Authorization", `Bearer ${token}`);
    expect(action.body.data).toMatchObject({ assignedTo: null, createdBy: null });
  });
  test.each(["wrong parent", "wrong tenant"])("child queries reject a record with %s", async mismatch => {
    await Action.updateOne({ _id: actionId }, mismatch === "wrong parent" ? { rca: oid() } : { organizationId: otherOrg });
    const path = `${base}/${id}/corrective-actions`;
    const auth = { Authorization: `Bearer ${token}` };
    expect((await request(app).get(path).set(auth)).body.data).toEqual([]);
    expect((await request(app).get(`${path}/${actionId}`).set(auth)).status).toBe(404);
    expect((await request(app).put(`${path}/${actionId}`).set(auth).send({ title: "Intrusion" })).status).toBe(404);
    expect((await request(app).delete(`${path}/${actionId}`).set(auth)).status).toBe(404);
    expect((await Action.findById(actionId))!.title).toBe("Repair");
  });
  test("EMPLOYEE reads but cannot mutate; unauthenticated requests fail", async () => {
    const paths = [base, `${base}/${id}`, `${base}/problem/${problem}`, `${base}/${id}/corrective-actions`, `${base}/${id}/corrective-actions/${actionId}`];
    for (const path of paths) {
      expect((await request(app).get(path).set("Authorization", `Bearer ${employeeToken}`)).status).toBe(200);
      expect((await request(app).get(path)).status).toBe(401);
    }
    for (const [method, path] of [["post", base], ["put", `${base}/${id}`], ["delete", `${base}/${id}`], ["post", `${base}/${id}/corrective-actions`], ["put", `${base}/${id}/corrective-actions/${actionId}`], ["delete", `${base}/${id}/corrective-actions/${actionId}`]] as const) {
      expect((await request(app)[method](path).set("Authorization", `Bearer ${employeeToken}`).send({ status: "Approved" })).status).toBe(403);
      expect((await request(app)[method](path).send({})).status).toBe(401);
    }
  });
});
