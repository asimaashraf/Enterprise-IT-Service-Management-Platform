import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app";
import { connectDB } from "../src/config/db";
import Organization from "../src/modules/organization/organization.model";
import { createTestUser } from "./test-fixtures";

describe("RCA Lessons Learned Integration Tests", () => {
  // MongoDB Atlas connection can take longer than Jest's
  // default 5-second timeout.
  jest.setTimeout(30000);

  let adminToken: string;
  let employeeToken: string;

  let organizationId: string;
  let adminId: string;
  let employeeId: string;
  let problemId: string;
  let rcaMongoId: string;

  const timestamp = Date.now();

  const adminEmail =
    `lessons.admin.${timestamp}@example.com`;

  const employeeEmail =
    `lessons.employee.${timestamp}@example.com`;

  const organizationName =
    `RCA Lessons Organization ${timestamp}`;

  const organizationSlug =
    `rca-lessons-organization-${timestamp}`;

  // ==================================================
  // SETUP
  // ==================================================

  beforeAll(async () => {
    console.log("==========================================");
    console.log("RCA LESSONS LEARNED TEST SETUP");
    console.log("==========================================");

    await connectDB();

    // ==================================================
    // CREATE REAL ORGANIZATION
    // ==================================================

    /*
     * We cannot create the organization through
     * POST /api/v1/organizations because that route
     * requires an already authenticated user who already
     * belongs to an organization.
     *
     * Therefore, for this integration test, create the
     * organization directly through the model.
     *
     * IMPORTANT:
     * Organization requires both name and slug.
     */

    const organization = await Organization.create({
      name: organizationName,
      slug: organizationSlug,
      description: "Organization for RCA lessons learned integration tests",
      isActive: true,
    });

    organizationId =
      organization._id.toString();

    console.log(
      "Organization:",
      organizationId
    );

    // ==================================================
    // REGISTER ADMIN
    // ==================================================

    const admin = await createTestUser({
      name: "Lessons Admin",
      email: adminEmail,
      password: "Password123!",
      role: "admin",
      organizationId,
    });

    adminId = admin._id.toString();

    expect(adminId).toBeDefined();

    // ==================================================
    // REGISTER EMPLOYEE
    // ==================================================

    const employeeRegister =
      await request(app)
        .post("/api/v1/auth/register")
        .send({
          name: "Lessons Employee",
          email: employeeEmail,
          password: "Password123!",
          role: "employee",
          organizationId,
        });

    console.log(
      "EMPLOYEE REGISTER STATUS:",
      employeeRegister.status
    );

    console.log(
      "EMPLOYEE REGISTER RESPONSE:",
      employeeRegister.body
    );

    expect(
      employeeRegister.status
    ).toBe(201);

    employeeId =
      employeeRegister.body.data.user.id ??
      employeeRegister.body.data.user._id;

    expect(employeeId).toBeDefined();

    // ==================================================
    // LOGIN ADMIN
    // ==================================================

    const adminLogin =
      await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: adminEmail,
          password: "Password123!",
        });

    console.log(
      "ADMIN LOGIN STATUS:",
      adminLogin.status
    );

    console.log(
      "ADMIN LOGIN RESPONSE:",
      adminLogin.body
    );

    expect(
      adminLogin.status
    ).toBe(200);

    adminToken =
      adminLogin.body.data.token;

    expect(adminToken).toBeDefined();

    // ==================================================
    // LOGIN EMPLOYEE
    // ==================================================

    const employeeLogin =
      await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: employeeEmail,
          password: "Password123!",
        });

    console.log(
      "EMPLOYEE LOGIN STATUS:",
      employeeLogin.status
    );

    console.log(
      "EMPLOYEE LOGIN RESPONSE:",
      employeeLogin.body
    );

    expect(
      employeeLogin.status
    ).toBe(200);

    employeeToken =
      employeeLogin.body.data.token;

    expect(employeeToken).toBeDefined();

    // ==================================================
    // CREATE PROBLEM
    // ==================================================

    const problemResponse =
      await request(app)
        .post("/api/v1/problems")
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        )
        .send({
          problemId:
            `PRB-LESSONS-${timestamp}`,

          title:
            "Recurring database connection failure",

          description:
            "Database connections repeatedly dropped under heavy load",

          priority: "High",
          impact: "High",
          urgency: "High",

          reportedBy: adminId,

          organizationId,
        });

    console.log(
      "PROBLEM CREATE STATUS:",
      problemResponse.status
    );

    console.log(
      "PROBLEM CREATE RESPONSE:",
      problemResponse.body
    );

    expect(
      problemResponse.status
    ).toBe(201);

    problemId =
      problemResponse.body.data._id ??
      problemResponse.body.data.id;

    expect(problemId).toBeDefined();

    // ==================================================
    // CREATE RCA
    // ==================================================

    const rcaResponse =
      await request(app)
        .post("/api/v1/rcas")
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        )
        .send({
          rcaId:
            `RCA-LESSONS-${timestamp}`,

          problem: problemId,

          rootCause:
            "Database connection pool was undersized",

          investigation:
            "Connection metrics showed pool exhaustion during peak traffic",

          contributingFactors: [
            "Increased traffic",
            "Insufficient connection pool monitoring",
          ],

          correctiveActions: [
            "Increase database connection pool",
            "Configure connection monitoring",
          ],

          preventiveActions: [
            "Review database capacity monthly",
          ],

          lessonsLearned: [
            "Connection pool capacity must be reviewed as traffic grows",
            "Database monitoring should include connection exhaustion alerts",
          ],

          identifiedBy: adminId,

          organizationId,
        });

    console.log(
      "CREATE RCA STATUS:",
      rcaResponse.status
    );

    console.log(
      "CREATE RCA RESPONSE:",
      rcaResponse.body
    );

    expect(
      rcaResponse.status
    ).toBe(201);

    rcaMongoId =
      rcaResponse.body.data._id ??
      rcaResponse.body.data.id;

    expect(rcaMongoId).toBeDefined();
  });

  // ==================================================
  // TEST 1
  // ==================================================

  it(
    "should create an RCA with lessons learned",
    async () => {
      const response =
        await request(app)
          .get(
            `/api/v1/rcas/${rcaMongoId}`
          )
          .set(
            "Authorization",
            `Bearer ${adminToken}`
          );

      console.log(
        "GET RCA LESSONS RESPONSE:",
        response.body
      );

      expect(response.status).toBe(200);

      expect(
        response.body.data.lessonsLearned
      ).toEqual([
        "Connection pool capacity must be reviewed as traffic grows",
        "Database monitoring should include connection exhaustion alerts",
      ]);
    }
  );

  // ==================================================
  // TEST 2
  // ==================================================

  it(
    "should update lessons learned",
    async () => {
      const response =
        await request(app)
          .put(
            `/api/v1/rcas/${rcaMongoId}`
          )
          .set(
            "Authorization",
            `Bearer ${adminToken}`
          )
          .send({
            lessonsLearned: [
              "Monitor connection pool utilization",
              "Review capacity before major traffic increases",
              "Configure alerts for connection exhaustion",
            ],
          });

      console.log(
        "UPDATE LESSONS RESPONSE:",
        response.body
      );

      expect(response.status).toBe(200);

      expect(
        response.body.data.lessonsLearned
      ).toEqual([
        "Monitor connection pool utilization",
        "Review capacity before major traffic increases",
        "Configure alerts for connection exhaustion",
      ]);
    }
  );

  // ==================================================
  // TEST 3
  // ==================================================

  it(
    "should block authenticated employee from updating lessons learned",
    async () => {
      const response =
        await request(app)
          .put(
            `/api/v1/rcas/${rcaMongoId}`
          )
          .set(
            "Authorization",
            `Bearer ${employeeToken}`
          )
          .send({
            lessonsLearned: [
              "Always monitor database connection usage",
              "Capacity planning should be proactive",
            ],
          });

      console.log(
        "EMPLOYEE LESSONS UPDATE RESPONSE:",
        response.body
      );

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    }
  );

  // ==================================================
  // TEST 4
  // ==================================================

  it(
    "should remove blank and whitespace-only lessons",
    async () => {
      const response =
        await request(app)
          .put(
            `/api/v1/rcas/${rcaMongoId}`
          )
          .set(
            "Authorization",
            `Bearer ${adminToken}`
          )
          .send({
            lessonsLearned: [
              "Monitor database performance",
              "",
              "   ",
              "Review capacity regularly",
            ],
          });

      console.log(
        "CLEAN LESSONS RESPONSE:",
        response.body
      );

      expect(response.status).toBe(200);

      expect(
        response.body.data.lessonsLearned
      ).toEqual([
        "Monitor database performance",
        "Review capacity regularly",
      ]);
    }
  );

  // ==================================================
  // TEST 5
  // ==================================================

  it(
    "should reject unauthenticated lessons learned update",
    async () => {
      const response =
        await request(app)
          .put(
            `/api/v1/rcas/${rcaMongoId}`
          )
          .send({
            lessonsLearned: [
              "Unauthorized lesson",
            ],
          });

      console.log(
        "UNAUTHENTICATED LESSONS RESPONSE:",
        response.body
      );

      expect(
        response.status
      ).toBeGreaterThanOrEqual(401);

      expect(
        response.status
      ).toBeLessThan(500);
    }
  );

  // ==================================================
  // TEST 6
  // ==================================================

  it(
    "should preserve lessons learned when completing RCA",
    async () => {
      const lessons = [
        "Monitor database performance",
        "Review capacity regularly",
      ];

      const response =
        await request(app)
          .put(
            `/api/v1/rcas/${rcaMongoId}`
          )
          .set(
            "Authorization",
            `Bearer ${adminToken}`
          )
          .send({
            lessonsLearned: lessons,
            status: "Completed",
          });

      console.log(
        "COMPLETE RCA WITH LESSONS RESPONSE:",
        response.body
      );

      expect(response.status).toBe(200);

      expect(
        response.body.data.status
      ).toBe("Completed");

      expect(
        response.body.data.lessonsLearned
      ).toEqual(lessons);
    }
  );

  // ==================================================
  // TEST 7
  // ==================================================

  it(
    "should allow admin to approve completed RCA",
    async () => {
      const response =
        await request(app)
          .put(
            `/api/v1/rcas/${rcaMongoId}`
          )
          .set(
            "Authorization",
            `Bearer ${adminToken}`
          )
          .send({
            status: "Approved",
          });

      console.log(
        "APPROVE RCA WITH LESSONS RESPONSE:",
        response.body
      );

      expect(response.status).toBe(200);

      expect(
        response.body.data.status
      ).toBe("Approved");
    }
  );

  // ==================================================
  // TEST 8
  // ==================================================

  it(
    "should prevent lessons learned modification after approval",
    async () => {
      const response =
        await request(app)
          .put(
            `/api/v1/rcas/${rcaMongoId}`
          )
          .set(
            "Authorization",
            `Bearer ${adminToken}`
          )
          .send({
            lessonsLearned: [
              "This should not be saved",
            ],
          });

      console.log(
        "APPROVED LESSONS UPDATE RESPONSE:",
        response.body
      );

      expect(response.status).toBe(400);

      expect(
        response.body.message
      ).toBe(
        "Approved RCA cannot be modified"
      );
    }
  );

  // ==================================================
  // TEST 9
  // ==================================================

  it(
    "should preserve lessons learned after approval",
    async () => {
      const response =
        await request(app)
          .get(
            `/api/v1/rcas/${rcaMongoId}`
          )
          .set(
            "Authorization",
            `Bearer ${adminToken}`
          );

      console.log(
        "FINAL LESSONS RESPONSE:",
        response.body
      );

      expect(response.status).toBe(200);

      expect(
        response.body.data.status
      ).toBe("Approved");

      expect(
        response.body.data.lessonsLearned
      ).toEqual([
        "Monitor database performance",
        "Review capacity regularly",
      ]);
    }
  );

  // ==================================================
  // CLEANUP
  // ==================================================

  afterAll(async () => {
    console.log(
      "RCA Lessons Learned test cleanup started."
    );

    /*
     * Delete the test organization.
     *
     * Depending on your project's Organization model,
     * related users/problems/RCAs may remain.
     * For now, close the MongoDB connection cleanly.
     */

    if (organizationId) {
      try {
        await Organization.findByIdAndDelete(
          organizationId
        );
      } catch (error) {
        console.log(
          "Organization cleanup failed:",
          error
        );
      }
    }

    await mongoose.connection.close();

    console.log(
      "RCA Lessons Learned MongoDB connection closed."
    );
  });
});