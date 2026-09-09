import request from "supertest";
import app from "../src/app";
import { metricsApp } from "../src/observability/metrics";
import { TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, TEST_EMPLOYEE_EMAIL, TEST_EMPLOYEE_PASSWORD } from "./test-fixtures";

const reads = [
  "auth/me", "organizations", "departments", "support-teams", "incidents", "service-requests", "assets", "slas", "incident-assignment-rules", "changes", "knowledge-base", "problems", "rcas", "service-catalog", "notifications", "notifications/unread-count",
  ...["incident-trends", "sla-compliance", "resolution-time", "technician-performance", "asset-health", "change-success-rate"].map((name) => `analytics/${name}`),
];
let adminToken: string, employeeToken: string;
beforeAll(async () => {
  const admin = await request(app).post("/api/v1/auth/login").send({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD }).expect(200);
  const employee = await request(app).post("/api/v1/auth/login").send({ email: TEST_EMPLOYEE_EMAIL, password: TEST_EMPLOYEE_PASSWORD }).expect(200);
  adminToken = admin.body.data.token;
  employeeToken = employee.body.data.token;
});

test.each(reads)("ADMIN integration read: %s", async (path) => {
  const response = await request(app).get(`/api/v1/${path}`).set("Authorization", `Bearer ${adminToken}`).expect(200);
  expect(response.body.success).toBe(true);
});

test.each(reads)("EMPLOYEE integration read: %s", async (path) => {
  const response = await request(app).get(`/api/v1/${path}`).set("Authorization", `Bearer ${employeeToken}`).expect(200);
  expect(response.body.success).toBe(true);
  if (path === "auth/me") expect(response.body.data.role).toBe("employee");
  if (path === "knowledge-base") expect(response.body.data.every((article: any) => article.isPublished)).toBe(true);
});

test.each(["users", "users/eligible-assignees", "incident-escalation", "audit-logs"])("ADMIN-only read: %s", async (path) => {
  await request(app).get(`/api/v1/${path}`).set("Authorization", `Bearer ${adminToken}`).expect(200);
  await request(app).get(`/api/v1/${path}`).set("Authorization", `Bearer ${employeeToken}`).expect(403);
});

test("public docs and health load while API authorization is unchanged", async () => {
  await request(app).get("/api/v1/health").expect(200);
  const ui = await request(app).get("/api-docs/").expect(200);
  expect(ui.text).toContain("swagger-ui");
  const spec = await request(app).get("/api-docs/openapi.json").expect(200);
  expect(spec.body.components.securitySchemes.BearerAuth.scheme).toBe("bearer");
  const script = await request(app).get("/api-docs/swagger-ui-init.js").expect(200);
  expect(script.text).toContain('"persistAuthorization": false');
  expect(script.text).toContain('"validatorUrl": null');
  await request(app).get("/api/v1/users").expect(401);
  await request(app).get("/metrics").expect(404);
});


test("real API traffic appears in the scrape endpoint", async () => {
  await request(app).get("/api/v1/health").expect(200);
  const scrape = await request(metricsApp).get("/metrics").expect(200);
  expect(scrape.headers["content-type"]).toContain("text/plain");
  expect(scrape.text).toContain('http_requests_total{method="GET",route="/api/v1/health",status_code="200"}');
  expect(scrape.text).toContain("http_request_duration_seconds_bucket");
});
