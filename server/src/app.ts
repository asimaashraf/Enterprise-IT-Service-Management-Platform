import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "./docs/openapi";
import { observeHttp } from "./observability/metrics";

// ==========================================
// ROUTES
// ==========================================

import authRoutes from "./modules/auth/auth.routes";
import organizationRoutes from "./modules/organization/organization.routes";
import userRoutes from "./modules/auth/user.routes";
import invitationRoutes from "./modules/invitation/invitation.routes";
import assetRoutes from "./modules/asset/asset.routes";
import incidentRoutes from "./modules/incident/incident.routes";
import slaRoutes from "./modules/sla/sla.routes";
import serviceRequestRoutes from "./modules/service-request/serviceRequest.routes";
import changeRoutes from "./modules/change/change.routes";
import problemRoutes from "./modules/problem/problem.routes";
import rcaRoutes from "./modules/rca/rca.routes";
import departmentRoutes from "./modules/department/department.routes";
import supportTeamRoutes from "./modules/support-team/supportTeam.routes";
import knowledgeBaseRoutes from "./modules/knowledge-base/knowledgeBase.routes";
import serviceCatalogRoutes from "./modules/service-catalog/serviceCatalog.routes";
import analyticsRoutes from "./modules/analytics/analytics.routes";
import notificationRoutes from "./modules/notification/notification.routes";
import auditRoutes from "./modules/audit/audit.routes";
import { auditMutations } from "./middleware/audit.middleware";

// ==========================================
// INCIDENT ASSIGNMENT RULE ROUTES
// ==========================================

import incidentAssignmentRuleRoutes from "./modules/incident-assignment/incidentAssignmentRule.routes";

// ==========================================
// INCIDENT ESCALATION ROUTES
// ==========================================

import incidentEscalationRoutes from "./modules/incident-escalation/incidentEscalation.routes";

// ==========================================
// BACKGROUND JOB ROUTES
// ==========================================

import jobsRoutes from "./modules/jobs/jobs.routes";

const app = express();

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(observeHttp);

app.get("/api-docs/openapi.json", (_req, res) => res.json(openApiDocument));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument, {
  customSiteTitle: "ITSM API",
  swaggerOptions: { persistAuthorization: false, validatorUrl: null, supportedSubmitMethods: ["get", "post", "put", "patch", "delete"] },
}));

app.use(
  cors({
    origin:
      process.env.CLIENT_URL ||
      "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(auditMutations);

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/api/v1/health", (_req, res) => {
  return res.status(200).json({
    success: true,
    message: "ITSM API is running",
  });
});

// ==========================================
// AUTH
// ==========================================

app.use(
  "/api/v1/auth",
  authRoutes
);

// ==========================================
// ORGANIZATIONS
// ==========================================

app.use(
  "/api/v1/organizations",
  organizationRoutes
);

// ==========================================
// USERS
// ==========================================

app.use(
  "/api/v1/users",
  userRoutes
);

// ==========================================
// INVITATIONS
// ==========================================

app.use(
  "/api/v1/invitations",
  invitationRoutes
);

// ==========================================
// ASSETS
// ==========================================

app.use(
  "/api/v1/assets",
  assetRoutes
);

// ==========================================
// INCIDENTS
// ==========================================

app.use(
  "/api/v1/incidents",
  incidentRoutes
);

// ==========================================
// INCIDENT ASSIGNMENT RULES
// ==========================================

app.use(
  "/api/v1/incident-assignment-rules",
  incidentAssignmentRuleRoutes
);

// ==========================================
// INCIDENT ESCALATION
// ==========================================

app.use(
  "/api/v1/incident-escalation",
  incidentEscalationRoutes
);

// ==========================================
// SLA
// ==========================================

app.use(
  "/api/v1/slas",
  slaRoutes
);

// ==========================================
// SERVICE REQUESTS
// ==========================================

app.use(
  "/api/v1/service-requests",
  serviceRequestRoutes
);

// ==========================================
// CHANGE MANAGEMENT
// ==========================================

app.use(
  "/api/v1/changes",
  changeRoutes
);

// ==========================================
// PROBLEM MANAGEMENT
// ==========================================

app.use(
  "/api/v1/problems",
  problemRoutes
);

// ==========================================
// ROOT CAUSE ANALYSIS
// ==========================================

// Normalize parser failures only for RCA; other modules keep their behavior.
const rcaJsonErrorHandler: express.ErrorRequestHandler = (error, _req, res, next) => {
  if (error?.type === "entity.parse.failed") {
    res.status(400).json({ success: false, message: "Request body must be a valid JSON object" });
    return;
  }
  next(error);
};

app.use(
  "/api/v1/rcas",
  rcaJsonErrorHandler,
  rcaRoutes
);

// ==========================================
// DEPARTMENTS
// ==========================================

app.use(
  "/api/v1/departments",
  departmentRoutes
);

// ==========================================
// SUPPORT TEAMS
// ==========================================

app.use(
  "/api/v1/support-teams",
  supportTeamRoutes
);

// ==========================================
// KNOWLEDGE BASE
// ==========================================

app.use(
  "/api/v1/knowledge-base",
  knowledgeBaseRoutes
);

// ==========================================
// SERVICE CATALOG
// ==========================================

app.use(
  "/api/v1/service-catalog",
  serviceCatalogRoutes
);

// ==========================================
// ANALYTICS
// ==========================================

app.use(
  "/api/v1/analytics",
  analyticsRoutes
);

// ==========================================
// NOTIFICATIONS
// ==========================================

app.use(
  "/api/v1/notifications",
  notificationRoutes
);

// ==========================================
// AUDIT LOGS
// ==========================================

app.use(
  "/api/v1/audit-logs",
  auditRoutes
);

// ==========================================
// BACKGROUND JOBS
// ==========================================

app.use(
  "/api/v1/jobs",
  jobsRoutes
);

// ==========================================
// 404 HANDLER
// ==========================================

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ==========================================
// EXPORT
// ==========================================

export default app;
