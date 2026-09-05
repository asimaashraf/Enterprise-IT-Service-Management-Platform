import request from "supertest";
import app from "../src/app";
import AuthUser from "../src/modules/auth/auth.model";
import Organization from "../src/modules/organization/organization.model";
import SupportTeam from "../src/modules/support-team/supportTeam.model";
import {
  connectDB,
  disconnectDB,
} from "../src/config/db";

jest.setTimeout(60000);

// ==========================================
// TEST DATA
// ==========================================

const ADMIN_EMAIL = "aliya.admin@example.com";
const ADMIN_PASSWORD = "Admin@123";

const EMPLOYEE_EMAIL = "employee.test@example.com";
const EMPLOYEE_PASSWORD = "Employee@123";

let adminToken = "";
let employeeToken = "";

let organizationId = "";
let employeeId = "";

let policyId = "";
let supportTeamId = "";
let otherOrganizationId = "";
let otherUserId = "";
let otherSupportTeamId = "";

// ==========================================
// HELPERS
// ==========================================

const uniqueName = (prefix: string) =>
  `${prefix} ${Date.now()} ${Math.random()
    .toString(36)
    .substring(2, 7)}`;

// ==========================================
// TEST SUITE
// ==========================================

describe("Incident Escalation Integration Tests", () => {
  // ==========================================
  // SETUP
  // ==========================================

  beforeAll(async () => {
    console.log(
      "\n=========================================="
    );

    console.log(
      "INCIDENT ESCALATION TEST SETUP STARTING"
    );

    console.log(
      "=========================================="
    );

    // ------------------------------------------
    // DATABASE
    // ------------------------------------------

    console.log("Connecting to MongoDB...");

    await connectDB();

    console.log("MongoDB connection ready.");

    // ------------------------------------------
    // ADMIN LOGIN
    // ------------------------------------------

    console.log(
      `Attempting admin login: ${ADMIN_EMAIL}`
    );

    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      })
      .timeout({
        response: 15000,
        deadline: 20000,
      });

    console.log(
      "ADMIN LOGIN STATUS:",
      adminLogin.status
    );

    console.log(
      "ADMIN LOGIN BODY:",
      adminLogin.body
    );

    expect(adminLogin.status).toBe(200);

    expect(
      adminLogin.body.success
    ).toBe(true);

    expect(
      adminLogin.body.data?.token
    ).toBeDefined();

    adminToken =
      adminLogin.body.data.token;

    organizationId =
      adminLogin.body.data.user.organizationId;

    expect(
      organizationId
    ).toBeDefined();

    console.log(
      "Admin login successful."
    );

    console.log(
      "Organization:",
      organizationId
    );

    // ------------------------------------------
    // EMPLOYEE LOGIN
    // ------------------------------------------

    console.log(
      `Attempting employee login: ${EMPLOYEE_EMAIL}`
    );

    const employeeLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: EMPLOYEE_EMAIL,
        password: EMPLOYEE_PASSWORD,
      })
      .timeout({
        response: 15000,
        deadline: 20000,
      });

    console.log(
      "EMPLOYEE LOGIN STATUS:",
      employeeLogin.status
    );

    console.log(
      "EMPLOYEE LOGIN BODY:",
      employeeLogin.body
    );

    expect(
      employeeLogin.status
    ).toBe(200);

    expect(
      employeeLogin.body.success
    ).toBe(true);

    expect(
      employeeLogin.body.data?.token
    ).toBeDefined();

    employeeToken =
      employeeLogin.body.data.token;

    employeeId =
      employeeLogin.body.data.user.id;

    expect(
      employeeId
    ).toBeDefined();

    console.log(
      "Employee login successful."
    );

    console.log(
      "Employee:",
      employeeId
    );

    // ------------------------------------------
    // CREATE SUPPORT TEAM
    // ------------------------------------------

    console.log(
      "Creating support team for escalation tests..."
    );

    const teamResponse = await request(app)
      .post("/api/v1/support-teams")
      .set(
        "Authorization",
        `Bearer ${adminToken}`
      )
      .send({
        name: uniqueName(
          "Escalation Test Support Team"
        ),
        description:
          "Support team used for incident escalation integration tests",
      })
      .timeout({
        response: 15000,
        deadline: 20000,
      });

    console.log(
      "SUPPORT TEAM STATUS:",
      teamResponse.status
    );

    console.log(
      "SUPPORT TEAM BODY:",
      teamResponse.body
    );

    expect(
      teamResponse.status
    ).toBe(201);

    expect(
      teamResponse.body.success
    ).toBe(true);

    supportTeamId =
      teamResponse.body.data._id;

    expect(
      supportTeamId
    ).toBeDefined();

    const otherOrganization = await Organization.create({
      name: uniqueName("Other Escalation Organization"),
      slug: uniqueName("other-escalation-organization")
        .toLowerCase()
        .replace(/ /g, "-"),
      isActive: true,
    });

    otherOrganizationId = otherOrganization._id.toString();

    const otherUser = await AuthUser.create({
      name: "Other Organization User",
      email: `other.escalation.${Date.now()}@example.com`,
      password: "Password123!",
      role: "employee",
      organizationId: otherOrganization._id,
      isActive: true,
    });

    otherUserId = otherUser._id.toString();

    const otherTeam = await SupportTeam.create({
      name: uniqueName("Other Escalation Team"),
      organizationId: otherOrganization._id,
      members: [],
      isActive: true,
    });

    otherSupportTeamId = otherTeam._id.toString();

    console.log(
      "Support team created:",
      supportTeamId
    );

    console.log(
      "=========================================="
    );

    console.log(
      "INCIDENT ESCALATION TEST SETUP COMPLETE"
    );

    console.log(
      "==========================================\n"
    );
  }, 60000);

  // ==========================================
  // CLEANUP
  // ==========================================

  afterAll(async () => {
    console.log(
      "\nClosing Incident Escalation test DB..."
    );

    try {
      await SupportTeam.deleteMany({
        _id: {
          $in: [supportTeamId, otherSupportTeamId],
        },
      });
      await AuthUser.deleteOne({ _id: otherUserId });
      await Organization.deleteOne({ _id: otherOrganizationId });
      await disconnectDB();

      console.log(
        "Incident escalation test MongoDB connection closed."
      );
    } catch (error) {
      console.error(
        "Incident escalation test DB cleanup failed:",
        error
      );
    }
  }, 30000);

  // ==========================================
  // 1. CREATE POLICY
  // ==========================================

  it(
    "should create an incident escalation policy",
    async () => {
      const response = await request(app)
        .post(
          "/api/v1/incident-escalation"
        )
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        )
        .send({
          name: uniqueName(
            "Critical Incident Escalation"
          ),
          description:
            "Escalate critical incidents to support team",
          priority: "Critical",
          escalationLevel: "Level 1",
          thresholdMinutes: 30,
          targetType: "SupportTeam",
          targetTeam: supportTeamId,
        })
        .timeout({
          response: 15000,
          deadline: 20000,
        });

      console.log(
        "CREATE ESCALATION POLICY RESPONSE:",
        response.body
      );

      expect(
        response.status
      ).toBe(201);

      expect(
        response.body.success
      ).toBe(true);

      expect(
        response.body.data.priority
      ).toBe("Critical");

      expect(
        response.body.data.escalationLevel
      ).toBe("Level 1");

      expect(
        response.body.data.targetType
      ).toBe("SupportTeam");

      policyId =
        response.body.data._id;

      expect(
        policyId
      ).toBeDefined();
    }
  );

  // ==========================================
  // 2. REJECT UNAUTHENTICATED REQUEST
  // ==========================================

  it(
    "should reject unauthenticated policy creation",
    async () => {
      const response = await request(app)
        .post(
          "/api/v1/incident-escalation"
        )
        .send({
          name: uniqueName(
            "Unauthenticated Policy"
          ),
          priority: "High",
          escalationLevel: "Level 1",
          thresholdMinutes: 30,
          targetType: "User",
          targetUser: employeeId,
        });

      expect(
        response.status
      ).toBe(401);

      expect(
        response.body.success
      ).toBe(false);
    }
  );

  // ==========================================
  // 3. INVALID USER TARGET
  // ==========================================

  it(
    "should reject a User target without targetUser",
    async () => {
      const response = await request(app)
        .post(
          "/api/v1/incident-escalation"
        )
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        )
        .send({
          name: uniqueName(
            "Invalid User Target"
          ),
          priority: "High",
          escalationLevel: "Level 1",
          thresholdMinutes: 30,
          targetType: "User",
        });

      expect(
        response.status
      ).toBe(400);

      expect(
        response.body.success
      ).toBe(false);

      expect(
        response.body.message
      ).toContain("targetUser");
    }
  );

  it("should accept a same-tenant User target", async () => {
    const response = await request(app)
      .post("/api/v1/incident-escalation")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: uniqueName("Same Tenant User Target"),
        priority: "High",
        escalationLevel: "Level 1",
        thresholdMinutes: 15,
        targetType: "User",
        targetUser: employeeId,
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });

  it("should reject a cross-tenant User target", async () => {
    const response = await request(app)
      .post("/api/v1/incident-escalation")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: uniqueName("Cross Tenant User Target"),
        priority: "High",
        escalationLevel: "Level 1",
        thresholdMinutes: 15,
        targetType: "User",
        targetUser: otherUserId,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("should reject missing and invalid User targets", async () => {
    const missingResponse = await request(app)
      .post("/api/v1/incident-escalation")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: uniqueName("Missing User Target"),
        priority: "High",
        escalationLevel: "Level 1",
        thresholdMinutes: 15,
        targetType: "User",
      });

    const invalidResponse = await request(app)
      .post("/api/v1/incident-escalation")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: uniqueName("Invalid User Target ID"),
        priority: "High",
        escalationLevel: "Level 1",
        thresholdMinutes: 15,
        targetType: "User",
        targetUser: "invalid-user-id",
      });

    expect(missingResponse.status).toBe(400);
    expect(invalidResponse.status).toBe(400);
  });

  it("should reject cross-tenant and missing or invalid SupportTeam targets", async () => {
    const crossTenantResponse = await request(app)
      .post("/api/v1/incident-escalation")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: uniqueName("Cross Tenant Team Target"),
        priority: "High",
        escalationLevel: "Level 1",
        thresholdMinutes: 15,
        targetType: "SupportTeam",
        targetTeam: otherSupportTeamId,
      });

    const missingResponse = await request(app)
      .post("/api/v1/incident-escalation")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: uniqueName("Missing Team Target"),
        priority: "High",
        escalationLevel: "Level 1",
        thresholdMinutes: 15,
        targetType: "SupportTeam",
      });

    const invalidResponse = await request(app)
      .post("/api/v1/incident-escalation")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: uniqueName("Invalid Team Target ID"),
        priority: "High",
        escalationLevel: "Level 1",
        thresholdMinutes: 15,
        targetType: "SupportTeam",
        targetTeam: "invalid-team-id",
      });

    expect(crossTenantResponse.status).toBe(400);
    expect(missingResponse.status).toBe(400);
    expect(invalidResponse.status).toBe(400);
  });

  // ==========================================
  // 4. INVALID SUPPORT TEAM TARGET
  // ==========================================

  it(
    "should reject a SupportTeam target without targetTeam",
    async () => {
      const response = await request(app)
        .post(
          "/api/v1/incident-escalation"
        )
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        )
        .send({
          name: uniqueName(
            "Invalid Team Target"
          ),
          priority: "High",
          escalationLevel: "Level 1",
          thresholdMinutes: 30,
          targetType: "SupportTeam",
        });

      expect(
        response.status
      ).toBe(400);

      expect(
        response.body.success
      ).toBe(false);

      expect(
        response.body.message
      ).toContain("targetTeam");
    }
  );

  // ==========================================
  // 5. REJECT DUPLICATE POLICY
  // ==========================================

  it(
    "should reject duplicate policy names within the same organization",
    async () => {
      const name = uniqueName(
        "Duplicate Escalation Policy"
      );

      const firstResponse =
        await request(app)
          .post(
            "/api/v1/incident-escalation"
          )
          .set(
            "Authorization",
            `Bearer ${adminToken}`
          )
          .send({
            name,
            priority: "High",
            escalationLevel: "Level 1",
            thresholdMinutes: 60,
            targetType: "User",
            targetUser: employeeId,
          });

      expect(
        firstResponse.status
      ).toBe(201);

      const duplicateResponse =
        await request(app)
          .post(
            "/api/v1/incident-escalation"
          )
          .set(
            "Authorization",
            `Bearer ${adminToken}`
          )
          .send({
            name,
            priority: "High",
            escalationLevel: "Level 2",
            thresholdMinutes: 120,
            targetType: "User",
            targetUser: employeeId,
          });

      expect(
        duplicateResponse.status
      ).toBe(400);

      expect(
        duplicateResponse.body.success
      ).toBe(false);

      expect(
        duplicateResponse.body.message
      ).toContain("already exists");
    }
  );

  // ==========================================
  // 6. GET POLICIES
  // ==========================================

  it(
    "should get escalation policies for the organization",
    async () => {
      const response = await request(app)
        .get(
          "/api/v1/incident-escalation"
        )
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        );

      console.log(
        "GET ESCALATION POLICIES RESPONSE:",
        response.body
      );

      expect(
        response.status
      ).toBe(200);

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

  // ==========================================
  // 7. GET POLICY BY ID
  // ==========================================

  it(
    "should get an escalation policy by ID",
    async () => {
      const response = await request(app)
        .get(
          `/api/v1/incident-escalation/${policyId}`
        )
        .set(
          "Authorization",
          `Bearer ${employeeToken}`
        );

      expect(
        response.status
      ).toBe(200);

      expect(
        response.body.success
      ).toBe(true);

      expect(
        response.body.data._id
      ).toBe(policyId);
    }
  );

  // ==========================================
  // 8. ORGANIZATION ISOLATION
  // ==========================================

  it(
    "should return a policy belonging to the authenticated organization",
    async () => {
      const response = await request(app)
        .get(
          `/api/v1/incident-escalation/${policyId}`
        )
        .set(
          "Authorization",
          `Bearer ${employeeToken}`
        );

      expect(
        response.status
      ).toBe(200);

      expect(
        response.body.success
      ).toBe(true);

      expect(
        response.body.data.organizationId
      ).toBe(organizationId);
    }
  );

  // ==========================================
  // 9. UPDATE POLICY
  // ==========================================

  it(
    "should update an escalation policy",
    async () => {
      const response = await request(app)
        .put(
          `/api/v1/incident-escalation/${policyId}`
        )
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        )
        .send({
          thresholdMinutes: 90,
          escalationLevel: "Level 2",
          description:
            "Updated escalation policy",
        });

      console.log(
        "UPDATE ESCALATION POLICY RESPONSE:",
        response.body
      );

      expect(
        response.status
      ).toBe(200);

      expect(
        response.body.success
      ).toBe(true);

      expect(
        response.body.data.thresholdMinutes
      ).toBe(90);

      expect(
        response.body.data.escalationLevel
      ).toBe("Level 2");
    }
  );

  // ==========================================
  // 10. SWITCH USER -> SUPPORT TEAM
  // ==========================================

  it(
    "should switch an escalation policy from User to SupportTeam",
    async () => {
      const userPolicyResponse =
        await request(app)
          .post(
            "/api/v1/incident-escalation"
          )
          .set(
            "Authorization",
            `Bearer ${adminToken}`
          )
          .send({
            name: uniqueName(
              "User To Team Policy"
            ),
            priority: "High",
            escalationLevel: "Level 1",
            thresholdMinutes: 50,
            targetType: "User",
            targetUser: employeeId,
          });

      expect(
        userPolicyResponse.status
      ).toBe(201);

      const userPolicyId =
        userPolicyResponse.body.data._id;

      const response = await request(app)
        .put(
          `/api/v1/incident-escalation/${userPolicyId}`
        )
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        )
        .send({
          targetType: "SupportTeam",
          targetTeam: supportTeamId,
        });

      console.log(
        "SWITCH TARGET RESPONSE:",
        response.body
      );

      expect(
        response.status
      ).toBe(200);

      expect(
        response.body.success
      ).toBe(true);

      expect(
        response.body.data.targetType
      ).toBe("SupportTeam");

      const returnedTargetTeam =
        response.body.data.targetTeam;

      if (
        returnedTargetTeam &&
        typeof returnedTargetTeam === "object"
      ) {
        expect(
          returnedTargetTeam._id
        ).toBe(supportTeamId);
      } else {
        expect(
          returnedTargetTeam
        ).toBe(supportTeamId);
      }
    }
  );

  // ==========================================
  // 11. DELETE POLICY
  // ==========================================

  it(
    "should delete an escalation policy",
    async () => {
      const createResponse =
        await request(app)
          .post(
            "/api/v1/incident-escalation"
          )
          .set(
            "Authorization",
            `Bearer ${adminToken}`
          )
          .send({
            name: uniqueName(
              "Delete Escalation Policy"
            ),
            priority: "Low",
            escalationLevel: "Level 3",
            thresholdMinutes: 180,
            targetType: "User",
            targetUser: employeeId,
          });

      expect(
        createResponse.status
      ).toBe(201);

      const id =
        createResponse.body.data._id;

      const deleteResponse =
        await request(app)
          .delete(
            `/api/v1/incident-escalation/${id}`
          )
          .set(
            "Authorization",
            `Bearer ${adminToken}`
          );

      expect(
        deleteResponse.status
      ).toBe(200);

      expect(
        deleteResponse.body.success
      ).toBe(true);

      const getResponse =
        await request(app)
          .get(
            `/api/v1/incident-escalation/${id}`
          )
          .set(
            "Authorization",
            `Bearer ${adminToken}`
          );

      expect(
        getResponse.status
      ).toBe(404);
    }
  );

  // ==========================================
  // 12. APPLICABLE ACTIVE POLICIES
  // ==========================================

  it(
    "should return only active policies applicable to the incident priority",
    async () => {
      const activeResponse =
        await request(app)
          .post(
            "/api/v1/incident-escalation"
          )
          .set(
            "Authorization",
            `Bearer ${adminToken}`
          )
          .send({
            name: uniqueName(
              "Applicable High Active"
            ),
            priority: "High",
            escalationLevel: "Level 1",
            thresholdMinutes: 20,
            targetType: "User",
            targetUser: employeeId,
          });

      expect(
        activeResponse.status
      ).toBe(201);

      const inactiveResponse =
        await request(app)
          .post(
            "/api/v1/incident-escalation"
          )
          .set(
            "Authorization",
            `Bearer ${adminToken}`
          )
          .send({
            name: uniqueName(
              "Applicable High Inactive"
            ),
            priority: "High",
            escalationLevel: "Level 2",
            thresholdMinutes: 40,
            targetType: "User",
            targetUser: employeeId,
          });

      expect(
        inactiveResponse.status
      ).toBe(201);

      const inactiveId =
        inactiveResponse.body.data._id;

      const deactivateResponse =
        await request(app)
          .put(
            `/api/v1/incident-escalation/${inactiveId}`
          )
          .set(
            "Authorization",
            `Bearer ${adminToken}`
          )
          .send({
            isActive: false,
          });

      expect(
        deactivateResponse.status
      ).toBe(200);

      // ------------------------------------------
      // APPLICABLE ENDPOINT
      // ------------------------------------------

      const applicableResponse =
        await request(app)
          .get(
            "/api/v1/incident-escalation/applicable/High"
          )
          .set(
            "Authorization",
            `Bearer ${adminToken}`
          );

      console.log(
        "APPLICABLE HIGH POLICIES RESPONSE:",
        applicableResponse.body
      );

      expect(
        applicableResponse.status
      ).toBe(200);

      expect(
        applicableResponse.body.success
      ).toBe(true);

      expect(
        Array.isArray(
          applicableResponse.body.data
        )
      ).toBe(true);

      const policies =
        applicableResponse.body.data;

      expect(
        policies.some(
          (policy: any) =>
            policy._id ===
            activeResponse.body.data._id
        )
      ).toBe(true);

      expect(
        policies.some(
          (policy: any) =>
            policy._id === inactiveId
        )
      ).toBe(false);

      policies.forEach(
        (policy: any) => {
          expect(
            policy.priority
          ).toBe("High");

          expect(
            policy.isActive
          ).toBe(true);
        }
      );
    }
  );

  // ==========================================
  // 13. PRIORITY FILTERING
  // ==========================================

  it(
    "should return only policies matching the requested incident priority",
    async () => {
      const highPolicy =
        await request(app)
          .post(
            "/api/v1/incident-escalation"
          )
          .set(
            "Authorization",
            `Bearer ${adminToken}`
          )
          .send({
            name: uniqueName(
              "Priority Filter High"
            ),
            priority: "High",
            escalationLevel: "Level 1",
            thresholdMinutes: 15,
            targetType: "User",
            targetUser: employeeId,
          });

      expect(
        highPolicy.status
      ).toBe(201);

      const mediumPolicy =
        await request(app)
          .post(
            "/api/v1/incident-escalation"
          )
          .set(
            "Authorization",
            `Bearer ${adminToken}`
          )
          .send({
            name: uniqueName(
              "Priority Filter Medium"
            ),
            priority: "Medium",
            escalationLevel: "Level 1",
            thresholdMinutes: 25,
            targetType: "User",
            targetUser: employeeId,
          });

      expect(
        mediumPolicy.status
      ).toBe(201);

      const response =
        await request(app)
          .get(
            "/api/v1/incident-escalation/applicable/High"
          )
          .set(
            "Authorization",
            `Bearer ${adminToken}`
          );

      expect(
        response.status
      ).toBe(200);

      expect(
        response.body.success
      ).toBe(true);

      expect(
        Array.isArray(
          response.body.data
        )
      ).toBe(true);

      response.body.data.forEach(
        (policy: any) => {
          expect(
            policy.priority
          ).toBe("High");

          expect(
            policy.isActive
          ).toBe(true);
        }
      );

      expect(
        response.body.data.some(
          (policy: any) =>
            policy._id ===
            mediumPolicy.body.data._id
        )
      ).toBe(false);
    }
  );

  // ==========================================
  // 14. THRESHOLD ORDERING
  // ==========================================

  it(
    "should order applicable policies by thresholdMinutes",
    async () => {
      const policy1 =
        await request(app)
          .post(
            "/api/v1/incident-escalation"
          )
          .set(
            "Authorization",
            `Bearer ${adminToken}`
          )
          .send({
            name: uniqueName(
              "Threshold Order 60"
            ),
            priority: "Critical",
            escalationLevel: "Level 2",
            thresholdMinutes: 60,
            targetType: "User",
            targetUser: employeeId,
          });

      expect(
        policy1.status
      ).toBe(201);

      const policy2 =
        await request(app)
          .post(
            "/api/v1/incident-escalation"
          )
          .set(
            "Authorization",
            `Bearer ${adminToken}`
          )
          .send({
            name: uniqueName(
              "Threshold Order 20"
            ),
            priority: "Critical",
            escalationLevel: "Level 1",
            thresholdMinutes: 20,
            targetType: "User",
            targetUser: employeeId,
          });

      expect(
        policy2.status
      ).toBe(201);

      const policy3 =
        await request(app)
          .post(
            "/api/v1/incident-escalation"
          )
          .set(
            "Authorization",
            `Bearer ${adminToken}`
          )
          .send({
            name: uniqueName(
              "Threshold Order 40"
            ),
            priority: "Critical",
            escalationLevel: "Level 2",
            thresholdMinutes: 40,
            targetType: "User",
            targetUser: employeeId,
          });

      expect(
        policy3.status
      ).toBe(201);

      const response =
        await request(app)
          .get(
            "/api/v1/incident-escalation/applicable/Critical"
          )
          .set(
            "Authorization",
            `Bearer ${adminToken}`
          );

      expect(
        response.status
      ).toBe(200);

      expect(
        response.body.success
      ).toBe(true);

      const thresholds =
        response.body.data.map(
          (policy: any) =>
            policy.thresholdMinutes
        );

      const sortedThresholds =
        [...thresholds].sort(
          (a, b) => a - b
        );

      expect(
        thresholds
      ).toEqual(
        sortedThresholds
      );
    }
  );

  // ==========================================
  // 15. EMPLOYEE CANNOT CREATE POLICY
  // ==========================================

  it(
    "should reject policy creation by a non-admin user",
    async () => {
      const response = await request(app)
        .post(
          "/api/v1/incident-escalation"
        )
        .set(
          "Authorization",
          `Bearer ${employeeToken}`
        )
        .send({
          name: uniqueName(
            "Employee Policy"
          ),
          priority: "Medium",
          escalationLevel: "Level 1",
          thresholdMinutes: 30,
          targetType: "User",
          targetUser: employeeId,
        });

      expect(
        [401, 403]
      ).toContain(
        response.status
      );
    }
  );

  // ==========================================
  // 16. EMPLOYEE CANNOT UPDATE POLICY
  // ==========================================

  it(
    "should reject policy update by a non-admin user",
    async () => {
      const response = await request(app)
        .put(
          `/api/v1/incident-escalation/${policyId}`
        )
        .set(
          "Authorization",
          `Bearer ${employeeToken}`
        )
        .send({
          thresholdMinutes: 999,
        });

      expect(
        [401, 403]
      ).toContain(
        response.status
      );
    }
  );

  // ==========================================
  // 17. EMPLOYEE CANNOT DELETE POLICY
  // ==========================================

  it(
    "should reject policy deletion by a non-admin user",
    async () => {
      const response = await request(app)
        .delete(
          `/api/v1/incident-escalation/${policyId}`
        )
        .set(
          "Authorization",
          `Bearer ${employeeToken}`
        );

      expect(
        [401, 403]
      ).toContain(
        response.status
      );
    }
  );
});