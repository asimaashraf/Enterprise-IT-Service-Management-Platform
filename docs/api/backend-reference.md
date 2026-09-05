# MERN-014 Backend API Reference

This document describes the verified backend API in the repository. It covers the HTTP API, authentication, tenant boundaries, background jobs, realtime delivery, and integrations. There is no frontend contract in this document.

## Runtime Contract

- Base URL: `http://localhost:5000`
- API prefix: `/api/v1`
- Health endpoint: `GET /api/v1/health`
- Success shape: `{ "success": true, "data": ... }`
- Error shape: `{ "success": false, "message": "..." }`
- Authenticated requests use `Authorization: Bearer <JWT>`.
- Organization-owned reads and writes use the authenticated JWT `organizationId`; client-supplied tenant IDs are not trusted for protected operations.

## Authentication and Access

| Endpoint | Access | Purpose |
| --- | --- | --- |
| `POST /auth/bootstrap` | Public, one-time token required | Creates the first organization administrator while no users exist. |
| `POST /auth/register` | Public | Creates an employee in an existing active organization; client role is ignored. |
| `POST /auth/login` | Public | Returns the JWT and user identity. |
| `GET /auth/me` | Authenticated | Returns the current JWT user claims. |
| `POST /users` | Admin | Creates a tenant user. |
| `GET /users`, `GET /users/:id` | Admin | Lists or reads tenant users. |
| `PUT /users/:id` | Admin | Updates a tenant user. |
| `PATCH /users/:id/deactivate` | Admin | Deactivates a tenant user. |

JWT claims are `id`, `email`, `role`, and `organizationId`. Supported roles are `admin` and `employee`. Public registration never grants `admin`.

## Organization and Administration

| Base route | Operations | Access and scope |
| --- | --- | --- |
| `/organizations` | `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id` | Authenticated reads; admin mutations; current organization only for authenticated tenants. |
| `/departments` | `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id` | Tenant scoped; admin mutations. |
| `/support-teams` | `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id` | Tenant scoped; admin mutations. Members must be active employees in the same organization. |

## Incidents and Automation

| Base route | Operations | Notes |
| --- | --- | --- |
| `/incidents` | `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id` | Supports `Low`, `Medium`, `High`, `Critical` priority; `Minor`, `Major`, `Critical` severity; assignment and resolution workflow. |
| `/incident-assignment-rules` | `GET /`, `GET /:id`, `GET /applicable/:incidentPriority/:severity`, `GET /applicable?incidentPriority=...&severity=...`, `POST /`, `PUT /:id`, `DELETE /:id` | Admin mutations; active ordered rules assign same-tenant employees. |
| `/incident-escalation` | `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id` | Admin mutations; targets are validated as active same-tenant users or support teams. |

Incident creation evaluates active assignment rules. Assignment notifications use BullMQ. Incident creation also queues a new-incident notification for active tenant administrators.

## SLA

| Endpoint | Purpose |
| --- | --- |
| `POST /slas` | Create or initialize an incident SLA. |
| `GET /slas` | List tenant SLAs. |
| `GET /slas/:id` | Read a tenant SLA. |
| `PATCH /slas/:id/respond` | Record a response. |
| `PATCH /slas/:id/resolve` | Record a resolution. |
| `PATCH /slas/:id/check-breach` | Check and persist breach state. |

SLAs calculate response and resolution deadlines from priority and validated business-hours configuration. The worker schedules recurring breach scans, queues breach notifications once, and executes matching escalation policies.

## Problems, RCA, and Service Operations

| Base route | Operations | Notes |
| --- | --- | --- |
| `/problems` | `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id` | Tenant-scoped problem management. |
| `/rcas` | `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id` | Tenant-scoped root-cause records and status workflow. |
| `/rcas/:rcaId/corrective-actions` | `GET /`, `GET /:actionId`, `POST /`, `PUT /:actionId`, `DELETE /:actionId` | Admin mutations; RCA and action tenant checks apply. |
| `/service-catalog` | `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id` | Catalog entries; admin mutations. |
| `/service-requests` | `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id` | Requester/assignee workflow; admin-only delete. |
| `/changes` | `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id` | Risk, schedule, rollback, approval, and execution workflow. Approval/rejection is admin-only. |

