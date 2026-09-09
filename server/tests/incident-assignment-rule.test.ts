
import request from "supertest";
import mongoose from "mongoose";

import app from "../src/app";
import { connectDB } from "../src/config/db";

import IncidentAssignmentRule from "../src/modules/incident-assignment/incidentAssignmentRule.model";
import Incident from "../src/modules/incident/incident.model";
import AuthUser from "../src/modules/auth/auth.model";
import Organization from "../src/modules/organization/organization.model";
import SupportTeam from "../src/modules/support-team/supportTeam.model";
import { createTestUser } from "./test-fixtures";

// =====================================================
// JEST TIMEOUT
// =====================================================

jest.setTimeout(30000);

describe("Incident Assignment Rule Integration Tests", () => {
  // =====================================================
  // TEST VARIABLES
  // =====================================================

  let adminToken!: string;
  let employeeToken!: string;

  let organizationId!: string;
  let employeeId!: string;
  let supportAdminId!: string;
  let unassignedAdminId!: string;
  let inactiveAdminId!: string;
  let otherAdminId!: string;
  let otherOrganizationId!: string;
  let supportTeamId!: string;
  const createdUserIds: string[] = [];

  let createdRuleId!: string;
  let createdIncidentId!: string;

  // =====================================================
  // TEST USERS
  // =====================================================

  const ADMIN_EMAIL = "aliya.admin@example.com";
  const ADMIN_PASSWORD = "Admin@123";

  const EMPLOYEE_EMAIL = "employee.test@example.com";
  const EMPLOYEE_PASSWORD = "Employee@123";

  // =====================================================
  // BEFORE ALL
  // =====================================================

  beforeAll(async () => {
    // -----------------------------------------------------
    // CONNECT DATABASE
    // -----------------------------------------------------

    await connectDB();

    // -----------------------------------------------------
    // ADMIN LOGIN
    // -----------------------------------------------------

    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      });

    console.log(
      "ADMIN LOGIN STATUS:",
      adminLogin.status
    );

    console.log(
      "ADMIN LOGIN RESPONSE:",
      adminLogin.body
    );

    expect(adminLogin.status).toBe(200);
    expect(adminLogin.body.success).toBe(true);

    expect(adminLogin.body.data).toBeDefined();
    expect(adminLogin.body.data.token).toBeDefined();
    expect(adminLogin.body.data.user).toBeDefined();

    adminToken = adminLogin.body.data.token;

    organizationId =
      adminLogin.body.data.user.organizationId;

    expect(organizationId).toBeDefined();

    // -----------------------------------------------------
    // EMPLOYEE LOGIN
    // -----------------------------------------------------

    const employeeLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: EMPLOYEE_EMAIL,
        password: EMPLOYEE_PASSWORD,
      });

    console.log(
      "EMPLOYEE LOGIN STATUS:",
      employeeLogin.status
    );

    console.log(
      "EMPLOYEE LOGIN RESPONSE:",
      employeeLogin.body
    );

    expect(employeeLogin.status).toBe(200);
    expect(employeeLogin.body.success).toBe(true);

    expect(employeeLogin.body.data).toBeDefined();
    expect(employeeLogin.body.data.token).toBeDefined();
    expect(employeeLogin.body.data.user).toBeDefined();

    employeeToken =
      employeeLogin.body.data.token;

    employeeId =
      employeeLogin.body.data.user.id ||
      employeeLogin.body.data.user._id;

    expect(employeeId).toBeDefined();

    // -----------------------------------------------------
    // VERIFY SAME ORGANIZATION
    // -----------------------------------------------------

    const employeeOrganizationId =
      employeeLogin.body.data.user.organizationId;

    expect(employeeOrganizationId).toBe(
      organizationId
    );

    const suffix = Date.now();
    const supportAdmin = await createTestUser({
      name: "Assignment Rule Support Admin",
      email: `assignment-rule-support-${suffix}@example.com`,
      password: "AssignmentRuleSupport123!",
      role: "admin",
      organizationId,
    });
    supportAdminId = supportAdmin._id.toString();
    createdUserIds.push(supportAdminId);

    const supportTeam = await SupportTeam.create({
      name: `Assignment Rule Support Team ${suffix}`,
      organizationId,
      members: [supportAdminId],
      isActive: true,
    });
    supportTeamId = supportTeam._id.toString();

    const unassignedAdmin = await createTestUser({
      name: "Assignment Rule Unassigned Admin",
      email: `assignment-rule-unassigned-${suffix}@example.com`,
      password: "AssignmentRuleUnassigned123!",
      role: "admin",
      organizationId,
    });
    unassignedAdminId = unassignedAdmin._id.toString();
    createdUserIds.push(unassignedAdminId);

    const inactiveAdmin = await createTestUser({
      name: "Assignment Rule Inactive Admin",
      email: `assignment-rule-inactive-${suffix}@example.com`,
      password: "AssignmentRuleInactive123!",
      role: "admin",
      organizationId,
    });
    inactiveAdminId = inactiveAdmin._id.toString();
    createdUserIds.push(inactiveAdminId);
    await AuthUser.findByIdAndUpdate(inactiveAdminId, { isActive: false });

    const otherOrganization = await Organization.create({
      name: `Assignment Rule Other Organization ${suffix}`,
      slug: `assignment-rule-other-${suffix}`,
      isActive: true,
    });
    otherOrganizationId = otherOrganization._id.toString();
    const otherAdmin = await createTestUser({
      name: "Assignment Rule Other Admin",
      email: `assignment-rule-other-admin-${suffix}@example.com`,
      password: "AssignmentRuleOther123!",
      role: "admin",
      organizationId: otherOrganizationId,
    });
    otherAdminId = otherAdmin._id.toString();
    createdUserIds.push(otherAdminId);

    // -----------------------------------------------------
    // LOG TEST SETUP
    // -----------------------------------------------------

    console.log(
      "=========================================="
    );

    console.log(
      "INCIDENT ASSIGNMENT RULE TEST SETUP"
    );

    console.log(
      "Organization:",
      organizationId
    );

    console.log(
      "Employee:",
      employeeId
    );

    console.log(
      "Admin token available:",
      Boolean(adminToken)
    );

    console.log(
      "Employee token available:",
      Boolean(employeeToken)
    );

    console.log(
      "=========================================="
    );
  });

  // =====================================================
  // AFTER ALL
  // =====================================================

  afterAll(async () => {
    try {
      // ---------------------------------------------------
      // DELETE CREATED INCIDENT
      // ---------------------------------------------------

      if (createdIncidentId) {
        await Incident.deleteOne({
          _id: createdIncidentId,
        });
      }

      // ---------------------------------------------------
      // DELETE CREATED RULE
      // ---------------------------------------------------

      if (createdRuleId) {
        await IncidentAssignmentRule.deleteOne({
          _id: createdRuleId,
        });
      }

      if (supportTeamId) {
        await SupportTeam.deleteOne({ _id: supportTeamId });
      }
      await AuthUser.deleteMany({ _id: { $in: createdUserIds } });
      await Organization.deleteOne({ _id: otherOrganizationId });

      console.log(
        "Incident assignment rule test cleanup completed."
      );
    } catch (error) {
      console.error(
        "Incident assignment rule cleanup failed:",
        error
      );
    }

    // -----------------------------------------------------
    // CLOSE DATABASE
    // -----------------------------------------------------

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }

    console.log(
      "Incident assignment rule MongoDB connection closed."
    );
  });

  // =====================================================
  // CREATE ASSIGNMENT RULE
  // =====================================================

  it(
    "should create an incident assignment rule",
    async () => {
      const ruleName =
        `Automatic High Priority Rule ${Date.now()}`;

      const response = await request(app)
        .post(
          "/api/v1/incident-assignment-rules"
        )
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        )
        .send({
          name: ruleName,

          description:
            "Automatically assigns high priority incidents",

          ruleOrder: 1,

          incidentPriority: "High",

          severity: "Major",

          targetUser: supportAdminId,
        });

      console.log(
        "CREATE ASSIGNMENT RULE RESPONSE:",
        response.body
      );

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toBeDefined();

      expect(
        response.body.data._id
      ).toBeDefined();

      expect(
        response.body.data.name
      ).toBe(ruleName);

      expect(
        response.body.data.ruleOrder
      ).toBe(1);

      expect(
        response.body.data.incidentPriority
      ).toBe("High");

      expect(
        response.body.data.severity
      ).toBe("Major");

      expect(
        response.body.data.targetUser
      ).toBeDefined();

      createdRuleId =
        response.body.data._id;
    }
  );

  // =====================================================
  // UNAUTHENTICATED CREATION
  // =====================================================

  it(
    "should reject unauthenticated rule creation",
    async () => {
      const response = await request(app)
        .post(
          "/api/v1/incident-assignment-rules"
        )
        .send({
          name:
            `Unauthorized Rule ${Date.now()}`,

          ruleOrder: 1,

          incidentPriority: "High",

          severity: "Major",

          targetUser: employeeId,
        });

      expect(response.status).toBe(401);

      expect(
        response.body.success
      ).toBe(false);
    }
  );

  // =====================================================
  // NON-ADMIN CREATION
  // =====================================================

  it(
    "should reject assignment rule creation by a non-admin user",
    async () => {
      const response = await request(app)
        .post(
          "/api/v1/incident-assignment-rules"
        )
        .set(
          "Authorization",
          `Bearer ${employeeToken}`
        )
        .send({
          name:
            `Employee Rule ${Date.now()}`,

          ruleOrder: 1,

          incidentPriority: "High",

          severity: "Major",

          targetUser: employeeId,
        });

      expect(response.status).toBe(403);

      expect(
        response.body.success
      ).toBe(false);
    }
  );

  // =====================================================
  // INVALID TARGET USER
  // =====================================================

  it(
    "should reject an invalid target employee",
    async () => {
      const fakeUserId =
        new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .post(
          "/api/v1/incident-assignment-rules"
        )
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        )
        .send({
          name:
            `Invalid Target ${Date.now()}`,

          ruleOrder: 1,

          incidentPriority: "High",

          severity: "Major",

          targetUser: fakeUserId,
        });

      expect(response.status).toBe(400);

      expect(
        response.body.success
      ).toBe(false);
    }
  );

  // =====================================================
  it("rejects employee, unassigned admin, inactive admin, and cross-tenant admin rule targets", async () => {
    for (const targetUser of [
      employeeId,
      unassignedAdminId,
      inactiveAdminId,
      otherAdminId,
    ]) {
      const response = await request(app)
        .post("/api/v1/incident-assignment-rules")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: `Ineligible Assignment Rule ${targetUser}`,
          ruleOrder: Math.floor(Math.random() * 100000) + 100,
          incidentPriority: "Low",
          severity: "Minor",
          targetUser,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "Target user must be an eligible operational assignee"
      );
    }
  });

  // INVALID RULE ORDER
  // =====================================================

  it(
    "should reject an invalid rule order",
    async () => {
      const response = await request(app)
        .post(
          "/api/v1/incident-assignment-rules"
        )
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        )
        .send({
          name:
            `Invalid Order ${Date.now()}`,

          ruleOrder: 0,

          incidentPriority: "High",

          severity: "Major",

          targetUser: employeeId,
        });

      expect(response.status).toBe(400);

      expect(
        response.body.success
      ).toBe(false);
    }
  );

  // =====================================================
  // GET ALL RULES
  // =====================================================

  it(
    "should get assignment rules for the organization",
    async () => {
      const response = await request(app)
        .get(
          "/api/v1/incident-assignment-rules"
        )
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        );

      console.log(
        "GET ASSIGNMENT RULES RESPONSE:",
        response.body
      );

      expect(response.status).toBe(200);

      expect(
        response.body.success
      ).toBe(true);

      expect(
        Array.isArray(
          response.body.data
        )
      ).toBe(true);

      expect(
        response.body.data.length
      ).toBeGreaterThan(0);
    }
  );

  // =====================================================
  // GET RULE BY ID
  // =====================================================

  it(
    "should get an assignment rule by ID",
    async () => {
      const response = await request(app)
        .get(
          `/api/v1/incident-assignment-rules/${createdRuleId}`
        )
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        );

      expect(response.status).toBe(200);

      expect(
        response.body.success
      ).toBe(true);

      expect(
        response.body.data._id
      ).toBe(createdRuleId);
    }
  );

  // =====================================================
  // UPDATE RULE
  // =====================================================

  it(
    "should update an assignment rule",
    async () => {
      const response = await request(app)
        .put(
          `/api/v1/incident-assignment-rules/${createdRuleId}`
        )
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        )
        .send({
          description:
            "Updated assignment rule",

          ruleOrder: 2,
        });

      console.log(
        "UPDATE ASSIGNMENT RULE RESPONSE:",
        response.body
      );

      expect(response.status).toBe(200);

      expect(
        response.body.success
      ).toBe(true);

      expect(
        response.body.data.description
      ).toBe(
        "Updated assignment rule"
      );

      expect(
        response.body.data.ruleOrder
      ).toBe(2);
    }
  );

  // =====================================================
  // NON-ADMIN UPDATE
  // =====================================================

  it(
    "should reject assignment rule update by a non-admin user",
    async () => {
      const response = await request(app)
        .put(
          `/api/v1/incident-assignment-rules/${createdRuleId}`
        )
        .set(
          "Authorization",
          `Bearer ${employeeToken}`
        )
        .send({
          description:
            "Unauthorized update",
        });

      expect(response.status).toBe(403);

      expect(
        response.body.success
      ).toBe(false);
    }
  );

  it("rejects an ineligible target when updating an assignment rule", async () => {
    const response = await request(app)
      .put(`/api/v1/incident-assignment-rules/${createdRuleId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ targetUser: employeeId });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Target user must be an eligible operational assignee"
    );
  });

  // =====================================================
  // DEACTIVATE RULE
  // =====================================================

  it(
    "should deactivate an assignment rule",
    async () => {
      const response = await request(app)
        .put(
          `/api/v1/incident-assignment-rules/${createdRuleId}`
        )
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        )
        .send({
          isActive: false,
        });

      expect(response.status).toBe(200);

      expect(
        response.body.success
      ).toBe(true);

      expect(
        response.body.data.isActive
      ).toBe(false);
    }
  );

  // =====================================================
  // REACTIVATE RULE
  // =====================================================

  it(
    "should reactivate an assignment rule",
    async () => {
      const response = await request(app)
        .put(
          `/api/v1/incident-assignment-rules/${createdRuleId}`
        )
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        )
        .send({
          isActive: true,
        });

      expect(response.status).toBe(200);

      expect(
        response.body.success
      ).toBe(true);

      expect(
        response.body.data.isActive
      ).toBe(true);
    }
  );

  // =====================================================
  // APPLICABLE RULES
  // =====================================================

  it(
    "should return applicable assignment rules",
    async () => {
      const response = await request(app)
        .get(
          "/api/v1/incident-assignment-rules/applicable/High/Major"
        )
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        );

      console.log(
        "APPLICABLE ASSIGNMENT RULES RESPONSE:",
        response.body
      );

      expect(response.status).toBe(200);

      expect(
        response.body.success
      ).toBe(true);

      expect(
        Array.isArray(
          response.body.data
        )
      ).toBe(true);

      expect(
        response.body.data.length
      ).toBeGreaterThan(0);

      expect(
        response.body.data[0].incidentPriority
      ).toBe("High");

      expect(
        response.body.data[0].severity
      ).toBe("Major");
    }
  );

  // =====================================================
  // INCIDENT AUTO-ASSIGNMENT
  // =====================================================

  it(
    "should automatically assign a matching incident to the rule target user",
    async () => {
      const incidentId =
        `INC-ASSIGN-${Date.now()}`;

      const response = await request(app)
        .post("/api/v1/incidents")
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        )
        .send({
          incidentId,

          title:
            "High priority assignment test",

          description:
            "Testing automatic incident assignment",

          priority: "High",

          severity: "Major",
        });

      console.log(
        "AUTO ASSIGNMENT INCIDENT RESPONSE:",
        response.body
      );

      expect(response.status).toBe(201);

      expect(
        response.body.success
      ).toBe(true);

      expect(
        response.body.data
      ).toBeDefined();

      expect(
        response.body.data.assignedTo
      ).toBeDefined();

      createdIncidentId =
        response.body.data._id;

      const assignedUser =
        response.body.data.assignedTo;

      const assignedUserId =
        typeof assignedUser === "string"
          ? assignedUser
          : assignedUser._id;

      expect(
        assignedUserId.toString()
      ).toBe(
        supportAdminId.toString()
      );
    }
  );

  it("leaves an incident unassigned when a previously valid rule target becomes ineligible", async () => {
    await SupportTeam.findByIdAndUpdate(supportTeamId, { isActive: false });

    const response = await request(app)
      .post("/api/v1/incidents")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        incidentId: `INC-STALE-ASSIGN-${Date.now()}`,
        title: "Stale assignment target test",
        description: "The incident must not be assigned to an inactive team member.",
        priority: "High",
        severity: "Major",
      });

    expect(response.status).toBe(201);
    expect(response.body.data.assignedTo).toBeFalsy();
    await Incident.deleteOne({ _id: response.body.data._id });
  });

  // =====================================================
  // NON-ADMIN DELETE
  // =====================================================

  it(
    "should reject assignment rule deletion by a non-admin user",
    async () => {
      const response = await request(app)
        .delete(
          `/api/v1/incident-assignment-rules/${createdRuleId}`
        )
        .set(
          "Authorization",
          `Bearer ${employeeToken}`
        );

      expect(response.status).toBe(403);

      expect(
        response.body.success
      ).toBe(false);
    }
  );

  // =====================================================
  // DELETE RULE
  // =====================================================

  it(
    "should delete an assignment rule",
    async () => {
      const response = await request(app)
        .delete(
          `/api/v1/incident-assignment-rules/${createdRuleId}`
        )
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        );

      expect(response.status).toBe(200);

      expect(
        response.body.success
      ).toBe(true);
    }
  );
});
