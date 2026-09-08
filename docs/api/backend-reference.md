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

Base: `/api/v1/analytics`. All six GET endpoints require a bearer token and allow
both ADMIN and EMPLOYEE to read their authenticated organization's results,
including personnel performance. No requirement currently establishes ADMIN-only
analytics. `organizationId` query parameters are ignored, never tenant selectors.
No analytics overview endpoint exists. Successful responses are `{ success: true,
data }`; validation failures are HTTP 400 `{ success: false, message }`.

Optional date filtering: `?startDate=2026-01-01&endDate=2026-01-31`.
Supply both parameters or neither. Each must be one real calendar date in exact
`YYYY-MM-DD` format. Start is inclusive UTC midnight; end is exclusive UTC midnight
of the following day. Same-day ranges are supported. Invalid/reversed dates,
repeated/structured parameters, missing partners, and ranges over 366 inclusive
days return 400. The 366-day reporting limit bounds daily chart response size.

| Endpoint | Date semantics and default |
| --- | --- |
| `GET /analytics/incident-trends` | `Incident.createdAt` cohort. Default: today and previous 29 UTC dates. Totals, breakdowns, and zero-filled daily trend describe the same period. This corrects the previous lifetime-total/30-day-trend mismatch. |
| `GET /analytics/sla-compliance` | `SLA.createdAt` cohort; without dates, all records. Reports current persisted status/breach flags, not historical SLA snapshots. |
| `GET /analytics/technician-performance` | Active same-tenant ADMINs only; legacy route and `technicianId`/`technicianName` fields retained. Incident sample is filtered by `createdAt`; default all time. Current assignee attribution only, not assignment history or historical resolver attribution. Zero-assignment ADMINs remain present. |
| `GET /analytics/resolution-time` | Currently Resolved/Closed incidents filtered by `resolvedAt`, falling back to `closedAt` only when `resolvedAt` is absent/null. Default all time. Duration uses that same timestamp minus `createdAt`. |
| `GET /analytics/asset-health` | Inventory/status counts, health rates, and warranty alerts always describe the current snapshot. Dates only affect maintenance/lifecycle history as detailed below. |
| `GET /analytics/change-success-rate` | With dates, only Completed by `completedAt`, Failed by `failedAt`, and Cancelled by `cancelledAt` in the period. Missing outcome timestamps are excluded, never substituted with creation dates. Filtered `totalChanges` equals `evaluatedChanges` and `unevaluatedChanges` is zero. Without dates all current changes are counted. |

Response fields retain the six interfaces in `src/modules/analytics/analytics.types.ts`.
Percentages are 0?100 rounded to two decimals; zero denominators produce zero.
Resolution-hour averages/medians are null when no usable positive duration exists.
Invalid/missing/nonpositive durations are excluded from duration samples, but the
terminal incident count and its `byPriority` counts can still include these records.
Even-sample medians average the two middle durations. `byPriority` is a count
breakdown, not a duration breakdown.

SLA `responseBreached` and `resolutionBreached` remain independent counts;
`totalBreached` counts each record once if either flag is true. `compliant` counts
records with neither flag and an Active/Completed status; compliance rate divides
this count by total SLA records. Inconsistent legacy breach-status/no-flag records
are not classified as compliant. No historical deadline reconstruction is performed.

Asset semantics:
- `healthyAssets`/`activeAssets` = Available + Assigned, not a diagnostic health score.
- `warrantyAlerts` includes expired warranties and dates through now + 30 days,
  inclusive, for all current assets (including retired assets); no date-filter effect.
- `maintenanceAlerts` is the distinct union of currently Maintenance assets and
  current same-tenant assets with non-Cancelled maintenance dated in the selected
  period, capped at now. Without dates the history window is the past 90 days.
  Future/upcoming maintenance is excluded; no upcoming-maintenance field is added.
- `lifecycleAlerts` without dates counts currently Retired assets. With dates it
  counts currently Retired assets with a transition into Retired in that period,
  capped at now. Reactivated assets and deleted/foreign assets never contribute.
- History filtering does not reconstruct historical inventory or past asset health.

Change success is Completed / (Completed + Failed + Cancelled); failure includes
Failed and Cancelled. Draft, Pending Approval, Approved, Rejected, Scheduled, and
In Progress are unevaluated in the unfiltered response. Rejected is not a failed
implementation. Rates reflect current statuses rather than an immutable event log.

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
