# MERN-014 Backend Setup and Deployment

This guide covers the verified backend runtime only. It does not deploy or document a frontend.

## Prerequisites

For local source execution:

- Node.js 22 or a compatible current Node.js runtime
- npm
- MongoDB 7, local or reachable by URI
- Redis 7, local or reachable by URL
- Git

For Compose deployment:

- Docker Desktop with the Linux engine enabled
- Docker Compose v2

SMTP is required only for email delivery. API, notification, SLA, and Socket.IO runtime paths do not require SMTP credentials.

## Environment Reference

Do not commit `.env` or place real secrets in documentation. The application reads environment variables from the process environment and local source startup also loads `.env` when present.

| Variable | Required | Meaning | Placeholder |
| --- | --- | --- | --- |
| `NODE_ENV` | Recommended | Runtime mode; use `production` in containers and `test` for Jest. | `<runtime-mode>` |
| `PORT` | No | HTTP/API port; defaults to `5000`. | `<api-port>` |
| `MONGO_URI` | Yes | MongoDB connection URI. | `mongodb://<host>:<port>/<database>` |
| `REDIS_URL` | Yes for queues/realtime | Redis connection URL. | `redis://<host>:<port>` |
| `JWT_SECRET` | Yes | JWT signing and verification secret. | `<strong-random-jwt-secret>` |
| `CLIENT_URL` | Recommended | Allowed API and Socket.IO client origin. | `https://<client-host>` |
| `BOOTSTRAP_TOKEN` | Optional | One-time first-tenant administrator bootstrap token. | `<one-time-bootstrap-token>` |
| `SLA_SCAN_INTERVAL_MS` | No | Repeatable SLA scan interval; defaults to `60000`. | `<interval-in-milliseconds>` |
| `SLA_BUSINESS_START` | No | Default SLA business-hour start. | `<HH:mm>` |
| `SLA_BUSINESS_END` | No | Default SLA business-hour end. | `<HH:mm>` |
| `SLA_TIMEZONE` | No | Default SLA business-hours timezone. | `<IANA-timezone>` |
| `SLA_WORKING_DAYS` | No | Default working days. | `<comma-separated-days>` |
| `SMTP_HOST` | Only for email delivery | SMTP server host. | `<smtp-host>` |
| `SMTP_PORT` | Only for email delivery | SMTP server port; defaults to `587`. | `<smtp-port>` |
| `SMTP_USER` | Only for email delivery | SMTP username. | `<smtp-user>` |
| `SMTP_PASSWORD` | Only for email delivery | SMTP password. | `<smtp-password>` |
| `SMTP_SECURE` | Only for email delivery | `true` for TLS-secure transport. | `<true-or-false>` |
| `SMTP_FROM` | Optional for email delivery | Sender address; otherwise `SMTP_USER`. | `<sender-address>` |

## Local MongoDB and Redis

Start MongoDB and Redis using local services or the Compose services. For source execution, configure:

```env
NODE_ENV=<development-or-test>
PORT=<api-port>
MONGO_URI=mongodb://<host>:<port>/<database>
REDIS_URL=redis://<host>:<port>
JWT_SECRET=<strong-random-jwt-secret>
CLIENT_URL=https://<client-host>
```

The API connects to MongoDB during server startup. The worker verifies Redis with `PING`, connects to MongoDB, then starts notification, email, and SLA workers.

## Docker Compose

Compose defines four services:

- `mongodb`: MongoDB 7 with a persistent `mongodb_data` volume and healthcheck.
- `redis`: Redis 7 Alpine with append-only persistence, `redis_data`, and healthcheck.
- `api`: API and Socket.IO server, published on port `5000`, dependent on healthy MongoDB and Redis.
- `worker`: notification, email, and SLA workers using the same image and internal service names.

Set the required secret in the shell, not in this document or the repository `.env` file.

PowerShell:

```powershell
$env:JWT_SECRET = "<strong-random-jwt-secret>"
docker compose config
docker compose build
docker compose up -d
docker compose ps
```

Bash:

```bash
export JWT_SECRET='<strong-random-jwt-secret>'
docker compose config
docker compose build
docker compose up -d
docker compose ps
```

Compose passes `mongodb://mongodb:27017/itsm-platform` to API and worker and `redis://redis:6379` for queue/realtime connectivity. MongoDB and Redis ports are exposed to the Compose network; the API is published to the host.

Stop the stack without deleting persistent data:

```bash
docker compose down
```

Delete the persistent volumes only when intentionally resetting local deployment data:

```bash
docker compose down -v
```

## Source Startup

Install dependencies and compile:

```bash
npm ci
npm run build
```

Start the compiled API:

```bash
npm start
```

Start the compiled workers in a separate process:

```bash
npm run start:worker
```

Development commands use Nodemon and ts-node:

```bash
npm run dev
npm run worker
```

The TypeScript compiler currently emits compiled files below `dist/src`, so the container entrypoints are `dist/src/server.js` and `dist/src/worker.js`.

## Health and Runtime Verification

API health:

```bash
curl http://localhost:5000/api/v1/health
```

Expected shape:

```json
{
  "success": true,
  "message": "ITSM API is running"
}
```

Compose health/status:

```bash
docker compose ps
docker inspect --format '{{.Name}} {{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' itsm-api itsm-worker itsm-mongodb itsm-redis
```

Direct data-service checks:

```bash
docker exec itsm-redis redis-cli ping
docker exec itsm-mongodb mongosh itsm-platform --quiet --eval "db.runCommand({ping: 1}).ok"
```

Inspect startup and job logs:

```bash
docker compose logs --tail 100 api worker mongodb redis
docker compose logs -f api worker
```

A successful worker startup logs Redis and MongoDB connection success, notification/email worker readiness, and SLA scheduler startup. A real notification job can be submitted through the authenticated test endpoint `POST /api/v1/jobs/test-notification`; verify worker processing in logs and the resulting notification document in MongoDB.

Socket.IO starts inside the API container after MongoDB and Redis are connected. The API creates a dedicated Redis subscriber for `notification:realtime`; authenticated sockets join user and organization rooms.

## Production Checklist

- Provide `JWT_SECRET`, `MONGO_URI`, and `REDIS_URL` through the deployment secret/environment system.
- Use a managed or protected MongoDB and Redis deployment for production data.
- Provide SMTP variables only when email delivery is enabled.
- Set `CLIENT_URL` to the exact allowed client origin; do not rely on a wildcard origin.
- Keep MongoDB and Redis private to the application network.
- Run API and worker as separate restartable processes.
- Keep persistent MongoDB and Redis storage backed up according to operational policy.
- Monitor API health, container restarts, worker logs, queue failures, MongoDB, Redis, SMTP, and Socket.IO connectivity.
- Use the Compose healthchecks as startup gates, not as a substitute for external monitoring.
- Build from a reviewed lockfile and inspect dependency audit results before release.
- Complete TLS termination, secret rotation, resource limits, centralized logs, backups, alerting, and orchestration policy in the target production platform.

## Testing

Focused module test:

```bash
npx jest tests/analytics.test.ts --runInBand
npx jest tests/audit.test.ts --runInBand
```

Full Jest suite:

```bash
npm test -- --runInBand
```

TypeScript:

```bash
npx tsc --noEmit
```

Production compilation:

```bash
npm run build
```

Whitespace check:

```bash
git diff --check
```

The repository's verified checkpoint is 28 Jest suites and 290 tests, plus the production TypeScript build and API health check. Runtime Docker verification should be repeated in the target environment.