Supported service request types are Software Installation, Hardware Purchase, Email Access, VPN Access, Account Creation, Password Reset, and Cloud Resource Request.

## Assets and Knowledge Base

| Base route | Operations | Notes |
| --- | --- | --- |
| `/assets` | `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`, `POST /:id/assign`, `POST /:id/unassign` | Controlled categories; warranty dates/status; maintenance and lifecycle history; assignment is tenant-safe and admin-controlled. |
| `/assets/:id/maintenance` | `GET /`, `POST /` | Append-only tenant maintenance records. |
| `/knowledge-base` | `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id` | Article, FAQ, Troubleshooting Guide, and SOP types; admin mutations. |
| `/knowledge-base/search?q=<terms>` | `GET /` | Searches title, content, and category within the authenticated tenant. |
| `/knowledge-base/:id/attachments` | `GET /`, `POST /` | Secure attachment metadata within the article tenant. |
| `/knowledge-base/:id/attachments/:attachmentId` | `GET /` | Tenant-scoped attachment metadata lookup. |

Asset health analytics uses status counts plus warranty, recent maintenance, and lifecycle/retirement signals.

## Analytics

| Endpoint | Result |
| --- | --- |
| `GET /analytics/incident-trends` | Tenant incident totals, status/priority/severity breakdowns, and 30-day trend. |
| `GET /analytics/sla-compliance` | Tenant SLA totals, breach counts, compliant count, rate, priority, and status breakdowns. |
| `GET /analytics/technician-performance` | Active employee assignment, resolution, rate, and average resolution time. |
| `GET /analytics/resolution-time` | Resolved incident count, average/median duration, and priority breakdown. |
| `GET /analytics/asset-health` | Asset status/health rates and warranty/maintenance/lifecycle alerts. |
| `GET /analytics/change-success-rate` | Completed/failed/cancelled outcomes and success/failure rates. |

All analytics services validate and pass the authenticated organization ID into tenant-scoped repositories.

## Notifications and Audit Logs

| Endpoint | Access | Purpose |
| --- | --- | --- |
| `GET /notifications` | Authenticated | Current user's tenant notifications. |
| `GET /notifications/unread-count` | Authenticated | Current user's unread count. |
| `GET /notifications/:id` | Authenticated | Read one notification owned by the current user and tenant. |
| `PATCH /notifications/:id/read` | Authenticated | Mark one notification read. |
| `PATCH /notifications/read-all` | Authenticated | Mark current user's notifications read. |
| `DELETE /notifications/:id` | Authenticated | Delete one current-user notification. |
| `POST /notifications` | Authenticated | Create a notification for an active same-tenant recipient. |
| `GET /audit-logs` | Admin | Read only the current organization's audit records. |

Mutation auditing records actor identity when available, action/event type, resource type/id, organization, outcome, timestamp, and redacted metadata. Passwords, tokens, secrets, cookies, and authorization values are excluded.

Notification events include incident creation and assignment, SLA breach and escalation, change approval, and service-request updates. The worker persists the notification in MongoDB, publishes `notification:realtime` through Redis, and the API subscriber emits `notification:new` to the recipient's Socket.IO user room.

## Jobs and Integrations

| Endpoint | Purpose |
| --- | --- |
| `POST /jobs/test` | Enqueue a test background job. |
| `POST /jobs/test-notification` | Enqueue a notification job. |
| `POST /jobs/test-email` | Enqueue an email job. |

The worker process runs notification, email, and scheduled SLA workers. Incident PDF export is generated by the incident module. Email delivery uses Nodemailer and requires SMTP configuration when an email job is processed.

## Tenant and Security Rules

- Controllers derive tenant context from authenticated JWT claims.
- Repositories include `organizationId` in tenant-owned reads, writes, and deletes.
- Relationship targets such as users, assets, incidents, RCA records, escalation users, and support-team members are checked against the same organization.
- Admin-only operations are protected by `authorize("admin")`; employees cannot gain admin access through public registration.
- Audit reads are admin-only and organization-scoped.

See [deployment.md](deployment.md) for setup and operations and [database-design.md](database-design.md) for model relationships.
