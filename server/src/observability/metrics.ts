import express, { RequestHandler } from "express";
import { collectDefaultMetrics, Counter, Histogram, Registry } from "@prometheus-io/client";
import routes from "../docs/routes.generated.json";

// A dedicated registry prevents duplicate collectors and keeps this API's
// measurements independent of other libraries' global registries.
export const metricsRegistry = new Registry();
collectDefaultMetrics({ register: metricsRegistry });
const labels = ["method", "route", "status_code"] as const;
const requests = new Counter({ name: "http_requests_total", help: "Completed API HTTP requests", labelNames: labels, registers: [metricsRegistry] });
const duration = new Histogram({ name: "http_request_duration_seconds", help: "API HTTP request duration in seconds", labelNames: labels, buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10], registers: [metricsRegistry] });
const methods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
// The allowlist is generated from actual registrations. Neither baseUrl nor
// originalUrl becomes a label, including on 404s or JSON parser errors.
const patterns = [...new Set(["/api/v1/health", ...routes.map((r) => r.path)])].map((route) => ({
  route,
  pattern: new RegExp("^" + route.split("/").map((segment) => segment.startsWith(":") ? "[^/]+" : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("/") + "/?$", "i"),
}));
export function normalizedRoute(path: string): string {
  return patterns.find(({ pattern }) => pattern.test(path))?.route ?? "unmatched";
}

export const observeHttp: RequestHandler = (req, res, next) => {
  const start = process.hrtime.bigint();
  const method = methods.has(req.method) ? req.method : "OTHER";
  const route = normalizedRoute(req.path);
  res.once("finish", () => {
    try {
      const status_code = res.statusCode >= 100 && res.statusCode <= 599 ? String(res.statusCode) : "OTHER";
      const seconds = Number(process.hrtime.bigint() - start) / 1e9;
      requests.inc({ method, route, status_code });
      duration.observe({ method, route, status_code }, seconds);
      if (process.env.NODE_ENV === "development") {
        console.log(JSON.stringify({ method, route, status_code, duration_ms: Math.round(seconds * 1000) }));
      }
    } catch {
      // Observability must never interrupt a response or expose request data.
    }
  });
  next();
};

// Run on a separate internal listener: no metrics on the public API port,
// no JWT needed by Prometheus, and scraper requests never count as API traffic.
export const metricsApp = express();
metricsApp.disable("x-powered-by");
metricsApp.get("/metrics", async (_req, res) => {
  try {
    res.setHeader("Content-Type", metricsRegistry.contentType);
    res.setHeader("Cache-Control", "no-store");
    res.end(await metricsRegistry.metrics());
  } catch {
    res.status(503).type("text/plain").send("Metrics unavailable\n");
  }
});
