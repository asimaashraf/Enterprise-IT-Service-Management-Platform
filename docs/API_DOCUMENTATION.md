# ITSM Platform API Documentation

## Runtime Entry Points

- API base URL: `http://localhost:5000`
- Versioned API prefix: `/api/v1`
- Health: `GET /api/v1/health`
- Swagger UI: `http://localhost:5000/api-docs`
- OpenAPI JSON: `http://localhost:5000/api-docs/openapi.json`
- Metrics listener: `http://localhost:9464/metrics`

The generated OpenAPI document and mounted Express routes are the contract authority. Swagger UI should be used for the complete operation list, request schemas, response schemas, and bearer authorization.

## Response and Authentication Conventions

Successful responses use a `success`, `message`, and optional `data` envelope. Errors use `success: false` and a `message`. Authenticated requests send:

```http
Authorization: Bearer <JWT>
```

JWT claims include `id`, `email`, `role`, and `organizationId`. The supported roles are `ADMIN` and `EMPLOYEE`.

## Access Model

- Public: login, registration, bootstrap subject to its token/precondition, email verification, and password recovery routes.
- Authenticated: tenant-scoped reads and requester operations permitted by the route.
- ADMIN: tenant administration, user and team management, operational assignment, approval/rejection, audit reads, and other routes protected by the backend.
- EMPLOYEE: requester/read workflows allowed by the route; employees are not operational assignees.

Client-side route and control filtering is not a security boundary. Backend authorization, ownership, validation, and tenant checks remain authoritative.

## Route Groups

| Group | Prefix | Scope |
| --- | --- | --- |
| Authentication | `/auth` | Login, registration, bootstrap, verification, recovery, and current-user access. |
| Users and invitations | `/users`, `/invitations` | Tenant directory and invitation onboarding. |
| Organization administration | `/organizations`, `/departments`, `/support-teams` | Tenant structure and support membership. |
| Incidents | `/incidents` | Incident CRUD, assignment, status, resolution, and PDF export. |
| Assignment and escalation | `/incident-assignment-rules`, `/incident-escalation` | Ordered incident routing and SLA escalation policies. |
| SLA | `/slas` | SLA creation, response, resolution, and breach checks. |
| Service operations | `/service-catalog`, `/service-requests` | Catalog offerings and requester/operational workflows. |
| Problems and RCA | `/problems`, `/rcas` | Problem records, root-cause analysis, related incidents, and corrective actions. |
| Change management | `/changes` | Risk, schedule, approval/rejection, assignment, and execution workflow. |
| Assets | `/assets` | Inventory, assignment, maintenance, lifecycle, and asset history. |
| Knowledge base | `/knowledge-base` | Articles, publication, search, article types, and attachment metadata. |
| Analytics | `/analytics` | Tenant-scoped incident, SLA, resolution, asset, change, and administrator performance metrics. |
| Notifications and audit | `/notifications`, `/audit-logs` | Recipient notifications, realtime events, and ADMIN-only audit reads. |
| Jobs | `/jobs` | Diagnostic/test job enqueue routes; use carefully and never as a production smoke test. |

All groups are mounted under `/api/v1`. Exact methods, parameters, access flags, status codes, and schemas are available in Swagger UI and the generated OpenAPI JSON.

## Tenant and Security Contract

The server derives tenant context from authenticated JWT claims. Client-supplied organization identifiers are not trusted as selectors for protected operations. Relationship targets such as users, assets, incidents, RCA records, escalation targets, and support-team members are validated against the authenticated organization where applicable.

Mutation auditing records actor, action, resource, outcome, organization, timestamp, and redacted metadata. Notification creation and delivery validate recipient ownership, active status, and tenant membership according to the route and event.

## Workflow Highlights

- Incident creation evaluates active ordered assignment rules and can enqueue tenant-safe notifications.
- SLA workers scan unresolved incidents, record breach state, apply matching escalation policies, and enqueue notifications.
- Change approval/rejection and RCA corrective-action mutations require ADMIN authorization.
- Service requests distinguish requester-safe actions from operational assignment and progression.
- Asset maintenance and lifecycle history are exposed as supported append-only records.
- Knowledge-base search is tenant-scoped across title, content, and category; attachments are metadata only.

For deployment, environment variables, Docker Compose, worker startup, Prometheus, and Grafana, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md). For persistence and relationships, see [DATABASE_DESIGN.md](DATABASE_DESIGN.md).
