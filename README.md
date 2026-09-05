# EEF MERN-014 — Enterprise IT Service Management (ITSM) Backend

Backend API for the **Ezitech Engineering Framework (EEF) MERN-014 Industry Case Study**.

This project is an **Enterprise IT Service Management & Incident Response Platform** designed to centralize incident management, service requests, assets, SLAs, knowledge management, change management, and related IT operations.

> **Important:** This README documents the **current EEF MERN-014 ITSM project only**. It does not include details from the older Asset Management System project.

## Canonical Backend Documentation

- [Backend API Reference](docs/api/backend-reference.md)
- [Setup and Deployment Guide](docs/api/deployment.md)
- [Database Design](docs/api/database-design.md)
- [Architecture](ai-context/ARCHITECTURE.md)

---

# 1. Project Overview

## Industry Case Study

**Ezitech Engineering Framework (EEF)**
**Case Study:** MERN-014
**Project:** Enterprise IT Service Management (ITSM) & Incident Response Platform

### Business Goal

The platform provides a centralized system for organizations to manage:

* Incidents
* Service requests
* Assets
* SLAs
* Problems
* Changes
* Knowledge articles
* Organizations
* Departments
* Support teams
* User access and roles
* Notifications
* Incident assignment automation

The backend is designed as an **API-first, multi-tenant ITSM backend**.

---

# 2. Technology Stack

## Backend

* Node.js
* Express.js
* TypeScript
* MongoDB
* Mongoose
* JWT Authentication
* bcrypt
* Redis
* BullMQ
* Socket.IO
* Nodemailer

## Development & Testing

* TypeScript
* Jest
* Supertest
* ts-node
* Nodemon

## Infrastructure

* Docker
* Docker Compose
* Redis

---

# 3. Backend Architecture

The backend follows a modular structure.

```text
src/
│
├── config/
│   ├── db.ts
│   └── redis.ts
│
├── middleware/
│   └── auth.middleware.ts
│
├── modules/
│   ├── auth/
│   ├── organization/
│   ├── department/
│   ├── support-team/
│   ├── incident/
│   ├── incident-assignment/
│   ├── problem/
│   ├── service-catalog/
│   ├── service-requests/
│   ├── knowledge-base/
│   ├── sla/
│   ├── change/
│   └── asset/
│
├── tests/
│
├── app.ts
├── server.ts
└── worker.ts
```

Each major module is separated into its own backend domain.

Typical module structure:

```text
module/
├── model
├── service
├── controller
├── routes
└── types
```

The controller handles HTTP requests, while business logic is kept inside services.

---

# 4. Base API URL

During local development, the backend runs on:

```text
http://localhost:5000
```

All APIs use:

```text
/api/v1
```

Therefore the frontend should use:

```text
http://localhost:5000/api/v1
```

Example:

```text
POST http://localhost:5000/api/v1/auth/login
```

---

# 5. Authentication

The backend uses **JWT authentication**.

