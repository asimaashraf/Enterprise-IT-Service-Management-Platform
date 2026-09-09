import routes from "./routes.generated.json";
import { array, bodies, id, object, ref, schemas, str, type Schema } from "./contracts";

const modules: Record<string, [string, string?]> = {
  auth: ["Authentication"], users: ["Users", "User"], invitations: ["Invitations"], organizations: ["Organizations", "Organization"], departments: ["Departments", "Department"],
  "support-teams": ["Support Teams", "SupportTeam"], incidents: ["Incidents", "Incident"], "service-requests": ["Service Requests", "ServiceRequest"], assets: ["Assets", "Asset"], slas: ["SLA", "SLA"],
  "incident-assignment-rules": ["Assignment Rules", "AssignmentRule"], "incident-escalation": ["Escalation Policies", "EscalationPolicy"], changes: ["Changes", "Change"], "knowledge-base": ["Knowledge Base", "KnowledgeBase"],
  problems: ["Problems", "Problem"], rcas: ["RCA", "RCA"], analytics: ["Analytics"], notifications: ["Notifications", "Notification"], "audit-logs": ["Audit Logs"], "service-catalog": ["Service Catalog", "ServiceCatalog"], jobs: ["Health / Operations"],
};
const notes: Record<string, string> = {
  auth: "Registration creates EMPLOYEE only. Bootstrap is a one-time token-gated operation. /me echoes JWT claims, not a fresh database profile. Password recovery uses emailed tokens; no authenticated change-password endpoint exists.",
  users: "ADMIN-only directory and safe name/email updates, including self-edit. Role and status use dedicated actions. Eligible assignees are active same-tenant ADMINs in active support teams.",
  incidents: "Tenant-scoped. EMPLOYEE is a requester; assignment and operational status/resolution changes require ADMIN. Omit incidentId on create to generate it.",
  "service-requests": "Tenant-scoped. EMPLOYEE may edit requester-safe details/cancel their own request; approval, assignment and operational progression require ADMIN. Omit requestId to generate it.",
  assets: "EMPLOYEE reads are limited to their assigned assets. ADMIN manages inventory and assignment. Maintenance and lifecycle histories are append-only through their supported actions.",
  changes: "EMPLOYEE reads their own requests and has requester-safe edits; approval/rejection, assignment and operational workflow require ADMIN. State transitions are validated by the backend.",
  rcas: "Authenticated reads; ADMIN-only mutations. Problem, incidents, author and action assignee references must satisfy existing tenant and eligibility validation. Workflow prerequisites are enforced.",
  "knowledge-base": "EMPLOYEE sees published articles only. Attachments are metadata, not a binary upload/download API.",
  analytics: "Both roles may read tenant analytics. Supply both startDate/endDate or neither, real YYYY-MM-DD dates, at most 366 inclusive days. No overview endpoint or server pagination. The legacy technician-performance URL reports ADMIN operational users.",
  notifications: "Reads, marks and deletion are scoped to the authenticated recipient and tenant. Direct creation requires ADMIN and an active same-tenant recipient.",
  "support-teams": "Members must be active same-tenant ADMINs. Backend read routes allow both roles; the frontend management page is ADMIN-only.",
  jobs: "Existing diagnostic job routes enqueue real work. Do not invoke against production for a documentation smoke check. The separate metrics listener serves /metrics on port 9464.",
  organizations: "Reads target the current tenant. Existing creation requires an authenticated ADMIN and creates an organization; documentation does not broaden this contract.",
};
const success = (data?: Schema): Schema => object({ success: { type: "boolean", enum: [true] }, message: str, count: { type: "integer" }, ...(data ? { data } : {}) }, ["success"]);
const descriptions: Record<number, string> = { 200: "Success", 201: "Created", 202: "Accepted", 204: "No content", 400: "Invalid input or business-rule rejection", 401: "Missing, invalid or expired bearer token", 403: "Role, ownership or tenant access denied", 404: "Record not found in the authorized scope", 409: "Conflict with existing records or relationships", 500: "Server error" };
const paths: Record<string, Schema> = {};
for (const route of routes) {
  const module = route.path.split("/")[3];
  const [tag, model] = modules[module];
  const path = route.path.replace(/:([A-Za-z][A-Za-z0-9]*)/g, "{$1}");
  const pathNames = [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
  const parameters: Schema[] = pathNames.map((name) => ({ name, in: "path", required: true, schema: /id$/i.test(name) ? id : str }));
  for (const name of route.queries.filter((name) => !pathNames.includes(name))) parameters.push({ name, in: "query", required: ["token", "q", "incidentPriority", "severity"].includes(name), schema: str });
  if (module === "analytics") for (const name of ["startDate", "endDate"]) parameters.push({ name, in: "query", required: false, schema: { type: "string", format: "date" }, description: "Supply both startDate and endDate or neither; maximum 366 inclusive days." });
  let responseModel = model;
  if (route.path.includes("corrective-actions")) responseModel = "CorrectiveAction";
  if (route.path.endsWith("/maintenance")) responseModel = "Maintenance";
  if (route.path.endsWith("/lifecycle")) responseModel = "Lifecycle";
  let data: Schema | undefined = responseModel ? ref(responseModel) : undefined;
  const list = route.method === "get" && (route.path === `/api/v1/${module}` || /\/(search|maintenance|lifecycle|corrective-actions|applicable)$/.test(route.path) || route.handler === "getApplicablePolicies" || route.handler === "getApplicableRules");
  if (data && list) data = array(data);
  if (["loginController", "registerController", "bootstrapController"].includes(route.handler)) data = ref("AuthSession");
  if (route.handler === "getCurrentUserController") data = ref("AuthUser");
  if (route.handler === "getEligibleOperationalAssigneesController") data = array(object({ id, name: str, email: str, role: { type: "string", enum: ["admin"] } }));
  if (route.handler === "getUnreadNotificationCountController") data = object({ unreadCount: { type: "integer" } });
  if (route.path.includes("attachments")) data = route.path.endsWith("/attachments") && route.method === "get" ? array(schemas.KnowledgeBase.properties.attachments.items) : schemas.KnowledgeBase.properties.attachments.items;
  // Message-only delete responses and variable diagnostic responses must not
  // promise an object the controller doesn't return.
  if (route.method === "delete" || route.handler === "markAllNotificationsAsReadController") data = undefined;
  const codes = new Set(route.statuses);
  if (route.authenticated) { codes.add(401); codes.add(403); }
  if (pathNames.some((n) => /id$/i.test(n))) codes.add(404);
  const responses: Schema = {};
  for (const code of [...codes].sort()) {
    const schema = code < 400 ? success(data ?? {}) : ref("Error");
    responses[code] = { description: descriptions[code] || "Response", ...(code === 204 ? {} : { content: { "application/json": { schema } } }) };
  }
  // A default documents unexpected/framework errors without pretending they
  // all use the API JSON envelope (e.g. Express malformed-JSON responses).
  responses.default = { description: "Unexpected/framework error; the response may be text or HTML." };
  if (route.handler === "exportIncidentPdfController") responses[200] = { description: "Incident PDF", content: { "application/pdf": { schema: { type: "string", format: "binary" } } } };
  const body = bodies[route.handler];
  paths[path] ||= {};
  paths[path][route.method] = {
    tags: [tag], operationId: `${route.handler}_${route.method}_${pathNames.join("_") || "collection"}`,
    summary: route.handler.replace(/Controller$/, "").replace(/([a-z])([A-Z])/g, "$1 $2"),
    description: `${route.admin ? "ADMIN required. " : route.authenticated ? "Authenticated. " : "Public. "}${notes[module] || "Existing organization-scoped API contract."}${list ? " Returns the full authorized collection; no server-side page/pageSize contract." : ""}`,
    security: route.authenticated ? [{ BearerAuth: [] }] : [],
    parameters, responses,
    ...(body ? { requestBody: { required: route.method === "post" && route.handler !== "createSLAController", content: { "application/json": { schema: body } } } } : {}),
  };
}
paths["/api/v1/health"] = { get: { tags: ["Health / Operations"], operationId: "health", summary: "API liveness (not dependency readiness)", security: [], responses: { 200: { description: "API process is serving HTTP", content: { "application/json": { schema: success() } } } } } };
export const openApiDocument = {
  openapi: "3.0.3", info: { title: "ITSM API", version: "1.0.0", description: "Existing /api/v1 API. ADMIN and EMPLOYEE are the only roles. Use Authorize with a valid JWT. Request schemas describe supported inputs; backend validation and tenant rules remain authoritative. Model response properties are generated from Mongoose; populated references and selected fields vary. No credentials are persisted by Swagger UI." },
  servers: [{ url: "/", description: "Same-origin API" }],
  tags: [...new Set(Object.values(modules).map(([tag]) => tag))].map((name) => ({ name })),
  components: { securitySchemes: { BearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } }, schemas }, paths,
};
