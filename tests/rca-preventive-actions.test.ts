
import request from "supertest";
import bcrypt from "bcrypt";

import app from "../src/app";
import { connectDB, disconnectDB } from "../src/config/db";

import AuthUser from "../src/modules/auth/auth.model";
import Organization from "../src/modules/organization/organization.model";
import Problem from "../src/modules/problem/problem.model";
import Incident from "../src/modules/incident/incident.model";
import RCA from "../src/modules/rca/rca.model";

jest.setTimeout(60000);

describe("RCA Preventive Actions Integration Tests", () => {
  let adminToken: string;
  let employeeToken: string;

  let organizationId: string;
  let adminId: string;
  let employeeId: string;

  let problemId: string;
  let incidentId: string;
  let rcaId: string;

  const timestamp = Date.now();

  const adminEmail =
    `rca.preventive.admin.${timestamp}@example.com`;

  const employeeEmail =
    `rca.preventive.employee.${timestamp}@example.com`;

  const password = "RcaPreventive123!";

  // ==========================================
  // SETUP
  // ==========================================

  beforeAll(async () => {
    console.log("==========================================");
    console.log("RCA PREVENTIVE ACTIONS TEST SETUP");
    console.log("==========================================");

    await connectDB();

    // ==========================================
    // CREATE ORGANIZATION
    // ==========================================

    const organization = await Organization.create({
      name: `RCA Preventive Test Organization ${timestamp}`,
      slug: `rca-preventive-test-organization-${timestamp}`,
      description:
        "Organization created for RCA preventive actions integration tests",
    });

    organizationId = organization._id.toString();

    console.log("ORGANIZATION:", organizationId);

    expect(organizationId).toBeTruthy();

    // ==========================================
    // CREATE ADMIN DIRECTLY
    // PUBLIC /REGISTER ONLY CREATES EMPLOYEES
    // ==========================================

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await AuthUser.create({
      name: "RCA Preventive Admin",
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
      organizationId: organization._id,
      isActive: true,
    });

    adminId = admin._id.toString();

    console.log("==========================================");
    console.log("ADMIN CREATED DIRECTLY");
    console.log("==========================================");
    console.log("ADMIN:", adminId);
    console.log("ADMIN ROLE:", admin.role);

    expect(adminId).toBeTruthy();
    expect(admin.role).toBe("admin");

    // ==========================================
    // CREATE EMPLOYEE THROUGH PUBLIC REGISTER
    // ==========================================

    const employeeRegister = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "RCA Preventive Employee",
        email: employeeEmail,
        password,
        organizationId,
      });

    console.log("==========================================");
    console.log("EMPLOYEE REGISTRATION");
    console.log("==========================================");
    console.log("STATUS:", employeeRegister.status);
    console.log(
      "BODY:",
      JSON.stringify(employeeRegister.body, null, 2)
    );

    expect(employeeRegister.status).toBe(201);
    expect(employeeRegister.body.success).toBe(true);

    employeeId = employeeRegister.body.data.user.id;
    employeeToken = employeeRegister.body.data.token;

    expect(employeeId).toBeTruthy();
    expect(employeeToken).toBeTruthy();
    expect(employeeRegister.body.data.user.role).toBe("employee");

    console.log("EMPLOYEE:", employeeId);
    console.log(
      "EMPLOYEE ROLE:",
      employeeRegister.body.data.user.role
    );

    // ==========================================
    // LOGIN ADMIN
    // ==========================================

    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: adminEmail,
        password,
      });

    console.log("==========================================");
    console.log("ADMIN LOGIN");
    console.log("==========================================");
    console.log("STATUS:", adminLogin.status);
    console.log(
      "BODY:",
      JSON.stringify(adminLogin.body, null, 2)
    );

    expect(adminLogin.status).toBe(200);
    expect(adminLogin.body.success).toBe(true);
    expect(adminLogin.body.data.user.role).toBe("admin");

    adminToken = adminLogin.body.data.token;

    expect(adminToken).toBeTruthy();

    // ==========================================
    // LOGIN EMPLOYEE
    // ==========================================

    const employeeLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: employeeEmail,
        password,
      });

    console.log("==========================================");
    console.log("EMPLOYEE LOGIN");
    console.log("==========================================");
    console.log("STATUS:", employeeLogin.status);
    console.log(
      "BODY:",
      JSON.stringify(employeeLogin.body, null, 2)
    );

    expect(employeeLogin.status).toBe(200);
    expect(employeeLogin.body.success).toBe(true);
    expect(employeeLogin.body.data.user.role).toBe("employee");

    employeeToken = employeeLogin.body.data.token;

    expect(employeeToken).toBeTruthy();

    // ==========================================
    // CREATE PROBLEM
    // ==========================================

    const problemResponse = await request(app)
      .post("/api/v1/problems")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        problemId: `PRB-RCA-PREV-${timestamp}`,

        title: "Recurring network switch failure",

        description:
          "Network switch repeatedly fails and causes outages",

        priority: "High",

        impact: "High",

        urgency: "High",

        organizationId,
      });

    console.log("==========================================");
    console.log("CREATE PROBLEM");
    console.log("==========================================");
    console.log("STATUS:", problemResponse.status);
    console.log(
      "BODY:",
      JSON.stringify(problemResponse.body, null, 2)
    );

    expect(problemResponse.status).toBe(201);
    expect(problemResponse.body.success).toBe(true);

    problemId =
      problemResponse.body.data._id ||
      problemResponse.body.data.problemId;

    expect(problemId).toBeTruthy();

    // ==========================================
    // CREATE INCIDENT
    // ==========================================

    const incidentResponse = await request(app)
      .post("/api/v1/incidents")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        // IMPORTANT:
        // incidentId is required by the Incident model.
        incidentId: `INC-RCA-PREV-${timestamp}`,

        title: "Network switch outage",

        description:
          "Network outage caused by faulty switch",

        priority: "High",

        severity: "Major",

        organizationId,
      });

    console.log("==========================================");
    console.log("CREATE INCIDENT");
    console.log("==========================================");
    console.log("STATUS:", incidentResponse.status);
    console.log(
      "BODY:",
      JSON.stringify(incidentResponse.body, null, 2)
    );

    expect(incidentResponse.status).toBe(201);
    expect(incidentResponse.body.success).toBe(true);

    incidentId =
      incidentResponse.body.data._id ||
      incidentResponse.body.data.incidentId;

    expect(incidentId).toBeTruthy();

    // ==========================================
    // TEST DATA READY
    // ==========================================

    console.log("==========================================");
    console.log("TEST DATA READY");
    console.log("==========================================");
    console.log("Organization:", organizationId);
    console.log("Admin:", adminId);
    console.log("Employee:", employeeId);
    console.log("Problem:", problemId);
    console.log("Incident:", incidentId);
    console.log("==========================================");
  });

  // ==========================================
  // CREATE RCA
  // ==========================================

  test("should create an RCA with preventive actions", async () => {
    const response = await request(app)
      .post("/api/v1/rcas")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        rcaId: `RCA-PREV-${Date.now()}`,

        problem: problemId,

        rootCause:
          "Faulty network switch hardware",

        investigation:
          "Network logs and hardware diagnostics identified the faulty switch",

        contributingFactors: [
          "Old hardware",
          "No proactive hardware replacement",
        ],

        correctiveActions: [
          "Replace the faulty network switch",
          "Verify network configuration",
        ],

        preventiveActions: [
          "Introduce periodic network hardware checks",
          "Create proactive hardware replacement schedule",
        ],

        lessonsLearned: [],

        identifiedBy: adminId,

        relatedIncidents: [incidentId],

        organizationId,
      });

    console.log("CREATE RCA RESPONSE:", response.body);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);

    expect(response.body.data.preventiveActions).toEqual([
      "Introduce periodic network hardware checks",
      "Create proactive hardware replacement schedule",
    ]);

    rcaId = response.body.data._id;

    expect(rcaId).toBeTruthy();
  });

  // ==========================================
  // GET RCA
  // ==========================================

  test(
    "should return preventive actions when retrieving an RCA",
    async () => {
      const response = await request(app)
        .get(`/api/v1/rcas/${rcaId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      console.log("GET RCA RESPONSE:", response.body);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data.preventiveActions).toEqual([
        "Introduce periodic network hardware checks",
        "Create proactive hardware replacement schedule",
      ]);
    }
  );

  // ==========================================
  // UPDATE PREVENTIVE ACTIONS
  // ==========================================

  test("should update preventive actions", async () => {
    const response = await request(app)
      .put(`/api/v1/rcas/${rcaId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        preventiveActions: [
          "Introduce periodic network hardware checks",
          "Create proactive hardware replacement schedule",
          "Monitor switch health monthly",
        ],
      });

    console.log(
      "UPDATE PREVENTIVE ACTIONS RESPONSE:",
      response.body
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.data.preventiveActions).toEqual([
      "Introduce periodic network hardware checks",
      "Create proactive hardware replacement schedule",
      "Monitor switch health monthly",
    ]);
  });

  // ==========================================
  // EMPLOYEE UPDATE
  // ==========================================

  test(
    "should block authenticated employee from updating preventive actions",
    async () => {
      const response = await request(app)
        .put(`/api/v1/rcas/${rcaId}`)
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          preventiveActions: [
            "Introduce periodic network hardware checks",
            "Create proactive hardware replacement schedule",
            "Monitor switch health monthly",
            "Review hardware lifecycle quarterly",
          ],
        });

      console.log("EMPLOYEE UPDATE RESPONSE:", response.body);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    }
  );

  // ==========================================
  // INVALID PREVENTIVE ACTION VALUES
  // ==========================================

  test("should handle invalid preventive action values", async () => {
    const response = await request(app)
      .put(`/api/v1/rcas/${rcaId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        preventiveActions: [
          "",
          "   ",
          "Valid preventive action",
        ],
      });

    console.log(
      "EMPTY PREVENTIVE ACTION RESPONSE:",
      response.body
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.data.preventiveActions).toEqual([
      "Valid preventive action",
    ]);
  });

  // ==========================================
  // UNAUTHENTICATED UPDATE
  // ==========================================

  test(
    "should not allow an unauthenticated user to update preventive actions",
    async () => {
      const response = await request(app)
        .put(`/api/v1/rcas/${rcaId}`)
        .send({
          preventiveActions: [
            "Unauthorized modification",
          ],
        });

      expect(response.status).toBe(401);
    }
  );

  // ==========================================
  // RESTORE EXPECTED PREVENTIVE ACTIONS
  // ==========================================

  test(
    "should restore preventive actions before completing the RCA",
    async () => {
      const response = await request(app)
        .put(`/api/v1/rcas/${rcaId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          preventiveActions: [
            "Introduce periodic network hardware checks",
            "Create proactive hardware replacement schedule",
            "Monitor switch health monthly",
            "Review hardware lifecycle quarterly",
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data.preventiveActions).toEqual([
        "Introduce periodic network hardware checks",
        "Create proactive hardware replacement schedule",
        "Monitor switch health monthly",
        "Review hardware lifecycle quarterly",
      ]);
    }
  );

  // ==========================================
  // COMPLETE RCA
  // ==========================================

  test("should complete the RCA", async () => {
    const response = await request(app)
      .put(`/api/v1/rcas/${rcaId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: "Completed",

        rootCause:
          "Faulty network switch hardware",

        investigation:
          "Hardware diagnostics confirmed the faulty switch",
      });

    console.log("COMPLETE RCA RESPONSE:", response.body);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("Completed");
  });

  // ==========================================
  // APPROVE RCA
  // ==========================================

  test("should approve the RCA", async () => {
    expect(adminToken).toBeTruthy();

    const response = await request(app)
      .put(`/api/v1/rcas/${rcaId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: "Approved",
      });

    console.log("APPROVE RCA RESPONSE:", response.body);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("Approved");
  });

  // ==========================================
  // APPROVED RCA IMMUTABILITY
  // ==========================================

  test(
    "should prevent preventive action modification after RCA approval",
    async () => {
      const response = await request(app)
        .put(`/api/v1/rcas/${rcaId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          preventiveActions: [
            "Attempted modification after approval",
          ],
        });

      console.log(
        "APPROVED RCA UPDATE RESPONSE:",
        response.body
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);

      expect(response.body.message).toBe(
        "Approved RCA cannot be modified"
      );
    }
  );

  // ==========================================
  // PRESERVE PREVENTIVE ACTIONS
  // ==========================================

  test(
    "should preserve preventive actions after approval",
    async () => {
      const response = await request(app)
        .get(`/api/v1/rcas/${rcaId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data.status).toBe("Approved");

      expect(response.body.data.preventiveActions).toEqual([
        "Introduce periodic network hardware checks",
        "Create proactive hardware replacement schedule",
        "Monitor switch health monthly",
        "Review hardware lifecycle quarterly",
      ]);
    }
  );

  // ==========================================
  // CLEANUP
  // ==========================================

  afterAll(async () => {
    console.log(
      "RCA preventive actions test cleanup started."
    );

    try {
      if (rcaId) {
        await RCA.deleteOne({
          _id: rcaId,
        });
      }

      if (incidentId) {
        await Incident.deleteOne({
          _id: incidentId,
        });
      }

      if (problemId) {
        await Problem.deleteOne({
          _id: problemId,
        });
      }

      if (employeeId) {
        await AuthUser.deleteOne({
          _id: employeeId,
        });
      }

      if (adminId) {
        await AuthUser.deleteOne({
          _id: adminId,
        });
      }

      if (organizationId) {
        await Organization.deleteOne({
          _id: organizationId,
        });
      }
    } finally {
      await disconnectDB();

      console.log(
        "RCA preventive actions MongoDB connection closed."
      );
    }
  });
});