After successful login, the API returns:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "...",
      "name": "...",
      "email": "...",
      "role": "admin",
      "organizationId": "..."
    },
    "token": "..."
  }
}
```

The frontend should store the token and send it with authenticated requests.

## Authorization Header

```http
Authorization: Bearer <token>
```

Example:

```http
Authorization: Bearer eyJhbGciOi...
```

---

# 6. User Roles

The backend currently supports role-based authorization.

The main roles used by the current implementation include:

```text
admin
employee
```

Protected administrative operations use:

```text
authenticate
authorize("admin")
```

Therefore:

* Authentication checks whether the user is logged in.
* Authorization checks whether the authenticated user has the required role.

---

# 7. Multi-Tenant Organization Isolation

The ITSM platform is organization-based.

Authenticated users contain:

```text
organizationId
```

Backend services use the authenticated user's organization ID when retrieving or modifying organization-owned resources.

This is important for the frontend because users should only see data belonging to their organization.

---

# 8. Standard API Response Format

Successful requests generally follow:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

For lists:

```json
{
  "success": true,
  "message": "Records retrieved successfully",
  "data": []
}
```

Errors generally follow:

```json
{
  "success": false,
  "message": "Error message"
}
```

The frontend should primarily use:

```text
success
message
data
```

when handling API responses.

---

# 9. Authentication APIs

Base route:

```text
/api/v1/auth
```

## Login

```http
POST /api/v1/auth/login
```

Example request:

```json
{
  "email": "<user-email>",
  "password": "<user-password>"
}
```

Successful response contains:

```text
data.user
data.token
```

The frontend should use `data.token` for subsequent authenticated API calls.

---

# 10. Organization Management

Base route:

```text
/api/v1/organizations
```

Organization management is part of the multi-tenant architecture.

Organizations represent individual companies/tenants using the ITSM platform.

The backend organization functionality includes organization creation and organization-related management with authorization controls.

---

# 11. Department Management

Base route:

```text
/api/v1/departments
```

Departments belong to organizations and allow users and IT operations to be grouped organizationally.

Frontend should treat department records as organization-scoped resources.

---

# 12. Support Team Management

Base route:

```text
/api/v1/support-teams
```

Support teams are intended to represent IT support groups responsible for handling incidents and service operations.

---

# 13. Incident Management

Base route:

```text
/api/v1/incidents
```

Incident Management is one of the primary modules of the project.

The backend supports:

* Incident creation
* Incident priority
* Severity
* Incident status
* Reporter
* Organization
* Assignment
* Automatic assignment through assignment rules
* Incident resolution workflow

---

# 14. Creating an Incident

```http
POST /api/v1/incidents
```

An authenticated user can create an incident.

The incident contains information such as:

```text
incidentId
title
description
priority
severity
status
reportedBy
assignedTo
organizationId
createdAt
updatedAt
```

Example response:

```json
{
  "success": true,
  "message": "Incident created successfully",
  "data": {
    "_id": "...",
    "incidentId": "INC-ASSIGN-123456",
    "title": "High priority assignment test",
    "description": "Testing automatic incident assignment",
    "priority": "High",
    "severity": "Major",
    "status": "Open",
    "reportedBy": {},
    "assignedTo": {},
    "organizationId": "..."
  }
}
```

---

# 15. Incident Priority

Incident priority is used by the assignment-rule engine.

Example:

```text
Low
Medium
High
Critical
```

The exact allowed values should follow the incident module's TypeScript enum/types.

---

# 16. Incident Severity

Severity is also used by the assignment-rule engine.

Example:

```text
Minor
Major
Critical
```

The frontend should use the values defined by the backend incident types rather than inventing new values.

---

# 17. Incident Assignment Rules

Base route:

```text
/api/v1/incident-assignment-rules
```

This module provides automated incident routing.

The assignment-rule engine can match:

```text
Incident Priority
+
Incident Severity
```

and assign the incident to a configured target user.

---

# 18. Create Assignment Rule

```http
POST /api/v1/incident-assignment-rules
```

Admin only.

Example:

```json
{
  "name": "Automatic High Priority Rule",
  "description": "Automatically assigns high priority incidents",
  "ruleOrder": 1,
  "incidentPriority": "High",
  "severity": "Major",
  "targetUser": "<employeeId>"
}
```

The backend validates that the target user exists in the same organization.

---

# 19. Get Assignment Rules

```http
GET /api/v1/incident-assignment-rules
```

Returns assignment rules belonging to the authenticated user's organization.

---

# 20. Get Assignment Rule by ID

```http
GET /api/v1/incident-assignment-rules/:id
```

Example:

```text
GET /api/v1/incident-assignment-rules/6a8e7ed6d41e0a78d521e701
```

---

# 21. Update Assignment Rule

```http
PUT /api/v1/incident-assignment-rules/:id
```

Admin only.

The rule can be updated using the request body.

---

# 22. Delete Assignment Rule

```http
DELETE /api/v1/incident-assignment-rules/:id
```

Admin only.

---

# 23. Activate / Deactivate Assignment Rules

Assignment rules contain:

```text
isActive
```

The frontend should represent active/inactive rules using a toggle or status control.

Inactive rules should not be used for automatic incident assignment.

---

# 24. Get Applicable Assignment Rules

Two API formats are supported.

### Path parameters

```http
GET /api/v1/incident-assignment-rules/applicable/:incidentPriority/:severity
```

Example:

```http
GET /api/v1/incident-assignment-rules/applicable/High/Major
```

### Query parameters

```http
GET /api/v1/incident-assignment-rules/applicable?incidentPriority=High&severity=Major
```

Example response:

```json
{
  "success": true,
  "message": "Applicable assignment rules retrieved successfully",
  "data": []
}
```

---

# 25. Automatic Incident Assignment

This is an important completed backend feature.

When an incident is created, the backend checks the active assignment rules.

For example:

```text
Incident:

