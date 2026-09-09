import dotenv from "dotenv";
dotenv.config();

import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import app from "../src/app";
import { connectDB } from "../src/config/db";
import AuthUser from "../src/modules/auth/auth.model";
import { TEST_ADMIN_EMAIL, TEST_EMPLOYEE_EMAIL } from "./test-fixtures";
import KnowledgeBase from "../src/modules/knowledge-base/knowledgeBase.model";

jest.setTimeout(60000);

describe("Knowledge Base API", () => {
  // ==========================================
  // TEST ORGANIZATION
  // ==========================================

  let organizationId: string;

  // Different organization for multi-tenant testing
  const otherOrganizationId =
    "6a856a1ea3cc73b2aa648307";

  // ==========================================
  // TEST USERS
  // ==========================================

  let employeeId: string;

  let adminId: string;

  let createdArticleId: string | undefined;

  // ==========================================
  // DATABASE SETUP
  // ==========================================

  beforeAll(async () => {
    console.log("=================================");
    console.log("CONNECTING TO MONGODB...");
    console.log("=================================");

    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }

    console.log("=================================");
    console.log(
      "MONGODB CONNECTION STATE:",
      mongoose.connection.readyState
    );
    console.log("=================================");

    if (mongoose.connection.readyState !== 1) {
      throw new Error(
        "MongoDB connection was not established."
      );
    }
  }, 60000);

  // ==========================================
  // DATABASE CLEANUP
  // ==========================================

  afterAll(async () => {
    if (createdArticleId) {
      console.log(
        "Cleaning up created knowledge base article..."
      );

      await KnowledgeBase.findByIdAndDelete(
        createdArticleId
      );
    }

    if (mongoose.connection.readyState !== 0) {
      console.log(
        "Closing MongoDB connection..."
      );

      await mongoose.connection.close();

      console.log(
        "MongoDB connection closed."
      );
    }
  }, 30000);

  // ==========================================
  // EMPLOYEE TOKEN
  // ==========================================

  let employeeToken: string;
  let adminToken: string;
  let otherOrganizationAdminToken: string;
  beforeAll(async () => {
    const admin = await AuthUser.findOne({ email: TEST_ADMIN_EMAIL });
    const employee = await AuthUser.findOne({ email: TEST_EMPLOYEE_EMAIL });
    if (!admin || !employee) throw new Error("Shared test fixtures are unavailable");
    adminId = admin._id.toString();
    employeeId = employee._id.toString();
    organizationId = admin.organizationId.toString();
    employeeToken = jwt.sign(
      {
        id: employeeId,
        email: "employee.test@example.com",
        role: "employee",
        organizationId,
      },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "1h",
      }
    );

    // ==========================================
    // ADMIN TOKEN
    // ==========================================

    adminToken = jwt.sign(
      {
        id: adminId,
        email: "aliya.admin@example.com",
        role: "admin",
        organizationId,
      },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "1h",
      }
    );

    // ==========================================
    // OTHER ORGANIZATION ADMIN TOKEN
    // ==========================================

    otherOrganizationAdminToken = jwt.sign(
      {
        id: new mongoose.Types.ObjectId().toString(),
        email: "other.admin@example.com",
        role: "admin",
        organizationId: otherOrganizationId,
      },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "1h",
      }
    );

  });

  // ==========================================
  // UNAUTHENTICATED GET
  // ==========================================

  it(
    "should reject unauthenticated requests to get knowledge base articles",
    async () => {
      const response = await request(app).get(
        "/api/v1/knowledge-base"
      );

      expect(response.status).toBe(401);

      expect(response.body).toHaveProperty(
        "success",
        false
      );
    }
  );

  // ==========================================
  // UNAUTHENTICATED CREATE
  // ==========================================

  it(
    "should reject unauthenticated knowledge base creation",
    async () => {
      const response = await request(app)
        .post("/api/v1/knowledge-base")
        .send({
          title: "Test Knowledge Article",
          content:
            "Test knowledge base content",
        });

      expect(response.status).toBe(401);

      expect(response.body).toHaveProperty(
        "success",
        false
      );
    }
  );

  // ==========================================
  // EMPLOYEE CREATE - RBAC
  // ==========================================

  it(
    "should prevent employees from creating knowledge base articles",
    async () => {
      const response = await request(app)
        .post("/api/v1/knowledge-base")
        .set(
          "Authorization",
          `Bearer ${employeeToken}`
        )
        .send({
          title: "Employee Test Article",
          content:
            "Should not be created",
        });

      expect(response.status).toBe(403);

      expect(response.body).toHaveProperty(
        "success",
        false
      );
    }
  );

  // ==========================================
  // ADMIN CREATE
  // ==========================================

  it(
    "should allow an admin to create a knowledge base article",
    async () => {
      const response = await request(app)
        .post("/api/v1/knowledge-base")
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        )
        .send({
          title: `Automated Test Article ${Date.now()}`,
          content:
            "Created by automated test",
          category: "Technical",
          isPublished: true,
        });

      console.log(
        "ADMIN CREATE RESPONSE:",
        response.body
      );

      expect(response.status).toBe(201);

      expect(response.body).toHaveProperty(
        "success",
        true
      );

      expect(response.body).toHaveProperty(
        "message",
        "Knowledge base article created successfully"
      );

      expect(response.body.data).toBeDefined();

      expect(response.body.data.title).toBeDefined();

      expect(response.body.data.content).toBe(
        "Created by automated test"
      );

      expect(
        response.body.data.organizationId
      ).toBe(organizationId);

      expect(
        response.body.data.isPublished
      ).toBe(true);

      expect(
        response.body.data._id
      ).toBeDefined();

      createdArticleId =
        response.body.data._id;
    }
  );

  // ==========================================
  // CREATE - MISSING TITLE
  // ==========================================

  it(
    "should reject knowledge base creation without a title",
    async () => {
      const response = await request(app)
        .post("/api/v1/knowledge-base")
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        )
        .send({
          content:
            "Article without a title",
        });

      expect(response.status).toBe(400);

      expect(response.body).toHaveProperty(
        "success",
        false
      );

      expect(response.body.message).toBe(
        "Title and content are required"
      );
    }
  );

  // ==========================================
  // CREATE - MISSING CONTENT
  // ==========================================

  it(
    "should reject knowledge base creation without content",
    async () => {
      const response = await request(app)
        .post("/api/v1/knowledge-base")
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        )
        .send({
          title:
            "Article without content",
        });

      expect(response.status).toBe(400);

      expect(response.body).toHaveProperty(
        "success",
        false
      );

      expect(response.body.message).toBe(
        "Title and content are required"
      );
    }
  );

  // ==========================================
  // EMPLOYEE GET ALL
  // ==========================================

  it(
    "should allow employees to get knowledge base articles",
    async () => {
      const response = await request(app)
        .get("/api/v1/knowledge-base")
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

      expect(
        response.body.data.length
      ).toBeGreaterThan(0);
    }
  );

  // ==========================================
  // ADMIN GET ALL
  // ==========================================

  it(
    "should allow admins to get knowledge base articles",
    async () => {
      const response = await request(app)
        .get("/api/v1/knowledge-base")
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

      expect(
        response.body.data.length
      ).toBeGreaterThan(0);
    }
  );

  // ==========================================
  // EMPLOYEE GET BY ID
  // ==========================================

  it(
    "should allow employees to get a knowledge base article by ID",
    async () => {
      expect(createdArticleId).toBeDefined();

      const response = await request(app)
        .get(
          `/api/v1/knowledge-base/${createdArticleId}`
        )
        .set(
          "Authorization",
          `Bearer ${employeeToken}`
        );

      expect(response.status).toBe(200);

      expect(response.body).toHaveProperty(
        "success",
        true
      );

      expect(response.body.data).toBeDefined();

      expect(response.body.data._id).toBe(
        createdArticleId
      );
      expect(response.body.data.createdBy).toEqual(
        expect.objectContaining({
          _id: adminId,
          name: expect.any(String),
        })
      );
    }
  );

  // ==========================================
  // ADMIN GET BY ID
  // ==========================================

  it(
    "should allow admins to get a knowledge base article by ID",
    async () => {
      expect(createdArticleId).toBeDefined();

      const response = await request(app)
        .get(
          `/api/v1/knowledge-base/${createdArticleId}`
        )
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        );

      expect(response.status).toBe(200);

      expect(response.body).toHaveProperty(
        "success",
        true
      );

      expect(response.body.data._id).toBe(
        createdArticleId
      );
    }
  );

  // ==========================================
  // INVALID ARTICLE ID
  // ==========================================

  it(
    "should return 404 for an invalid knowledge base article ID",
    async () => {
      const response = await request(app)
        .get(
          "/api/v1/knowledge-base/invalid-id"
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

      expect(response.body.message).toBe(
        "Knowledge base article not found"
      );
    }
  );

  // ==========================================
  // NONEXISTENT ARTICLE
  // ==========================================

  it(
    "should return 404 for a nonexistent knowledge base article",
    async () => {
      const nonexistentId =
        new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .get(
          `/api/v1/knowledge-base/${nonexistentId}`
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

      expect(response.body.message).toBe(
        "Knowledge base article not found"
      );
    }
  );

  // ==========================================
  // MULTI-TENANT ISOLATION - GET BY ID
  // ==========================================

  it(
    "should prevent another organization from accessing the article",
    async () => {
      expect(createdArticleId).toBeDefined();

      const response = await request(app)
        .get(
          `/api/v1/knowledge-base/${createdArticleId}`
        )
        .set(
          "Authorization",
          `Bearer ${otherOrganizationAdminToken}`
        );

      expect(response.status).toBe(404);

      expect(response.body).toHaveProperty(
        "success",
        false
      );
    }
  );

  // ==========================================
  // EMPLOYEE UPDATE - RBAC
  // ==========================================

  it(
    "should prevent employees from updating knowledge base articles",
    async () => {
      expect(createdArticleId).toBeDefined();

      const response = await request(app)
        .put(
          `/api/v1/knowledge-base/${createdArticleId}`
        )
        .set(
          "Authorization",
          `Bearer ${employeeToken}`
        )
        .send({
          content:
            "Employee should not update this",
        });

      expect(response.status).toBe(403);

      expect(response.body).toHaveProperty(
        "success",
        false
      );
    }
  );

  // ==========================================
  // ADMIN UPDATE
  // ==========================================

  it(
    "should allow an admin to update a knowledge base article",
    async () => {
      expect(createdArticleId).toBeDefined();

      const response = await request(app)
        .put(
          `/api/v1/knowledge-base/${createdArticleId}`
        )
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        )
        .send({
          content:
            "Updated by automated test",
          isPublished: false,
        });

      console.log(
        "ADMIN UPDATE RESPONSE:",
        response.body
      );

      expect(response.status).toBe(200);

      expect(response.body).toHaveProperty(
        "success",
        true
      );

      expect(response.body).toHaveProperty(
        "message",
        "Knowledge base article updated successfully"
      );

      expect(
        response.body.data.content
      ).toBe(
        "Updated by automated test"
      );

      expect(
        response.body.data.isPublished
      ).toBe(false);
    }
  );

  // ==========================================
  // MULTI-TENANT ISOLATION - UPDATE
  // ==========================================

  it(
    "should prevent another organization from updating the article",
    async () => {
      expect(createdArticleId).toBeDefined();

      const response = await request(app)
        .put(
          `/api/v1/knowledge-base/${createdArticleId}`
        )
        .set(
          "Authorization",
          `Bearer ${otherOrganizationAdminToken}`
        )
        .send({
          content:
            "Other organization attempted update",
        });

      expect(response.status).toBe(404);

      expect(response.body).toHaveProperty(
        "success",
        false
      );
    }
  );

  // ==========================================
  // EMPLOYEE DELETE - RBAC
  // ==========================================

  it(
    "should prevent employees from deleting knowledge base articles",
    async () => {
      expect(createdArticleId).toBeDefined();

      const response = await request(app)
        .delete(
          `/api/v1/knowledge-base/${createdArticleId}`
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

  // ==========================================
  // MULTI-TENANT ISOLATION - DELETE
  // ==========================================

  it(
    "should prevent another organization from deleting the article",
    async () => {
      expect(createdArticleId).toBeDefined();

      const response = await request(app)
        .delete(
          `/api/v1/knowledge-base/${createdArticleId}`
        )
        .set(
          "Authorization",
          `Bearer ${otherOrganizationAdminToken}`
        );

      expect(response.status).toBe(404);

      expect(response.body).toHaveProperty(
        "success",
        false
      );
    }
  );

  // ==========================================
  // ADMIN DELETE
  // ==========================================

  it(
    "should allow an admin to delete a knowledge base article",
    async () => {
      expect(createdArticleId).toBeDefined();

      const response = await request(app)
        .delete(
          `/api/v1/knowledge-base/${createdArticleId}`
        )
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        );

      console.log(
        "ADMIN DELETE RESPONSE:",
        response.body
      );

      expect(response.status).toBe(200);

      expect(response.body).toHaveProperty(
        "success",
        true
      );

      expect(response.body).toHaveProperty(
        "message",
        "Knowledge base article deleted successfully"
      );

      expect(response.body.data).toBeDefined();

      createdArticleId = undefined;
    }
  );

  it(
    "should search tenant-scoped KB content by title, body, and category",
    async () => {
      const articleOne = await request(app)
        .post("/api/v1/knowledge-base")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "VPN access troubleshooting",
          content: "Reset the VPN client after certificate rotation.",
          category: "Technical",
          articleType: "Troubleshooting Guide",
          isPublished: true,
        });

      const articleTwo = await request(app)
        .post("/api/v1/knowledge-base")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "Password reset FAQ",
          content: "Users can reset passwords through the self-service portal.",
          category: "Access",
          articleType: "FAQ",
          isPublished: true,
        });

      expect(articleOne.status).toBe(201);
      expect(articleTwo.status).toBe(201);

      const response = await request(app)
        .get("/api/v1/knowledge-base/search")
        .set("Authorization", `Bearer ${employeeToken}`)
        .query({ q: "vpn reset" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.some((item: any) => item.title.includes("VPN"))).toBe(true);
      expect(response.body.data.some((item: any) => item.title.includes("Password"))).toBe(false);
    }
  );

  it(
    "should not leak KB search results across tenants",
    async () => {
      const otherOrgArticle = await request(app)
        .post("/api/v1/knowledge-base")
        .set("Authorization", `Bearer ${otherOrganizationAdminToken}`)
        .send({
          title: "Another tenant VPN issue",
          content: "This should not appear in the primary tenant search.",
          category: "Technical",
          articleType: "Article",
          isPublished: true,
        });

      expect(otherOrgArticle.status).toBe(201);

      const response = await request(app)
        .get("/api/v1/knowledge-base/search")
        .set("Authorization", `Bearer ${employeeToken}`)
        .query({ q: "VPN issue" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.some((item: any) => item.organizationId === otherOrganizationId)).toBe(false);
    }
  );

  it(
    "should validate supported article types",
    async () => {
      const response = await request(app)
        .post("/api/v1/knowledge-base")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "Invalid article type",
          content: "This should fail validation.",
          articleType: "Unknown Type",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Article type must be one of: Article, FAQ, Troubleshooting Guide, SOP");
    }
  );

  it(
    "should allow attachment metadata to be added and read only within the tenant",
    async () => {
      const articleResponse = await request(app)
        .post("/api/v1/knowledge-base")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "Attachment article",
          content: "This article has an attached document.",
          category: "Documentation",
          articleType: "Article",
          isPublished: true,
        });

      expect(articleResponse.status).toBe(201);
      const articleId = articleResponse.body.data._id;

      const addAttachmentResponse = await request(app)
        .post(`/api/v1/knowledge-base/${articleId}/attachments`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          filename: "vpn-guide.pdf",
          mimeType: "application/pdf",
          size: 1200,
          storageKey: "tenant/secure/vpn-guide.pdf",
        });

      expect(addAttachmentResponse.status).toBe(201);
      expect(addAttachmentResponse.body.success).toBe(true);
      expect(addAttachmentResponse.body.data.filename).toBe("vpn-guide.pdf");

      const readResponse = await request(app)
        .get(`/api/v1/knowledge-base/${articleId}/attachments`)
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(readResponse.status).toBe(200);
      expect(readResponse.body.success).toBe(true);
      expect(readResponse.body.data).toHaveLength(1);

      const otherTenantResponse = await request(app)
        .get(`/api/v1/knowledge-base/${articleId}/attachments`)
        .set("Authorization", `Bearer ${otherOrganizationAdminToken}`);

      expect(otherTenantResponse.status).toBe(404);
      expect(otherTenantResponse.body.success).toBe(false);
    }
  );

  it(
    "should reject invalid attachment access and unknown attachment IDs",
    async () => {
      const articleResponse = await request(app)
        .post("/api/v1/knowledge-base")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "Invalid attachment access",
          content: "This article checks invalid attachment paths.",
          articleType: "SOP",
          isPublished: true,
        });

      expect(articleResponse.status).toBe(201);
      const articleId = articleResponse.body.data._id;

      const missingAttachment = await request(app)
        .get(`/api/v1/knowledge-base/${articleId}/attachments/invalid-id`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(missingAttachment.status).toBe(404);
      expect(missingAttachment.body.success).toBe(false);
    }
  );

  it(
    "should restrict employee visibility to published tenant knowledge base articles",
    async () => {
      const suffix = Date.now().toString();
      const [publishedArticle, unpublishedArticle] = await KnowledgeBase.create([
        {
          title: `Published visibility article ${suffix}`,
          content: `published-visibility-${suffix}`,
          articleType: "Article",
          organizationId,
          createdBy: adminId,
          isPublished: true,
        },
        {
          title: `Unpublished visibility article ${suffix}`,
          content: `unpublished-visibility-${suffix}`,
          articleType: "FAQ",
          organizationId,
          createdBy: adminId,
          isPublished: false,
        },
      ]);

      try {
        const publishedArticleId = publishedArticle._id.toString();
        const unpublishedArticleId = unpublishedArticle._id.toString();

        const adminListResponse = await request(app)
          .get("/api/v1/knowledge-base")
          .set("Authorization", `Bearer ${adminToken}`);

        expect(adminListResponse.status).toBe(200);
        expect(
          adminListResponse.body.data.some(
            (article: { _id: string }) => article._id === publishedArticleId
          )
        ).toBe(true);
        expect(
          adminListResponse.body.data.some(
            (article: { _id: string }) => article._id === unpublishedArticleId
          )
        ).toBe(true);

        const employeeListResponse = await request(app)
          .get("/api/v1/knowledge-base")
          .set("Authorization", `Bearer ${employeeToken}`);

        expect(employeeListResponse.status).toBe(200);
        expect(
          employeeListResponse.body.data.every(
            (article: { isPublished: boolean }) => article.isPublished
          )
        ).toBe(true);
        expect(
          employeeListResponse.body.data.some(
            (article: { _id: string }) => article._id === publishedArticleId
          )
        ).toBe(true);
        expect(
          employeeListResponse.body.data.some(
            (article: { _id: string }) => article._id === unpublishedArticleId
          )
        ).toBe(false);

        const employeeSearchResponse = await request(app)
          .get("/api/v1/knowledge-base/search")
          .query({ q: `unpublished-visibility-${suffix}` })
          .set("Authorization", `Bearer ${employeeToken}`);

        expect(employeeSearchResponse.status).toBe(200);
        expect(employeeSearchResponse.body.data).toHaveLength(0);

        const unpublishedDetailResponse = await request(app)
          .get(`/api/v1/knowledge-base/${unpublishedArticleId}`)
          .set("Authorization", `Bearer ${employeeToken}`);

        expect(unpublishedDetailResponse.status).toBe(404);

        const publishedDetailResponse = await request(app)
          .get(`/api/v1/knowledge-base/${publishedArticleId}`)
          .set("Authorization", `Bearer ${employeeToken}`);

        expect(publishedDetailResponse.status).toBe(200);

        const crossTenantResponse = await request(app)
          .get(`/api/v1/knowledge-base/${publishedArticleId}`)
          .set("Authorization", `Bearer ${otherOrganizationAdminToken}`);

        expect(crossTenantResponse.status).toBe(404);
      } finally {
        await KnowledgeBase.deleteMany({
          _id: { $in: [publishedArticle._id, unpublishedArticle._id] },
        });
      }
    }
  );
});
