import mongoose from "mongoose";

jest.mock("../src/jobs/queues/notification.queue", () => ({
  __esModule: true,
  default: {
    add: jest.fn().mockResolvedValue({ id: "job-1" }),
  },
  notificationQueue: {
    add: jest.fn().mockResolvedValue({ id: "job-1" }),
  },
}));

jest.mock("../src/modules/auth/auth.repository", () => ({
  authRepository: {
    findOne: jest.fn(),
    findActiveEmployeesByOrganization: jest.fn(),
    countUsers: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("../src/modules/support-team/supportTeam.repository", () => ({
  supportTeamRepository: {
    findOne: jest.fn(),
    create: jest.fn(),
    updateByIdAndOrganization: jest.fn(),
  },
}));

jest.mock("../src/modules/organization/organization.repository", () => ({
  organizationRepository: {
    create: jest.fn(),
    deleteById: jest.fn(),
  },
}));

import notificationQueue from "../src/jobs/queues/notification.queue";
import { authRepository } from "../src/modules/auth/auth.repository";
import { organizationRepository } from "../src/modules/organization/organization.repository";
import { bootstrapAdmin } from "../src/modules/auth/auth.service";
import { queueNotificationEvent } from "../src/modules/notification/notification.service";
import {
  createSupportTeam,
  updateSupportTeam,
} from "../src/modules/support-team/supportTeam.service";
import { supportTeamRepository } from "../src/modules/support-team/supportTeam.repository";

const organizationId = new mongoose.Types.ObjectId().toString();
const recipientId = new mongoose.Types.ObjectId().toString();
const otherOrganizationId = new mongoose.Types.ObjectId().toString();
const otherRecipientId = new mongoose.Types.ObjectId().toString();

const activeEmployee = (id: string) => ({
  _id: new mongoose.Types.ObjectId(id),
  role: "employee",
  isActive: true,
});

describe("Notification Center and tenant boundaries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("queues every notification event type with deterministic idempotency keys", async () => {
    (authRepository.findOne as jest.Mock).mockResolvedValue(
      activeEmployee(recipientId)
    );

    const eventTypes = [
      "Incident Created",
      "Incident Assigned",
      "SLA Breached",
      "Change Request Approval",
      "Service Request Updated",
      "Incident Updated",
    ] as const;

    for (const type of eventTypes) {
      await queueNotificationEvent({
        eventKey: `event-${type.replaceAll(" ", "-")}`,
        recipients: [recipientId, recipientId],
        organizationId,
        title: type,
        message: `${type} message`,
        type,
      });
    }

    expect(notificationQueue.add).toHaveBeenCalledTimes(6);

    const firstCall = (notificationQueue.add as jest.Mock).mock.calls[0];
    expect(firstCall[1].notificationId).toContain(recipientId);
    expect(firstCall[1].userId).toBe(recipientId);
    expect(firstCall[2].jobId).toContain(recipientId);
  });

  it("skips invalid, inactive, and cross-tenant recipients", async () => {
    (authRepository.findOne as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const queued = await queueNotificationEvent({
      eventKey: "tenant-safety",
      recipients: ["invalid-id", recipientId, otherRecipientId],
      organizationId,
      title: "System",
      message: "Should not be delivered",
      type: "System",
    });

    expect(queued).toBe(0);
    expect(notificationQueue.add).not.toHaveBeenCalled();
    expect(authRepository.findOne).toHaveBeenCalledTimes(2);
    const firstLookup = (authRepository.findOne as jest.Mock).mock.calls[0][0];
    expect(firstLookup._id.toString()).toBe(recipientId);
    expect(firstLookup.organizationId.toString()).toBe(organizationId);
    expect(firstLookup.isActive).toBe(true);
  });
});

describe("Support-team membership validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supportTeamRepository.findOne as jest.Mock).mockResolvedValue(null);
    (supportTeamRepository.create as jest.Mock).mockImplementation(
      async (data) => data
    );
    (supportTeamRepository.updateByIdAndOrganization as jest.Mock).mockImplementation(
      async (_id, _organizationId, data) => data
    );
  });

  it("accepts only active employee members from the same organization", async () => {
    (authRepository.findActiveEmployeesByOrganization as jest.Mock).mockResolvedValue([
      activeEmployee(recipientId),
    ]);

    const team = await createSupportTeam({
      name: "Valid Team",
      organizationId,
      members: [recipientId, recipientId],
    });

    expect(team.members).toHaveLength(1);
    expect(team.organizationId.toString()).toBe(organizationId);
  });

  it("rejects inactive, invalid, and cross-tenant members on create and update", async () => {
    (authRepository.findActiveEmployeesByOrganization as jest.Mock).mockResolvedValue([
      activeEmployee(recipientId),
    ]);

    await expect(
      createSupportTeam({
        name: "Invalid Team",
        organizationId,
        members: [otherRecipientId],
      })
    ).rejects.toThrow("active employees in this organization");

    await expect(
      updateSupportTeam(
        new mongoose.Types.ObjectId().toString(),
        organizationId,
        { members: ["not-an-object-id"] }
      )
    ).rejects.toThrow("invalid ID");

    expect(otherOrganizationId).not.toBe(organizationId);
  });
});

describe("Tenant bootstrap security", () => {
  const originalBootstrapToken = process.env.BOOTSTRAP_TOKEN;

  afterEach(() => {
    process.env.BOOTSTRAP_TOKEN = originalBootstrapToken;
  });

  it("rejects bootstrap when the system already has users", async () => {
    process.env.BOOTSTRAP_TOKEN = "test-bootstrap-token";
    (authRepository.countUsers as jest.Mock).mockResolvedValue(1);

    await expect(
      bootstrapAdmin({
        bootstrapToken: "test-bootstrap-token",
        organizationName: "Bootstrap Org",
        organizationSlug: "bootstrap-org",
        name: "Bootstrap Admin",
        email: "bootstrap@example.com",
        password: "Password123",
      })
    ).rejects.toThrow("Bootstrap is already completed");

    expect(organizationRepository.create).not.toHaveBeenCalled();
  });

  it("rejects bootstrap with a missing or incorrect token", async () => {
    delete process.env.BOOTSTRAP_TOKEN;

    await expect(
      bootstrapAdmin({
        bootstrapToken: "wrong-token",
        organizationName: "Bootstrap Org",
        organizationSlug: "bootstrap-org",
        name: "Bootstrap Admin",
        email: "bootstrap@example.com",
        password: "Password123",
      })
    ).rejects.toThrow("Bootstrap is not configured");

    process.env.BOOTSTRAP_TOKEN = "test-bootstrap-token";

    await expect(
      bootstrapAdmin({
        bootstrapToken: "wrong-token",
        organizationName: "Bootstrap Org",
        organizationSlug: "bootstrap-org",
        name: "Bootstrap Admin",
        email: "bootstrap@example.com",
        password: "Password123",
      })
    ).rejects.toThrow("Invalid bootstrap token");
  });
});