Priority = High
Severity = Major
```

The backend searches for:

```text
Active rule
Priority = High
Severity = Major
```

If a matching rule exists:

```text
Incident
   ↓
Assignment Rule
   ↓
Target User
   ↓
assignedTo
```

The incident is automatically assigned.

The current integration test confirms that a matching incident receives:

```text
assignedTo
```

with the target employee.

---

# 26. Assignment Rule Ordering

Assignment rules contain:

```text
ruleOrder
```

Rules are evaluated according to their configured order.

The frontend should allow administrators to view the rule order clearly.

Example:

```text
1 → Critical Incident Rule
2 → High Priority Rule
3 → Standard Incident Rule
```

---

# 27. Assignment Notifications

Automatic assignment also triggers the backend notification workflow.

The backend queues an incident assignment notification for the assigned employee.

The frontend does not need to manually perform the assignment notification.

---

# 28. SLA Management

Base route:

```text
/api/v1/slas
```

The SLA module provides the foundation for:

* Response time
* Resolution time
* Priority-based SLA rules
* SLA monitoring
* Escalation/breach handling

The frontend should display SLA information alongside incidents where applicable.

---

# 29. Problem Management

Base route:

```text
/api/v1/problems
```

Problem Management is separate from Incident Management.

Problems represent underlying issues that may cause one or more incidents.

Problem IDs use the format:

```text
PRB-001
PRB-002
PRB-003
```

The backend supports problem creation and problem status/workflow logic.

---

# 30. Service Catalog

Base route:

```text
/api/v1/service-catalog
```

The Service Catalog contains IT services that users can request.

Examples from the project requirements include:

```text
Software Installation
Hardware Purchase
Email Access
VPN Access
Account Creation
Password Reset
Cloud Resource Requests
```

The frontend can use Service Catalog APIs to build the service request selection interface.

---

# 31. Service Requests

Base route:

```text
/api/v1/service-requests
```

Service Requests are separate from incidents.

A user may request an IT service through the Service Catalog.

The frontend should therefore distinguish:

```text
Incident
```

from:

```text
Service Request
```

---

# 32. Knowledge Base

Base route:

```text
/api/v1/knowledge-base
```

The Knowledge Base supports IT documentation such as:

* Articles
* FAQs
* Troubleshooting information
* SOP-style documentation

The frontend can provide:

```text
Search
Article listing
Article details
Article creation/editing
```

according to the permissions exposed by the backend.

---

# 33. Change Management

Base route:

```text
/api/v1/changes
```

Change Management is intended for controlled IT changes.

The project requirements include:

* Change requests
* Risk assessment
* Approval workflow
* Deployment schedule
* Rollback plan

The frontend should treat changes as a separate module from incidents and problems.

---

# 34. Asset Management

Base route:

```text
/api/v1/assets
```

The ITSM project includes asset tracking as part of the enterprise ITSM platform.

Assets may represent enterprise IT resources such as:

* Laptops
* Desktops
* Servers
* Network equipment
* Licenses
* Mobile devices

Asset information can be associated with IT operations and incidents where supported by the backend.

> This section refers only to the **asset functionality inside the current EEF ITSM backend**. It is not documentation for the separate older Asset Management System project.

---

# 35. Redis

Redis is used as part of the backend infrastructure.

Configured through:

```text
REDIS_URL
```

Redis supports backend asynchronous processing.

---

# 36. BullMQ

BullMQ is used for background jobs.

The project contains background worker functionality for tasks such as notifications and email processing.

The worker is started with:

```bash
npx ts-node src/worker.ts
```

The worker connects to:

```text
Redis
MongoDB
```

and processes queued jobs.

---

# 37. Notification System

The backend contains notification processing infrastructure.

Current worker functionality includes:

```text
Notification worker
Email worker
```

Incident assignment can queue a notification for the assigned employee.

The frontend can later consume notification APIs/events to display notifications in the notification center.

---

# 38. Email Service

The backend includes email-service infrastructure using:

```text
Nodemailer
```

Email-related jobs are processed through the background worker.

---

# 39. Socket.IO

Socket.IO is included for real-time communication.

This can support future/current real-time functionality such as:

* Notifications
* Incident updates
* Assignment updates
* SLA alerts
* Dashboard updates

Frontend integration should use the backend Socket.IO configuration when real-time features are connected.

---

# 40. Database

The backend uses:

```text
MongoDB
```

with:

```text
Mongoose
```

The MongoDB connection is configured through:

```text
MONGO_URI
```

The backend successfully connects to MongoDB during integration testing.

---

# 41. Environment Variables

The backend uses environment configuration.

Typical variables include:

```env
PORT=<api-port>

