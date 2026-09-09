import express from "express";
import request from "supertest";
import { metricsApp, metricsRegistry, normalizedRoute, observeHttp } from "../src/observability/metrics";
import { openApiDocument } from "../src/docs/openapi";
import routes from "../src/docs/routes.generated.json";
import { bodies } from "../src/docs/contracts";
import fs from "fs";
import path from "path";

const api = express();
api.use(observeHttp);
api.use(express.json());
api.get("/api/v1/health", (_req, res) => res.json({ success: true }));
api.get("/api/v1/incidents/:id", (_req, res) => res.status(403).json({ success: false }));
api.get("/failure", (_req, res) => res.status(500).json({ success: false }));
api.use((_req, res) => res.status(404).end());

beforeEach(() => metricsRegistry.resetMetrics());

test("OpenAPI validates and covers every mounted operation with correct bearer security", async () => {
  for (const route of routes) {
    const key = route.path.replace(/:([A-Za-z][A-Za-z0-9]*)/g, "{$1}");
    const operation = openApiDocument.paths[key][route.method];
    expect(operation.security).toEqual(route.authenticated ? [{ BearerAuth: [] }] : []);
    if (route.admin) expect(operation.description).toContain("ADMIN required");
  }
  expect(Object.keys(openApiDocument.paths).length).toBeGreaterThan(70);
  expect(openApiDocument.paths["/api/v1/auth/change-password"]).toBeUndefined();
  expect(openApiDocument.paths["/api/v1/slas/{id}/response"].patch).toBeDefined();
  const { generate } = require("../scripts/generate-openapi-routes.cjs");
  expect(generate()).toEqual(routes);
});

test("safe profile input and public session schemas do not promise protected edits or missing fields", () => {
  expect(Object.keys(bodies.updateUserController.properties).sort()).toEqual(["email", "name"]);
  expect(bodies.updateUserController.additionalProperties).toBe(false);
  expect(openApiDocument.components.schemas.AuthUser.properties.createdAt).toBeUndefined();
  for (const name of ["User", "Incident", "RCA", "Notification"]) {
    expect(JSON.stringify(openApiDocument.components.schemas[name])).not.toMatch(/password|mutationLock|resetToken/);
  }
});

test("metrics count real 2xx/4xx/5xx responses and histogram observations", async () => {
  await request(api).get("/api/v1/health").expect(200);
  await request(api).get("/api/v1/incidents/private-record").expect(403);
  await request(api).get("/failure").expect(500);
  const response = await request(metricsApp).get("/metrics").expect(200);
  expect(response.headers["content-type"]).toContain("text/plain");
  expect(response.text).toContain('http_requests_total{method="GET",route="/api/v1/health",status_code="200"} 1');
  expect(response.text).toContain('route="/api/v1/incidents/:id",status_code="403"} 1');
  expect(response.text).toContain('route="unmatched",status_code="500"} 1');
  expect(response.text).toContain("http_request_duration_seconds_bucket");
  expect(response.text).toContain("nodejs_heap_size_used_bytes");
  expect(response.text).toContain("process_cpu_user_seconds_total");
});

test("arbitrary URLs, IDs, headers, queries and malformed bodies never become labels", async () => {
  for (let index = 0; index < 20; index++) {
    await request(api).get(`/api/v1/incidents/private-${index}?token=sensitive-query`).set("Authorization", "Bearer sensitive-header");
    await request(api).get(`/unknown-private-${index}?email=sensitive-email`);
  }
  await request(api).post("/api/v1/incidents").set("Content-Type", "application/json").send('{"sensitive-body":').expect(400);
  const text = (await request(metricsApp).get("/metrics")).text;
  expect(text).not.toMatch(/private-|sensitive-/);
  const counter = await metricsRegistry.getSingleMetric("http_requests_total")!.get();
  expect(counter.values).toHaveLength(3);
  expect(normalizedRoute("/api/v1/rcas/private/corrective-actions/secret")).toBe("/api/v1/rcas/:id/corrective-actions/:actionId");
});

test("scraping itself does not increment HTTP counters and collector failure returns 503", async () => {
  await request(metricsApp).get("/metrics").expect(200);
  await request(metricsApp).get("/metrics").expect(200);
  expect((await metricsRegistry.getSingleMetric("http_requests_total")!.get()).values).toHaveLength(0);
  const spy = jest.spyOn(metricsRegistry, "metrics").mockRejectedValueOnce(new Error("private collector details"));
  const response = await request(metricsApp).get("/metrics").expect(503);
  expect(response.text).toBe("Metrics unavailable\n");
  spy.mockRestore();
});

test("monitoring provisioning uses Docker DNS, bounded retention and matching dashboard datasource", () => {
  const root = path.resolve(__dirname, "../..");
  const config = fs.readFileSync(path.join(root, "monitoring/prometheus/prometheus.yml"), "utf8");
  expect(config).toContain('"api:9464"');
  const datasource = fs.readFileSync(path.join(root, "monitoring/grafana/provisioning/datasources/prometheus.yml"), "utf8");
  expect(datasource).toContain("http://prometheus:9090");
  const dashboard = JSON.parse(fs.readFileSync(path.join(root, "monitoring/grafana/dashboards/itsm-api.json"), "utf8"));
  expect(dashboard.panels).toHaveLength(8);
  expect(dashboard.panels.every((panel: any) => panel.datasource.uid === "itsm-prometheus")).toBe(true);
});
