
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
      isEmailVerified: true,
      organizationId: organization._id,
      isActive: true,
    });

    adminId = admin._id.toString();

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

    expect(employeeRegister.status).toBe(201);
    expect(employeeRegister.body.success).toBe(true);

    employeeId = employeeRegister.body.data.user.id;
    expect(employeeId).toBeTruthy();
    expect(employeeRegister.body.data.user.role).toBe("employee");

    await AuthUser.updateOne({ email: employeeEmail }, { $set: { isEmailVerified: true } });

    // ==========================================
    // LOGIN ADMIN
    // ==========================================

    await AuthUser.updateOne({ email: employeeEmail }, { $set: { isEmailVerified: true } });

    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: adminEmail,
        password,
      });

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

    expect(incidentResponse.status).toBe(201);
    expect(incidentResponse.body.success).toBe(true);

    incidentId =
      incidentResponse.body.data._id ||
      incidentResponse.body.data.incidentId;

    expect(incidentId).toBeTruthy();

    // ==========================================
    // TEST DATA READY
    // ==========================================
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
    }
  });
});
