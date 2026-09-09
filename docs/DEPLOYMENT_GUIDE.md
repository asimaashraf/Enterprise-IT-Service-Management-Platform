# ITSM Platform Deployment Guide

## Prerequisites

- Node.js 22 and npm
- Docker Desktop with the Linux engine for Compose deployment
- MongoDB 7 and Redis 7 for non-container source execution

No secrets belong in this document or in Git. Use `.env.example` as the placeholder reference and provide runtime secrets through the environment.

## Environment Configuration

Backend configuration is read from the root `.env` during local source execution and from the Compose environment in containers. Important variables include:

- `MONGO_URI`
- `REDIS_URL`
- `JWT_SECRET`
- `BOOTSTRAP_TOKEN`
- `CLIENT_URL`
- `PORT`
- `METRICS_HOST` and `METRICS_PORT`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` when email delivery is enabled
- `GRAFANA_ADMIN_USER` and `GRAFANA_ADMIN_PASSWORD`

The frontend reads build-time Vite variables from `client/.env`, including `VITE_API_BASE_URL`, `VITE_APP_NAME`, and `VITE_APP_VERSION`.

## Local Frontend

```powershell
Set-Location client
npm ci
npm run dev
```

The Vite development server normally serves the client at `http://localhost:5173`. Run `npm run typecheck` and `npm run build` for frontend verification.

## Local Backend

```powershell
Set-Location server
npm ci
npm run dev
```

The API normally listens on `http://localhost:5000`. Start the worker separately when MongoDB and Redis are available:

```powershell
Set-Location server
npm run worker
```

For a compiled backend:

```powershell
Set-Location server
npm run build
npm start
```

## Docker Compose

The root Compose file defines:

- MongoDB on the internal service network, with a persistent volume and healthcheck.
- Redis 7 Alpine with append-only persistence and healthcheck.
- API on port `5000` and metrics on `9464`.
- Worker using the same backend image.
- Prometheus on `9090`.
- Grafana on `3000`.

Provide required secrets privately, then inspect and start the stack:

```powershell
$env:JWT_SECRET = "<strong-random-secret>"
$env:BOOTSTRAP_TOKEN = "<one-time-bootstrap-token>"
$env:GRAFANA_ADMIN_PASSWORD = "<private-grafana-password>"
docker compose config
docker compose up --build -d
docker compose ps
```

Stop without deleting persistent data:

```powershell
docker compose down
```

Do not use `docker compose down -v` unless intentionally resetting local databases and volumes.

## Service URLs

| Service | Local URL |
| --- | --- |
| React client | `http://localhost:5173` |
| API health | `http://localhost:5000/api/v1/health` |
| Swagger UI | `http://localhost:5000/api-docs` |
| OpenAPI JSON | `http://localhost:5000/api-docs/openapi.json` |
| Prometheus | `http://localhost:9090` |
| Grafana | `http://localhost:3000` |
| API metrics | `http://localhost:9464/metrics` |

MongoDB is published locally on `127.0.0.1:27018`; Redis is intended for the Compose network and is not published by the current Compose file.

## Monitoring

Prometheus loads `monitoring/prometheus/prometheus.yml` and scrapes `api:9464/metrics`. Grafana provisioning and the ITSM dashboard are loaded from `monitoring/grafana/`. The API metrics listener is separate from the public API port and does not require JWT authentication inside the Compose network.

## Health and Verification

```powershell
docker compose ps
Invoke-WebRequest http://localhost:5000/api/v1/health
docker exec itsm-redis redis-cli ping
docker exec itsm-mongodb mongosh itsm-platform --quiet --eval "db.runCommand({ping: 1}).ok"
```

Repository checks:

```powershell
Set-Location server
npx tsc --noEmit
npm test -- --runInBand
npm run docs:check
Set-Location ..\client
npm run typecheck
npm run build
Set-Location ..
git diff --check
```

The current verified application checkpoint is 37 backend Jest suites and 669 passing tests, with frontend typecheck and production build passing. Docker runtime verification depends on an available Docker Desktop Linux engine and configured local services.

## Operational Boundaries

This repository documents local development and Compose deployment. It does not claim production certification, load capacity, durable outbox guarantees, or horizontally scaled Socket.IO deployment. Production use still requires protected secrets, TLS termination, backups, resource limits, alerting, log retention, and an operational policy for MongoDB, Redis, SMTP, queues, and client hosting.