MONGO_URI=mongodb://<host>:<port>/<database>

JWT_SECRET=<strong-random-jwt-secret>

REDIS_URL=redis://<host>:<port>

CLIENT_URL=https://<client-host>
```

Do not expose the actual `.env` file to the frontend developer or commit secrets to GitHub.

---

# 42. Frontend Authentication Flow

Recommended frontend flow:

```text
Login Page
    ↓
POST /auth/login
    ↓
Receive token + user
    ↓
Store token
    ↓
Attach token to Axios requests
    ↓
Access protected APIs
```

Example Axios configuration:

```ts
Authorization: `Bearer ${token}`
```

---

# 43. Frontend API Integration Pattern

Recommended structure:

```text
src/
├── api/
│   ├── auth.api.ts
│   ├── incident.api.ts
│   ├── assignmentRule.api.ts
│   ├── problem.api.ts
│   ├── sla.api.ts
│   ├── serviceCatalog.api.ts
│   ├── serviceRequest.api.ts
│   ├── knowledgeBase.api.ts
│   └── change.api.ts
│
├── types/
├── hooks/
├── pages/
└── components/
```

React Query can be used for server state.

Redux Toolkit can be used for application/client state where required.

---

# 44. Recommended Incident UI Flow

The frontend incident workflow should generally follow:

```text
Create Incident
      ↓
Set Priority
      ↓
Set Severity
      ↓
Submit Incident
      ↓
Backend checks Assignment Rules
      ↓
Matching Rule?
   ↙          ↘
 Yes           No
 ↓             ↓
Auto Assign    Unassigned
 ↓
Notification
```

The frontend should **not implement the assignment-rule matching logic itself**.

The backend is responsible for deciding the assignment.

---

# 45. Assignment Rule Admin UI

Recommended frontend screen:

```text
Incident Assignment Rules
────────────────────────────────────

Rule Name          Priority   Severity   Order   Status
---------------------------------------------------------
Critical Rule      Critical   Critical    1      Active
High Priority      High       Major       2      Active
Standard Rule      Medium     Minor       3      Inactive

