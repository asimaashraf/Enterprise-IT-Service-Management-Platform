import request from "supertest";
import mongoose from "mongoose";

import app from "../src/app";
import Organization from "../src/modules/organization/organization.model";
import AuthUser from "../src/modules/auth/auth.model";
import Notification from "../src/modules/notification/notification.model";
import { notificationQueue } from "../src/jobs/queues/notification.queue";
import { createTestUser } from "./test-fixtures";

describe("Notification API authorization and tenant boundaries", () => {
  const primaryOrganizationId = new mongoose.Types.ObjectId();
  const foreignOrganizationId = new mongoose.Types.ObjectId();
  let adminId: mongoose.Types.ObjectId;
  let employeeId: mongoose.Types.ObjectId;
  let otherEmployeeId: mongoose.Types.ObjectId;
  let inactiveEmployeeId: mongoose.Types.ObjectId;
  let foreignEmployeeId: mongoose.Types.ObjectId;
  let adminToken: string;
  let employeeToken: string;
  let otherEmployeeToken: string;
  let foreignEmployeeToken: string;
  let sequence = 0;

  const login = async (email: string, password: string) => {
    const response = await request(app).post("/api/v1/auth/login").send({
      email,
      password,
    });
    expect(response.status).toBe(200);
    return response.body.data?.token ?? response.body.token;
  };

  const createNotification = async (
    recipient: mongoose.Types.ObjectId,
    organizationId = primaryOrganizationId,
    status: "Unread" | "Read" = "Unread"
  ) => {
    sequence += 1;
    return Notification.create({
      notificationId: `NOT-API-${Date.now()}-${sequence}`,
      recipient,
      organizationId,
      type: "System",
      title: "API notification",
      message: "Notification API test fixture",
      priority: "Medium",
      status,
      ...(status === "Read" ? { readAt: new Date() } : {}),
    });
  };

  beforeAll(async () => {
    await Organization.create([
      {
        _id: primaryOrganizationId,
        name: `Notification primary ${primaryOrganizationId}`,
        slug: `notification-primary-${primaryOrganizationId}`,
        isActive: true,
      },
      {
        _id: foreignOrganizationId,
        name: `Notification foreign ${foreignOrganizationId}`,
        slug: `notification-foreign-${foreignOrganizationId}`,
        isActive: true,
      },
    ]);

    const password = "NotificationTest123!";
    const makeUser = async (
      name: string,
      role: "admin" | "employee",
      organizationId = primaryOrganizationId
    ) => {
      const user = await createTestUser({
        name,
        email: `${new mongoose.Types.ObjectId()}@notifications.test`,
        password,
        role,
        organizationId: organizationId.toString(),
      });
      return { id: user._id as mongoose.Types.ObjectId, email: user.email };
    };

    const admin = await makeUser("Notification Admin", "admin");
    adminId = admin.id;
    adminToken = await login(admin.email, password);
    const employee = await makeUser("Notification Employee", "employee");
    employeeId = employee.id;
    employeeToken = await login(employee.email, password);
    const other = await makeUser("Notification Other", "employee");
    otherEmployeeId = other.id;
    otherEmployeeToken = await login(other.email, password);
    const inactive = await makeUser("Notification Inactive", "employee");
    inactiveEmployeeId = inactive.id;
    await AuthUser.updateOne({ _id: inactiveEmployeeId }, { $set: { isActive: false } });
    const foreign = await makeUser(
      "Notification Foreign",
      "employee",
      foreignOrganizationId
    );
    foreignEmployeeId = foreign.id;
    foreignEmployeeToken = await login(foreign.email, password);
  });

  beforeEach(async () => {
    await Notification.deleteMany({
      organizationId: { $in: [primaryOrganizationId, foreignOrganizationId] },
    });
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await Notification.deleteMany({
      organizationId: { $in: [primaryOrganizationId, foreignOrganizationId] },
    });
    await AuthUser.deleteMany({
      organizationId: { $in: [primaryOrganizationId, foreignOrganizationId] },
    });
    await Organization.deleteMany({
      _id: { $in: [primaryOrganizationId, foreignOrganizationId] },
    });
  });

  it("returns each ADMIN and EMPLOYEE only their own tenant feed and unread count", async () => {
    await createNotification(adminId);
    await createNotification(employeeId);
    await createNotification(otherEmployeeId);
    await createNotification(foreignEmployeeId, foreignOrganizationId);

    const [adminFeed, employeeFeed, adminCount, employeeCount] = await Promise.all([
      request(app).get("/api/v1/notifications").set("Authorization", `Bearer ${adminToken}`),
      request(app).get("/api/v1/notifications").set("Authorization", `Bearer ${employeeToken}`),
      request(app).get("/api/v1/notifications/unread-count").set("Authorization", `Bearer ${adminToken}`),
      request(app).get("/api/v1/notifications/unread-count").set("Authorization", `Bearer ${employeeToken}`),
    ]);

    expect(adminFeed.status).toBe(200);
    expect(adminFeed.body.count).toBe(1);
    expect(adminFeed.body.data[0].recipient._id).toBe(adminId.toString());
    expect(employeeFeed.status).toBe(200);
    expect(employeeFeed.body.count).toBe(1);
    expect(employeeFeed.body.data[0].recipient._id).toBe(employeeId.toString());
    expect(adminCount.body.data.unreadCount).toBe(1);
    expect(employeeCount.body.data.unreadCount).toBe(1);
  });

  it("marks one, marks all, and deletes only owned notifications", async () => {
    const first = await createNotification(employeeId);
    const second = await createNotification(employeeId);
    const third = await createNotification(employeeId, primaryOrganizationId, "Read");

    const markOne = await request(app)
      .patch(`/api/v1/notifications/${first._id}/read`)
      .set("Authorization", `Bearer ${employeeToken}`);
    expect(markOne.status).toBe(200);
    expect(markOne.body.data.status).toBe("Read");
    expect(markOne.body.data.readAt).toBeTruthy();

    const markAll = await request(app)
      .patch("/api/v1/notifications/read-all")
      .set("Authorization", `Bearer ${employeeToken}`);
    expect(markAll.status).toBe(200);
    expect(markAll.body.data.matchedCount).toBe(1);
    expect(markAll.body.data.modifiedCount).toBe(1);

    const deleted = await request(app)
      .delete(`/api/v1/notifications/${third._id}`)
      .set("Authorization", `Bearer ${employeeToken}`);
    expect(deleted.status).toBe(200);
    expect(await Notification.exists({ _id: third._id })).toBeNull();
    expect(await Notification.findById(second._id).lean()).toMatchObject({ status: "Read" });
  });

  it("rejects same-tenant and cross-tenant access to another user's notification", async () => {
    const sameTenant = await createNotification(employeeId);
    const foreign = await createNotification(foreignEmployeeId, foreignOrganizationId);

    for (const target of [sameTenant._id, foreign._id]) {
      const [get, patch, remove] = await Promise.all([
        request(app).get(`/api/v1/notifications/${target}`).set("Authorization", `Bearer ${otherEmployeeToken}`),
        request(app).patch(`/api/v1/notifications/${target}/read`).set("Authorization", `Bearer ${otherEmployeeToken}`),
        request(app).delete(`/api/v1/notifications/${target}`).set("Authorization", `Bearer ${otherEmployeeToken}`),
      ]);
      expect(get.status).toBe(404);
      expect(patch.status).toBe(404);
      expect(remove.status).toBe(404);
    }
  });

  it("restricts direct creation to ADMIN and scopes successful creation to the JWT tenant", async () => {
    const body = {
      recipient: employeeId.toString(),
      organizationId: foreignOrganizationId.toString(),
      type: "System",
      title: "Admin-created notification",
      message: "Scoped by JWT, never by request body.",
      priority: "High",
    };
    const employeeResponse = await request(app)
      .post("/api/v1/notifications")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send(body);
    expect(employeeResponse.status).toBe(403);

    const adminResponse = await request(app)
      .post("/api/v1/notifications")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(body);
    expect(adminResponse.status).toBe(201);
    expect(adminResponse.body.data.organizationId).toBe(primaryOrganizationId.toString());
    expect(adminResponse.body.data.recipient).toBe(employeeId.toString());
  });

  it("rejects inactive, foreign, and malformed direct notification recipients or payloads", async () => {
    const responses = await Promise.all([
      request(app).post("/api/v1/notifications").set("Authorization", `Bearer ${adminToken}`).send({
        recipient: inactiveEmployeeId.toString(), type: "System", title: "Inactive", message: "No delivery",
      }),
      request(app).post("/api/v1/notifications").set("Authorization", `Bearer ${adminToken}`).send({
        recipient: foreignEmployeeId.toString(), type: "System", title: "Foreign", message: "No delivery",
      }),
      request(app).post("/api/v1/notifications").set("Authorization", `Bearer ${adminToken}`).send({
        recipient: employeeId.toString(), type: "Not valid", title: "Malformed", message: "No delivery",
      }),
    ]);
    responses.forEach((response) => expect(response.status).toBe(400));
  });

  it("restricts the test notification job to ADMIN and derives its organization from JWT", async () => {
    const add = jest.spyOn(notificationQueue, "add");
    const body = {
      userId: employeeId.toString(),
      organizationId: foreignOrganizationId.toString(),
      title: "Scoped test notification",
      message: "The supplied organization is ignored.",
      type: "System",
    };
    const employeeResponse = await request(app)
      .post("/api/v1/jobs/test-notification")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send(body);
    expect(employeeResponse.status).toBe(403);

    const adminResponse = await request(app)
      .post("/api/v1/jobs/test-notification")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(body);
    expect(adminResponse.status).toBe(201);
    expect(add).toHaveBeenCalledWith(
      "notification-created",
      expect.objectContaining({
        userId: employeeId.toString(),
        organizationId: primaryOrganizationId.toString(),
      })
    );

    const foreignResponse = await request(app)
      .post("/api/v1/jobs/test-notification")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...body, userId: foreignEmployeeId.toString() });
    expect(foreignResponse.status).toBe(400);
  });

  it("keeps the foreign tenant's authenticated feed isolated", async () => {
    await createNotification(foreignEmployeeId, foreignOrganizationId);
    const response = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${foreignEmployeeToken}`);
    expect(response.status).toBe(200);
    expect(response.body.count).toBe(1);
    expect(response.body.data[0].organizationId).toBe(foreignOrganizationId.toString());
  });
});
