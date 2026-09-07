import "dotenv/config";

import request from "supertest";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

import app from "../src/app";

import AuthUser from "../src/modules/auth/auth.model";
import Organization from "../src/modules/organization/organization.model";
import ServiceRequest from "../src/modules/service-request/serviceRequest.model";
import SupportTeam from "../src/modules/support-team/supportTeam.model";

// ==========================================
// JEST CONFIG
// ==========================================

jest.setTimeout(30000);

describe("Service Request Management API", () => {
  // ==========================================
  // TEST VARIABLES
  // ==========================================

  let organizationId: string;

  let adminToken: string;
  let employeeToken: string;
  let secondEmployeeToken: string;
  let supportAdminToken: string;

  let adminId: string;
  let employeeId: string;
  let secondEmployeeId: string;
  let supportAdminId: string;
  let unassignedAdminId: string;
  let inactiveAdminId: string;
  let otherAdminId: string;
  let otherOrganizationId: string;
  let supportTeamId: string;

  let serviceRequestId: string;

  // ==========================================
  // SETUP
  // ==========================================

  beforeAll(async () => {
    console.log("Connecting test database...");

    // ------------------------------------------
    // CONNECT TO MONGODB
    // ------------------------------------------

    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error(
        "MONGO_URI is not defined in the environment variables."
      );
    }

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    console.log("Test database connected.");

    // ------------------------------------------
    // CREATE ORGANIZATION
    // ------------------------------------------

    const timestamp = Date.now();

    const organization = await Organization.create({
      name: `Service Request Test Organization ${timestamp}`,
      slug: `service-request-test-${timestamp}`,
      description: "Organization for service request tests",
    });

    organizationId = organization._id.toString();

    console.log(
      "Test organization created:",
      organizationId
    );

    // ------------------------------------------
    // CREATE PASSWORD HASH
    // ------------------------------------------

    const password = await bcrypt.hash(
      "TestPassword123",
      10
    );

    // ------------------------------------------
    // CREATE ADMIN
    // ------------------------------------------

    const admin = await AuthUser.create({
      name: "Service Request Admin",
      email: `service.admin.${timestamp}@example.com`,
      password,
      role: "admin",
      organizationId,
      isActive: true,
      isEmailVerified: true,
    });

    adminId = admin._id.toString();

    // ------------------------------------------
    // CREATE EMPLOYEE
    // ------------------------------------------

    const employee = await AuthUser.create({
      name: "Service Request Employee",
      email: `service.employee.${timestamp}@example.com`,
      password,
      role: "employee",
      organizationId,
      isActive: true,
      isEmailVerified: true,
    });

    employeeId = employee._id.toString();

    // ------------------------------------------
    // CREATE SECOND EMPLOYEE
    // ------------------------------------------

    const secondEmployee = await AuthUser.create({
      name: "Second Service Employee",
      email: `service.employee2.${timestamp}@example.com`,
      password,
      role: "employee",
      organizationId,
      isActive: true,
      isEmailVerified: true,
    });

    secondEmployeeId = secondEmployee._id.toString();

    const supportAdmin = await AuthUser.create({
      name: "Service Request Support Admin",
      email: `service.support.admin.${timestamp}@example.com`,
      password,
      role: "admin",
      organizationId,
      isActive: true,
      isEmailVerified: true,
    });
    supportAdminId = supportAdmin._id.toString();

    const unassignedAdmin = await AuthUser.create({
      name: "Service Request Unassigned Admin",
      email: `service.unassigned.admin.${timestamp}@example.com`,
      password,
      role: "admin",
      organizationId,
      isActive: true,
      isEmailVerified: true,
    });
    unassignedAdminId = unassignedAdmin._id.toString();

    const inactiveAdmin = await AuthUser.create({
      name: "Service Request Inactive Admin",
      email: `service.inactive.admin.${timestamp}@example.com`,
      password,
      role: "admin",
      organizationId,
      isActive: false,
      isEmailVerified: true,
    });
    inactiveAdminId = inactiveAdmin._id.toString();

    const otherOrganization = await Organization.create({
      name: `Service Request Other Organization ${timestamp}`,
      slug: `service-request-other-${timestamp}`,
      description: "Cross-tenant service request assignment fixture",
    });
    otherOrganizationId = otherOrganization._id.toString();
    const otherAdmin = await AuthUser.create({
      name: "Service Request Other Admin",
      email: `service.other.admin.${timestamp}@example.com`,
      password,
      role: "admin",
      organizationId: otherOrganizationId,
      isActive: true,
      isEmailVerified: true,
    });
    otherAdminId = otherAdmin._id.toString();

    const supportTeam = await SupportTeam.create({
      name: `Service Request Support Team ${timestamp}`,
      organizationId,
      members: [supportAdminId],
      isActive: true,
    });
    supportTeamId = supportTeam._id.toString();

    // ==========================================
    // LOGIN ADMIN
    // ==========================================

    console.log("Logging in admin...");

    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: admin.email,
        password: "TestPassword123",
      });

    console.log(
      "Admin login status:",
      adminLogin.status
    );

    console.log(
      "Admin login response:",
      adminLogin.body
    );

    expect(adminLogin.status).toBe(200);

    // Token is returned inside data.token
    expect(adminLogin.body).toHaveProperty(
      "data.token"
    );

    adminToken = adminLogin.body.data.token;

    expect(adminToken).toBeTruthy();

    // ==========================================
    // LOGIN EMPLOYEE
    // ==========================================

    console.log("Logging in employee...");

    const employeeLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: employee.email,
        password: "TestPassword123",
      });

    console.log(
      "Employee login status:",
      employeeLogin.status
    );

    console.log(
      "Employee login response:",
      employeeLogin.body
    );

    expect(employeeLogin.status).toBe(200);

    // Token is returned inside data.token
    expect(employeeLogin.body).toHaveProperty(
      "data.token"
    );

    employeeToken = employeeLogin.body.data.token;

    expect(employeeToken).toBeTruthy();

    // ==========================================
    // LOGIN SECOND EMPLOYEE
    // ==========================================

    console.log(
      "Logging in second employee..."
    );

    const secondEmployeeLogin =
      await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: secondEmployee.email,
          password: "TestPassword123",
        });

    console.log(
      "Second employee login status:",
      secondEmployeeLogin.status
    );

    console.log(
      "Second employee login response:",
      secondEmployeeLogin.body
    );

    expect(
      secondEmployeeLogin.status
    ).toBe(200);

    // Token is returned inside data.token
    expect(
      secondEmployeeLogin.body
    ).toHaveProperty("data.token");

    secondEmployeeToken =
      secondEmployeeLogin.body.data.token;

    expect(secondEmployeeToken).toBeTruthy();

    const supportAdminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: supportAdmin.email,
        password: "TestPassword123",
      });
    expect(supportAdminLogin.status).toBe(200);
    supportAdminToken = supportAdminLogin.body.data.token;

    console.log(
      "Service Request test setup complete."
    );
  });

  // ==========================================
  // CLEANUP
  // ==========================================

  afterAll(async () => {
    console.log(
      "Cleaning Service Request test data..."
    );

    try {
      // ----------------------------------------
      // DELETE SERVICE REQUESTS
      // ----------------------------------------

      if (organizationId) {
        if (supportTeamId) {
          await SupportTeam.deleteOne({ _id: supportTeamId });
        }
        await ServiceRequest.deleteMany({
          organizationId,
        });

        // --------------------------------------
        // DELETE USERS
        // --------------------------------------

        await AuthUser.deleteMany({
          organizationId,
        });

        // --------------------------------------
        // DELETE ORGANIZATION
        // --------------------------------------

        await Organization.deleteOne({
          _id: organizationId,
        });

        await AuthUser.deleteMany({ organizationId: otherOrganizationId });
        await Organization.deleteOne({ _id: otherOrganizationId });
      }

      console.log(
        "Service Request test cleanup complete."
      );
    } finally {
      // ----------------------------------------
      // CLOSE MONGODB CONNECTION
      // ----------------------------------------

      if (
        mongoose.connection.readyState !== 0
      ) {
        await mongoose.connection.close();
      }

      console.log(
        "Test database connection closed."
      );
    }
  });

  // ==========================================
  // AUTHENTICATION
  // ==========================================

  it(
    "should reject unauthenticated service request creation",
    async () => {
      const response = await request(app)
        .post("/api/v1/service-requests")
        .send({
          requestId: `SR-UNAUTH-${Date.now()}`,
          title: "Unauthorized Request",
          description:
            "Should not be created",
          type: "VPN Access",
        });

      expect(response.status).toBe(401);

      expect(response.body).toHaveProperty(
        "success",
        false
      );
    }
  );

  // ==========================================
  // CREATE
  // ==========================================

  it(
    "should allow an employee to create a service request",
    async () => {
      const response = await request(app)
        .post("/api/v1/service-requests")
        .set(
          "Authorization",
          `Bearer ${employeeToken}`
        )
        .send({
          title: "VPN Access Request",
          description:
            "Employee requires VPN access for remote work.",
          type: "VPN Access",
          priority: "High",
        });

      console.log(
        "CREATE SERVICE REQUEST RESPONSE:",
        response.body
      );

      expect(response.status).toBe(201);

      expect(response.body).toHaveProperty(
        "success",
        true
      );

      expect(response.body.data.requestId).toMatch(
        /^SR-\d{8}-\d{4}$/
      );

      expect(response.body.data).toHaveProperty(
        "status",
        "Pending"
      );

      expect(
        response.body.data.requestedBy
      ).toBeTruthy();

      expect(
        response.body.data.organizationId
      ).toBe(organizationId);

      serviceRequestId =
        response.body.data._id;

      expect(serviceRequestId).toBeTruthy();
    }
  );

  // ==========================================
  // ADMIN CREATE
  // ==========================================

  it(
    "should allow an admin to create a service request",
    async () => {
      const response = await request(app)
        .post("/api/v1/service-requests")
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        )
        .send({
          requestId: `SR-ADMIN-${Date.now()}`,
          title: "Software Installation",
          description:
            "Install required development software.",
          type: "Software Installation",
          priority: "Medium",
        });

      expect(response.status).toBe(201);

      expect(response.body).toHaveProperty(
        "success",
        true
      );

      expect(response.body.data).toHaveProperty(
        "status",
        "Pending"
      );
    }
  );

  // ==========================================
  // DUPLICATE REQUEST ID
  // ==========================================

  it(
    "should reject duplicate request IDs within the organization",
    async () => {
      const duplicateId =
        `SR-DUP-${Date.now()}`;

      const first = await request(app)
        .post("/api/v1/service-requests")
        .set(
          "Authorization",
          `Bearer ${employeeToken}`
        )
        .send({
          requestId: duplicateId,
          title: "First Request",
          description: "First request",
          type: "Email Access",
        });

      expect(first.status).toBe(201);

      const second = await request(app)
        .post("/api/v1/service-requests")
        .set(
          "Authorization",
          `Bearer ${employeeToken}`
        )
        .send({
          requestId: duplicateId,
          title: "Duplicate Request",
          description:
            "Duplicate request",
          type: "Email Access",
        });

      expect(second.status).toBe(400);

      expect(second.body).toHaveProperty(
        "success",
        false
      );
    }
  );

  // ==========================================
  // GET ALL
  // ==========================================

  it(
    "should allow employees to get all organization service requests",
    async () => {
      const response = await request(app)
        .get("/api/v1/service-requests")
        .set(
          "Authorization",
          `Bearer ${employeeToken}`
        );

      expect(response.status).toBe(200);

      expect(response.body).toHaveProperty(
        "success",
        true
      );

      expect(
        Array.isArray(response.body.data)
      ).toBe(true);

      expect(response.body.data.length).toBeGreaterThan(
        0
      );
    }
  );

  it(
    "should allow admins to get all organization service requests",
    async () => {
      const response = await request(app)
        .get("/api/v1/service-requests")
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        );

      expect(response.status).toBe(200);

      expect(response.body).toHaveProperty(
        "success",
        true
      );

      expect(
        Array.isArray(response.body.data)
      ).toBe(true);
    }
  );

  // ==========================================
  // GET BY ID
  // ==========================================

  it(
    "should allow employees to get a service request by ID",
    async () => {
      const response = await request(app)
        .get(
          `/api/v1/service-requests/${serviceRequestId}`
        )
        .set(
          "Authorization",
          `Bearer ${employeeToken}`
        );

      expect(response.status).toBe(200);

      expect(
        response.body.data
      ).toHaveProperty(
        "_id",
        serviceRequestId
      );
    }
  );

  it(
    "should return 404 for a nonexistent service request",
    async () => {
      const fakeId =
        new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .get(
          `/api/v1/service-requests/${fakeId}`
        )
        .set(
          "Authorization",
          `Bearer ${employeeToken}`
        );

      expect(response.status).toBe(404);

      expect(response.body).toHaveProperty(
        "success",
        false
      );
    }
  );

  // ==========================================
  // BASIC UPDATE
  // ==========================================

  it(
    "should allow the requester to update basic information",
    async () => {
      const response = await request(app)
        .put(
          `/api/v1/service-requests/${serviceRequestId}`
        )
        .set(
          "Authorization",
          `Bearer ${employeeToken}`
        )
        .send({
          description:
            "Updated VPN access requirements.",
          priority: "Critical",
        });

      console.log(
        "BASIC UPDATE RESPONSE:",
        response.body
      );

      expect(response.status).toBe(200);

      expect(response.body).toHaveProperty(
        "success",
        true
      );

      expect(
        response.body.data
      ).toHaveProperty(
        "priority",
        "Critical"
      );

      expect(
        response.body.data
      ).toHaveProperty(
        "description",
        "Updated VPN access requirements."
      );
    }
  );

  // ==========================================
  // EMPLOYEE CANNOT ASSIGN
  // ==========================================

  it(
    "should prevent employees from assigning service requests",
    async () => {
      const response = await request(app)
        .put(
          `/api/v1/service-requests/${serviceRequestId}`
        )
        .set(
          "Authorization",
          `Bearer ${employeeToken}`
        )
        .send({
          assignedTo: secondEmployeeId,
        });

      expect(response.status).toBe(403);

      expect(
        response.body.message
      ).toBe(
        "Employees cannot assign service requests"
      );
    }
  );

  // ==========================================
  // ADMIN ASSIGN
  // ==========================================

  it(
    "should reject employee, unassigned admin, inactive admin, and cross-tenant admin assignees",
    async () => {
      for (const targetId of [
        employeeId,
        unassignedAdminId,
        inactiveAdminId,
        otherAdminId,
      ]) {
        const response = await request(app)
          .put(`/api/v1/service-requests/${serviceRequestId}`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ assignedTo: targetId });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
          "Assigned user must be an eligible operational assignee"
        );
      }
    }
  );

  it(
    "should allow an admin to assign a service request to an eligible support admin",
    async () => {
      const response = await request(app)
        .put(`/api/v1/service-requests/${serviceRequestId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ assignedTo: supportAdminId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.assignedTo._id).toBe(supportAdminId);
    }
  );

  // ==========================================
  // EMPLOYEE CANNOT APPROVE
  // ==========================================

  it(
    "should prevent employees from approving service requests",
    async () => {
      const response = await request(app)
        .put(
          `/api/v1/service-requests/${serviceRequestId}`
        )
        .set(
          "Authorization",
          `Bearer ${employeeToken}`
        )
        .send({
          status: "Approved",
        });

      expect(response.status).toBe(403);

      expect(
        response.body.message
      ).toBe(
        "Employees cannot approve service requests"
      );
    }
  );

  // ==========================================
  // ADMIN APPROVAL
  // ==========================================

  it(
    "should allow an admin to approve a service request",
    async () => {
      const response = await request(app)
        .put(
          `/api/v1/service-requests/${serviceRequestId}`
        )
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        )
        .send({
          status: "Approved",
        });

      console.log(
        "ADMIN APPROVAL RESPONSE:",
        response.body
      );

      expect(response.status).toBe(200);

      expect(response.body).toHaveProperty(
        "success",
        true
      );

      expect(
        response.body.data
      ).toHaveProperty(
        "status",
        "Approved"
      );

      expect(
        response.body.data.approvedBy
      ).toBeTruthy();

      expect(
        response.body.data.approvedBy._id
      ).toBe(adminId);

      expect(
        response.body.data.approvedAt
      ).toBeTruthy();
    }
  );

  // ==========================================
  // START REQUEST
  // ==========================================

  it(
    "should prevent an employee from starting a request as an operational worker",
    async () => {
      const response = await request(app)
        .put(
          `/api/v1/service-requests/${serviceRequestId}`
        )
        .set(
          "Authorization",
          `Bearer ${employeeToken}`
        )
        .send({
          status: "In Progress",
        });

      console.log(
        "IN PROGRESS RESPONSE:",
        response.body
      );

      expect(response.status).toBe(403);
      expect(response.body.message).toBe(
        "Employees cannot perform operational service request transitions"
      );
    }
  );

  // ==========================================
  // COMPLETE REQUEST
  // ==========================================

  it(
    "should prevent an employee from completing a request as an operational worker",
    async () => {
      const response = await request(app)
        .put(
          `/api/v1/service-requests/${serviceRequestId}`
        )
        .set(
          "Authorization",
          `Bearer ${employeeToken}`
        )
        .send({
          status: "Completed",
        });

      console.log(
        "COMPLETED RESPONSE:",
        response.body
      );

      expect(response.status).toBe(403);
      expect(response.body.message).toBe(
        "Employees cannot perform operational service request transitions"
      );
    }
  );

  it(
    "should allow the assigned support admin to complete the approved request workflow",
    async () => {
      const startResponse = await request(app)
        .put(`/api/v1/service-requests/${serviceRequestId}`)
        .set("Authorization", `Bearer ${supportAdminToken}`)
        .send({ status: "In Progress" });

      expect(startResponse.status).toBe(200);
      expect(startResponse.body.data.status).toBe("In Progress");

      const completeResponse = await request(app)
        .put(`/api/v1/service-requests/${serviceRequestId}`)
        .set("Authorization", `Bearer ${supportAdminToken}`)
        .send({ status: "Completed" });

      expect(completeResponse.status).toBe(200);
      expect(completeResponse.body.data.status).toBe("Completed");
      expect(completeResponse.body.data.completedAt).toBeTruthy();
    }
  );

  it("preserves requester cancellation for a request that is still cancellable", async () => {
    const createResponse = await request(app)
      .post("/api/v1/service-requests")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({
        title: "Cancellable VPN Request",
        description: "This requester-safe action must remain available.",
        type: "VPN Access",
      });
    expect(createResponse.status).toBe(201);

    const cancelResponse = await request(app)
      .put(`/api/v1/service-requests/${createResponse.body.data._id}`)
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ status: "Cancelled" });

    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body.data.status).toBe("Cancelled");
  });

  // ==========================================
  // DELETE
  // ==========================================

  it(
    "should prevent employees from deleting service requests",
    async () => {
      const response = await request(app)
        .delete(
          `/api/v1/service-requests/${serviceRequestId}`
        )
        .set(
          "Authorization",
          `Bearer ${employeeToken}`
        );

      expect(response.status).toBe(403);

      expect(response.body).toHaveProperty(
        "success",
        false
      );
    }
  );

  it(
    "should allow admins to delete service requests",
    async () => {
      const response = await request(app)
        .delete(
          `/api/v1/service-requests/${serviceRequestId}`
        )
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        );

      console.log(
        "DELETE RESPONSE:",
        response.body
      );

      expect(response.status).toBe(200);

      expect(response.body).toHaveProperty(
        "success",
        true
      );

      expect(response.body.message).toBe(
        "Service request deleted successfully"
      );

      // ----------------------------------------
      // VERIFY DELETION
      // ----------------------------------------

      const verifyDeleted =
        await request(app)
          .get(
            `/api/v1/service-requests/${serviceRequestId}`
          )
          .set(
            "Authorization",
            `Bearer ${adminToken}`
          );

      expect(
        verifyDeleted.status
      ).toBe(404);

      expect(
        verifyDeleted.body
      ).toHaveProperty(
        "success",
        false
      );
    }
  );
});