[Create Rule]
```

Rule creation form:

```text
Name
Description
Priority
Severity
Target Employee
Rule Order
Active / Inactive
```

Only administrators should see create/update/delete controls.

---

# 46. Incident Details UI

The frontend incident details page should be able to display:

```text
Incident ID
Title
Description
Priority
Severity
Status
Reported By
Assigned To
Organization
Created At
Updated At
```

If automatic assignment occurs, `assignedTo` will be present in the incident response.

---

# 47. Error Handling

Frontend should check HTTP status and the backend response.

Example:

```json
{
  "success": false,
  "message": "Target user does not exist in this organization"
}
```

Display the backend `message` to the user where appropriate.

Examples:

```text
401 → Authentication required
403 → Permission denied
404 → Resource not found
400 → Validation/business error
```

---

# 48. Security Rules for Frontend

The frontend must not assume that hiding a button provides security.

For example:

```text
Admin-only Create Rule
```

must still be protected by the backend.

Backend authorization is the source of truth.

The frontend should hide unauthorized controls for better UX, but backend authorization remains mandatory.

---

# 49. Testing

The project uses Jest for backend integration testing.

The incident assignment-rule integration test can be run with:

```bash
npx jest tests/incident-assignment-rule.test.ts --runInBand
```

Current verified result:

```text
Test Suites: 1 passed, 1 total
Tests:       15 passed, 15 total
```

The test verifies:

* Assignment rule creation
* Authentication protection
* Admin authorization
* Invalid target-user rejection
* Invalid rule-order rejection
* Rule retrieval
* Rule retrieval by ID
* Rule update
* Non-admin update rejection
* Rule deactivation
* Rule reactivation
* Applicable-rule retrieval
* Automatic incident assignment
* Non-admin deletion rejection
* Rule deletion

---

# 50. TypeScript Verification

Before committing backend changes:

```bash
npx tsc --noEmit
```

The current backend TypeScript compilation passes successfully.

---

# 51. Running the Backend

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Or use the project's configured TypeScript server command.

The backend should run on:

```text
http://localhost:5000
```

---

# 52. Running the Background Worker

Start the worker:

```bash
npx ts-node src/worker.ts
```

The worker requires:

```text
MongoDB
Redis
```

to be available.

---

# 53. Docker / Redis

Redis is configured through Docker Compose.

Example:

```bash
docker compose up -d redis
```

Verify Redis is running before starting background workers that depend on it.

---

# 54. Current Backend Development Status

## Completed / Implemented

### Authentication & Security

* JWT authentication
* Login
* Authentication middleware
* Role-based authorization
* Organization-aware access

### Organization Structure

* Organization management
* Department management
* Support team functionality
* User roles

### Incident Management

* Incident creation
* Priority
* Severity
* Status
* Reporter
* Assignment
* Automatic assignment
* Assignment-rule engine

### Incident Assignment Rules

* Create
* List
* Get by ID
* Update
* Activate/deactivate
* Delete
* Applicable-rule lookup
* Automatic assignment during incident creation
* Assignment notification queue

### SLA

* SLA module
* Priority-based SLA logic
* Response/resolution timing foundation
* SLA-related business logic

### Problem Management

* Problem module
* Problem IDs
* Problem workflow/status logic

### Service Catalog

* Service catalog module
* Service definitions
* Organization-aware service management

### Service Requests

* Service request module
* Service request workflow foundation

### Knowledge Base

* Knowledge Base module
* Article management foundation

### Change Management

* Change module
* Change workflow foundation

### Infrastructure

* MongoDB
* Redis
* BullMQ
* Background workers
* Notification worker
* Email worker
* Socket.IO
* Nodemailer
* JWT
* Jest integration testing

---

# 55. RCA — Next Development Phase

The Root Cause Analysis section is part of the EEF MERN-014 requirements.

The next backend work is:

```text
RCA Corrective Actions
RCA Preventive Actions
RCA Related Incidents
RCA Lessons Learned
```

These should be implemented as part of the current ITSM project.

They should **not** be treated as separate projects.

The intended relationship is:

```text
Incident
   ↓
Resolution
   ↓
Root Cause Analysis
   ├── Root Cause
   ├── Corrective Actions
   ├── Preventive Actions
   ├── Related Incidents
   └── Lessons Learned
```

The frontend RCA screens will be documented after the backend RCA APIs are implemented and tested.

---

# 56. Frontend Developer Important Notes

### 1. Always use the backend API as the source of truth.

Do not duplicate backend business logic in React.

### 2. Always send JWT for protected APIs.

```http
Authorization: Bearer <token>
```

### 3. Respect organization boundaries.

The backend determines the user's organization.

### 4. Assignment logic is backend-controlled.

Do not manually assign incidents in the frontend based on priority/severity.

### 5. Use `success`, `message`, and `data`.

These are the main response fields.

### 6. Handle `assignedTo` as optional.

An incident may be:

```text
assignedTo: user
```

or remain unassigned when no matching assignment rule exists.

### 7. Admin controls should be restricted in the UI.

But backend authorization is still required.

---

# 57. API Quick Reference

| Module                    | Base Route                          |
| ------------------------- | ----------------------------------- |
| Authentication            | `/api/v1/auth`                      |
| Organizations             | `/api/v1/organizations`             |
| Departments               | `/api/v1/departments`               |
| Support Teams             | `/api/v1/support-teams`             |
| Incidents                 | `/api/v1/incidents`                 |
| Incident Assignment Rules | `/api/v1/incident-assignment-rules` |
| SLA                       | `/api/v1/sla`                       |
| Problems                  | `/api/v1/problems`                  |
| Service Catalog           | `/api/v1/service-catalog`           |
| Service Requests          | `/api/v1/service-requests`          |
| Knowledge Base            | `/api/v1/knowledge-base`            |
| Change Management         | `/api/v1/changes`                   |
| Assets                    | `/api/v1/assets`                    |

---

# 58. Confirmed Assignment Rule Endpoints

```text
POST   /api/v1/incident-assignment-rules
GET    /api/v1/incident-assignment-rules
GET    /api/v1/incident-assignment-rules/:id
PUT    /api/v1/incident-assignment-rules/:id
DELETE /api/v1/incident-assignment-rules/:id

GET    /api/v1/incident-assignment-rules/applicable
GET    /api/v1/incident-assignment-rules/applicable/:incidentPriority/:severity
```

Authorization:

```text
GET applicable → authenticated
GET all        → authenticated
GET by ID      → authenticated

POST           → admin
PUT            → admin
DELETE         → admin
```

---

# 59. Confirmed Incident Endpoint

```text
POST /api/v1/incidents
```

This endpoint has been integration-tested with automatic assignment.

A matching assignment rule results in:

```text
incident.assignedTo
```

being populated with the target employee.

---

# 60. Project Scope Reminder

This backend is being developed specifically for:

> **EEF MERN-014 — Enterprise IT Service Management & Incident Response Platform**

The implementation should remain aligned with the case study requirements:

```text
Organization Management
Incident Management
Service Requests
Asset Management
SLA Engine
Change Management
Knowledge Base
Root Cause Analysis
Analytics
Notifications
```

The current development focus is the backend implementation of these ITSM capabilities.

---

# 61. Handoff Summary

The frontend developer should start by integrating:

```text
1. Authentication
2. Organization/user context
3. Incidents
4. Incident assignment rules
5. SLA
6. Problems
7. Service Catalog
8. Service Requests
9. Knowledge Base
10. Change Management
11. Assets
```

The most important completed automation is:

```text
Incident Creation
      ↓
Priority + Severity
      ↓
Assignment Rule Engine
      ↓
Matching Active Rule
      ↓
Target Employee
      ↓
assignedTo
      ↓
Assignment Notification
```

The next backend development phase is:

```text
RCA Corrective Actions
RCA Preventive Actions
RCA Related Incidents
RCA Lessons Learned
```

Once those APIs are completed, the RCA frontend integration can be added using the same API-first architecture.

---

# 62. Backend Quality Checklist

Before considering a backend feature complete:

```text
✓ TypeScript compiles
✓ Authentication works
✓ Authorization works
✓ Organization isolation is enforced
✓ Validation exists
✓ Business logic is inside services
✓ Controllers handle HTTP responses
✓ API responses use consistent structure
✓ Integration tests pass
✓ Error cases are tested
✓ Frontend API contract is documented
```

---

# 63. Final Status

The backend has progressed beyond basic CRUD and now contains important enterprise ITSM business logic, particularly:

```text
JWT Authentication
        +
RBAC
        +
Multi-Tenant Organization Isolation
        +
Incident Management
        +
Rule-Based Automatic Assignment
        +
Notifications / Background Processing
        +
SLA
        +
Problem Management
        +
Service Catalog
        +
Service Requests
        +
Knowledge Base
        +
Change Management
        +
Asset Management
```

The next major feature group is **Root Cause Analysis**.
