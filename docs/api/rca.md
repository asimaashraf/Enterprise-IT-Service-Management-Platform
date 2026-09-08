\# Root Cause Analysis (RCA) API



\## Overview



The Root Cause Analysis (RCA) module manages structured investigations into the underlying causes of IT problems.



The RCA module supports:



\- Creating an RCA

\- Viewing all organization RCAs

\- Viewing an RCA by ID

\- Finding an RCA associated with a specific problem

\- Updating an RCA

\- Deleting an RCA

\- Recording root causes

\- Recording investigation findings

\- Recording contributing factors

\- Recording corrective actions

\- Recording preventive actions

\- Linking related incidents

\- Linking an RCA to a problem

\- Tracking RCA status

\- Organization-level tenant isolation



Each problem can have \*\*only one RCA within an organization\*\*.



\---



\# Base URL



```text

/api/v1/rcas

```



All endpoints require JWT authentication.



\## Authentication Header



```http

Authorization: Bearer <JWT\_TOKEN>

```



\---



\# RCA Data Model



| Field | Type | Required | Description |

|---|---|---:|---|

| `rcaId` | string | Yes | Human-readable RCA identifier |

| `problem` | ObjectId | Yes | Problem associated with the RCA |

| `rootCause` | string | Yes | Identified underlying/root cause |

| `investigation` | string | Yes | Investigation details and findings |

| `contributingFactors` | string\[] | No | Factors that contributed to the problem |

| `correctiveActions` | string\[] | No | Actions taken to correct the current issue |

| `preventiveActions` | string\[] | No | Actions intended to prevent recurrence |

| `identifiedBy` | ObjectId | Yes | User who identified/conducted the RCA |

| `relatedIncidents` | ObjectId\[] | No | Incidents related to the problem |

| `organizationId` | ObjectId | Automatic | Organization/tenant |

| `status` | string | No | RCA workflow status |

| `createdAt` | Date | Automatic | RCA creation timestamp |

| `updatedAt` | Date | Automatic | Last update timestamp |



\---



\# Allowed Values



\## RCA Status



```text

Draft

Under Investigation

Completed

Approved

```



Default:



```text

Draft

```



\---



\# Array Fields



The following fields are arrays of strings:



```text

contributingFactors

correctiveActions

preventiveActions

```



Example:



```json

{

&#x20; "contributingFactors": \[

&#x20;   "Outdated VPN configuration",

&#x20;   "Missing configuration validation"

&#x20; ],

&#x20; "correctiveActions": \[

&#x20;   "Updated VPN configuration",

&#x20;   "Restarted affected network service"

&#x20; ],

&#x20; "preventiveActions": \[

&#x20;   "Add configuration validation",

&#x20;   "Schedule quarterly configuration reviews"

&#x20; ]

}

```



`relatedIncidents` is an array of MongoDB ObjectIds.



Example:



```json

{

&#x20; "relatedIncidents": \[

&#x20;   "65f123456789abcdef123456",

&#x20;   "65f123456789abcdef123457"

&#x20; ]

}

```



\---



\# Role Permissions



All RCA routes currently use the `authenticate` middleware.



All RCA and corrective-action mutation routes use `authorize("admin")`.



ADMIN is the operational role. EMPLOYEE has organization-scoped read-only RCA and corrective-action access. Backend authorization is authoritative.



| Operation | Authenticated Admin | Authenticated Employee |

|---|:---:|:---:|

| Create RCA | Yes | No |

| View all RCAs | Yes | Yes |

| View RCA by ID | Yes | Yes |

| View RCA by Problem | Yes | Yes |

| Update RCA | Yes | No |

| Delete RCA | Yes | No |



> RCA approval and all corrective-action mutations are ADMIN-only. Approved RCAs cannot be modified or deleted. Corrective-action assignment requires an active same-tenant ADMIN.



\---



\# 1. Create RCA



\## Endpoint



```http

POST /api/v1/rcas

```



\## Authentication



Required.



\## Request Headers



```http

Authorization: Bearer <JWT\_TOKEN>

Content-Type: application/json

```



\---



\## Request Body



```json

{

&#x20; "rcaId": "RCA-001",

&#x20; "problem": "65f123456789abcdef123456",

&#x20; "rootCause": "Incorrect VPN configuration on the authentication server",

&#x20; "investigation": "Logs showed repeated authentication failures caused by an outdated VPN configuration.",

&#x20; "contributingFactors": \[

&#x20;   "Outdated configuration",

&#x20;   "Missing configuration validation"

&#x20; ],

&#x20; "correctiveActions": \[

&#x20;   "Updated VPN configuration",

&#x20;   "Restarted authentication service"

&#x20; ],

&#x20; "preventiveActions": \[

&#x20;   "Add configuration validation",

&#x20;   "Schedule regular configuration reviews"

&#x20; ],

&#x20; "identifiedBy": "65f123456789abcdef123457",

&#x20; "relatedIncidents": \[

&#x20;   "65f123456789abcdef123458"

&#x20; ],

&#x20; "status": "Draft"

}

```



\---



\## Required Fields



```text

rcaId

problem

rootCause

investigation

identifiedBy

```



\---



\## Optional Fields



```text

contributingFactors

correctiveActions

preventiveActions

relatedIncidents

status

```



\---



\## Important Frontend Rule



The backend automatically adds:



```text

organizationId

```



from the authenticated user.



The frontend should \*\*not\*\* send:



```text

organizationId

```



The frontend currently \*\*must provide\*\*:



```text

identifiedBy

```



because the current controller does not automatically set it from `req.user.id`.



\---



\# Successful Response



\## Status



```text

201 Created

```



\## Response



```json

{

&#x20; "success": true,

&#x20; "message": "RCA created successfully",

&#x20; "data": {

&#x20;   "\_id": "...",

&#x20;   "rcaId": "RCA-001",

&#x20;   "problem": "...",

&#x20;   "rootCause": "Incorrect VPN configuration on the authentication server",

&#x20;   "investigation": "Logs showed repeated authentication failures caused by an outdated VPN configuration.",

&#x20;   "contributingFactors": \[

&#x20;     "Outdated configuration",

&#x20;     "Missing configuration validation"

&#x20;   ],

&#x20;   "correctiveActions": \[

&#x20;     "Updated VPN configuration",

&#x20;     "Restarted authentication service"

&#x20;   ],

&#x20;   "preventiveActions": \[

&#x20;     "Add configuration validation",

&#x20;     "Schedule regular configuration reviews"

&#x20;   ],

&#x20;   "identifiedBy": "...",

&#x20;   "relatedIncidents": \[

&#x20;     "..."

&#x20;   ],

&#x20;   "organizationId": "...",

&#x20;   "status": "Draft",

&#x20;   "createdAt": "...",

&#x20;   "updatedAt": "..."

&#x20; }

}

```



\---



\# Create RCA Validation



The backend validates:



\### Organization



`organizationId` must be a valid MongoDB ObjectId.



\### Problem



The referenced problem must:



\- Exist

\- Belong to the authenticated user's organization



\### Identified User



The `identifiedBy` user must:



\- Exist

\- Be active

\- Belong to the authenticated user's organization



\### Related Incidents



Every related incident must:



\- Have a valid MongoDB ObjectId

\- Exist

\- Belong to the authenticated user's organization



\---



\# Duplicate RCA ID



`rcaId` must be unique within an organization.



Example:



```text

Organization A



RCA-001 → allowed

RCA-001 → rejected

```



Another organization can use the same RCA ID:



```text

Organization B



RCA-001 → allowed

```



Expected error:



```text

An RCA with this RCA ID already exists in this organization

```



\---



\# One RCA Per Problem



Only one RCA can be associated with a problem within an organization.



Example:



```text

Problem PRB-001

&#x20;       |

&#x20;       └── RCA-001

```



Attempting to create another RCA for the same problem will fail.



Expected error:



```text

An RCA already exists for this problem

```



\---



\# 2. Get All RCAs



\## Endpoint



```http

GET /api/v1/rcas

```



\## Authentication



Required.



\## Headers



```http

Authorization: Bearer <JWT\_TOKEN>

```



\---



\## Successful Response



\### Status



```text

200 OK

```



\### Response



```json

{

&#x20; "success": true,

&#x20; "count": 1,

&#x20; "data": \[

&#x20;   {

&#x20;     "\_id": "...",

&#x20;     "rcaId": "RCA-001",

&#x20;     "problem": {

&#x20;       "\_id": "...",

&#x20;       "problemId": "PRB-001",

&#x20;       "title": "Recurring VPN Connection Failures",

&#x20;       "description": "Employees are repeatedly experiencing VPN failures.",

&#x20;       "priority": "High",

&#x20;       "impact": "High",

&#x20;       "urgency": "High",

&#x20;       "status": "Under Investigation"

&#x20;     },

&#x20;     "rootCause": "Incorrect VPN configuration",

&#x20;     "investigation": "Investigation findings...",

&#x20;     "contributingFactors": \[

&#x20;       "Outdated configuration"

&#x20;     ],

&#x20;     "correctiveActions": \[

&#x20;       "Updated configuration"

&#x20;     ],

&#x20;     "preventiveActions": \[

&#x20;       "Added configuration validation"

&#x20;     ],

&#x20;     "identifiedBy": {

&#x20;       "\_id": "...",

&#x20;       "name": "Support Employee",

&#x20;       "email": "support@example.com",

&#x20;       "role": "employee"

&#x20;     },

&#x20;     "relatedIncidents": \[

&#x20;       {

&#x20;         "\_id": "...",

&#x20;         "incidentId": "INC-001",

&#x20;         "title": "VPN connection failure",

&#x20;         "priority": "High",

&#x20;         "severity": "Major",

&#x20;         "status": "Resolved"

&#x20;       }

&#x20;     ],

&#x20;     "organizationId": "...",

&#x20;     "status": "Completed",

&#x20;     "createdAt": "...",

&#x20;     "updatedAt": "..."

&#x20;   }

&#x20; ]

}

```



\---



\## Organization Isolation



Only RCAs belonging to the authenticated user's organization are returned.



The backend filters using:



```text

organizationId

```



RCAs from another organization cannot be returned.



\---



\## Sorting



RCAs are sorted by:



```text

createdAt DESC

```



Newest RCAs appear first.



\---



\# Populated Fields



The backend populates the following fields.



\## Problem



The problem includes:



```text

problemId

title

description

priority

impact

urgency

status

```



\## Identified User



The identifying user includes:



```text

name

email

role

```



\## Related Incidents



Related incidents include:



```text

incidentId

title

priority

severity

status

```



\---



\# 3. Get RCA By ID



\## Endpoint



```http

GET /api/v1/rcas/:id

```



Example:



```http

GET /api/v1/rcas/65f123456789abcdef123456

```



\## Authentication



Required.



\---



\## Successful Response



\### Status



```text

200 OK

```



```json

{

&#x20; "success": true,

&#x20; "data": {

&#x20;   "\_id": "...",

&#x20;   "rcaId": "RCA-001",

&#x20;   "problem": {

&#x20;     "\_id": "...",

&#x20;     "problemId": "PRB-001",

&#x20;     "title": "Recurring VPN Connection Failures",

&#x20;     "description": "Employees are repeatedly experiencing VPN failures.",

&#x20;     "priority": "High",

&#x20;     "impact": "High",

&#x20;     "urgency": "High",

&#x20;     "status": "Under Investigation",

&#x20;     "rootCause": "..."

&#x20;   },

&#x20;   "rootCause": "Incorrect VPN configuration",

&#x20;   "investigation": "Investigation findings...",

&#x20;   "contributingFactors": \[

&#x20;     "Outdated configuration"

&#x20;   ],

&#x20;   "correctiveActions": \[

&#x20;     "Updated configuration"

&#x20;   ],

&#x20;   "preventiveActions": \[

&#x20;     "Added configuration validation"

&#x20;   ],

&#x20;   "identifiedBy": {

&#x20;     "\_id": "...",

&#x20;     "name": "Support Employee",

&#x20;     "email": "support@example.com",

&#x20;     "role": "employee"

&#x20;   },

&#x20;   "relatedIncidents": \[

&#x20;     {

&#x20;       "\_id": "...",

&#x20;       "incidentId": "INC-001",

&#x20;       "title": "VPN connection failure",

&#x20;       "description": "VPN unavailable",

&#x20;       "priority": "High",

&#x20;       "severity": "Major",

&#x20;       "status": "Resolved",

&#x20;       "resolution": "VPN configuration corrected"

&#x20;     }

&#x20;   ],

&#x20;   "organizationId": "...",

&#x20;   "status": "Completed",

&#x20;   "createdAt": "...",

&#x20;   "updatedAt": "..."

&#x20; }

}

```



\---



\## Not Found



```text

404 Not Found

```



```json

{

&#x20; "success": false,

&#x20; "message": "RCA not found"

}

```



\---



\# Invalid RCA ID



If the supplied ID is not a valid MongoDB ObjectId:



```text

400 Bad Request

```



```json

{

&#x20; "success": false,

&#x20; "message": "Invalid RCA ID"

}

```



\---



\# 4. Get RCA By Problem



This endpoint is useful when the frontend is displaying a Problem Details page and needs the RCA associated with that problem.



\## Endpoint



```http

GET /api/v1/rcas/problem/:problemId

```



Example:



```http

GET /api/v1/rcas/problem/65f123456789abcdef123456

```



> This route must remain before `/:id` in the Express router.



\---



\## Authentication



Required.



\---



\## Successful Response



\### Status



```text

200 OK

```



```json

{

&#x20; "success": true,

&#x20; "data": {

&#x20;   "\_id": "...",

&#x20;   "rcaId": "RCA-001",

&#x20;   "problem": {

&#x20;     "\_id": "...",

&#x20;     "problemId": "PRB-001",

&#x20;     "title": "Recurring VPN Connection Failures",

&#x20;     "description": "Employees are repeatedly experiencing VPN failures.",

&#x20;     "priority": "High",

&#x20;     "impact": "High",

&#x20;     "urgency": "High",

&#x20;     "status": "Resolved",

&#x20;     "rootCause": "Incorrect VPN configuration"

&#x20;   },

&#x20;   "rootCause": "Incorrect VPN configuration",

&#x20;   "investigation": "Investigation findings...",

&#x20;   "contributingFactors": \[],

&#x20;   "correctiveActions": \[],

&#x20;   "preventiveActions": \[],

&#x20;   "identifiedBy": {

&#x20;     "\_id": "...",

&#x20;     "name": "Support Employee",

&#x20;     "email": "support@example.com",

&#x20;     "role": "employee"

&#x20;   },

&#x20;   "relatedIncidents": \[],

&#x20;   "organizationId": "...",

&#x20;   "status": "Completed"

&#x20; }

}

```



\---



\## RCA Not Found For Problem



```text

404 Not Found

```



```json

{

&#x20; "success": false,

&#x20; "message": "No RCA found for this problem"

}

```



\---



\# 5. Update RCA



\## Endpoint



```http

PUT /api/v1/rcas/:id

```



\## Authentication



Required.



\---



\## Request Body



All update fields are optional.



Example:



```json

{

&#x20; "rootCause": "Outdated VPN authentication configuration",

&#x20; "investigation": "Additional investigation identified an outdated authentication configuration.",

&#x20; "contributingFactors": \[

&#x20;   "Outdated configuration",

&#x20;   "No automated configuration validation"

&#x20; ],

&#x20; "correctiveActions": \[

&#x20;   "Updated authentication configuration"

&#x20; ],

&#x20; "preventiveActions": \[

&#x20;   "Implemented configuration validation"

&#x20; ],

&#x20; "status": "Completed"

}

```



\---



\## Fields That Can Be Updated



```text

problem

rootCause

investigation

contributingFactors

correctiveActions

preventiveActions

identifiedBy

relatedIncidents

status

```



\---



\# Updating the Problem Reference



The problem can be changed.



The new problem must:



\- Have a valid ObjectId

\- Exist

\- Belong to the same organization



The backend also prevents assigning the RCA to a problem that already has another RCA.



\---



\# Updating Identified By



The new user must:



\- Have a valid ObjectId

\- Exist

\- Be active

\- Belong to the same organization



\---



\# Updating Related Incidents



Every incident in `relatedIncidents` must:



\- Have a valid ObjectId

\- Exist

\- Belong to the same organization



Example:



```json

{

&#x20; "relatedIncidents": \[

&#x20;   "65f123456789abcdef123456",

&#x20;   "65f123456789abcdef123457"

&#x20; ]

}

```



An empty array is allowed:



```json

{

&#x20; "relatedIncidents": \[]

}

```



\---



\# Successful Update



\### Status



```text

200 OK

```



```json

{

&#x20; "success": true,

&#x20; "message": "RCA updated successfully",

&#x20; "data": {

&#x20;   "\_id": "...",

&#x20;   "rcaId": "RCA-001",

&#x20;   "status": "Completed",

&#x20;   "updatedAt": "..."

&#x20; }

}

```



\---



\# 6. Delete RCA



\## Endpoint



```http

DELETE /api/v1/rcas/:id

```



\## Authentication



Required.



\## Important



The route requires authentication and `authorize("admin")`. EMPLOYEE requests return 403. Approved RCAs cannot be deleted.

\---



\## Successful Response



\### Status



```text

200 OK

```



```json

{

&#x20; "success": true,

&#x20; "message": "RCA deleted successfully",

&#x20; "data": {

&#x20;   "\_id": "...",

&#x20;   "rcaId": "RCA-001",

&#x20;   "problem": "...",

&#x20;   "rootCause": "...",

&#x20;   "status": "Completed"

&#x20; }

}

```



\---



\## RCA Not Found



```text

404 Not Found

```



```json

{

&#x20; "success": false,

&#x20; "message": "RCA not found"

}

```



\---



\# Multi-Tenant Security



All RCA operations are scoped to:



```text

organizationId

```



The organization ID comes from the authenticated user.



The backend uses organization filtering when:



\- Creating RCAs

\- Finding problems

\- Finding identifying users

\- Finding related incidents

\- Reading RCAs

\- Updating RCAs

\- Deleting RCAs



This prevents users from accessing RCA records belonging to another organization.



\---



\# RCA Relationships



The RCA module connects several ITSM entities.



```text

&#x20;                   ┌──────────────┐

&#x20;                   │   Problem    │

&#x20;                   │   PRB-001    │

&#x20;                   └──────┬───────┘

&#x20;                          │

&#x20;                          │ one RCA

&#x20;                          ▼

&#x20;                   ┌──────────────┐

&#x20;                   │     RCA      │

&#x20;                   │   RCA-001    │

&#x20;                   └──────┬───────┘

&#x20;                          │

&#x20;             ┌────────────┼────────────┐

&#x20;             │            │            │

&#x20;             ▼            ▼            ▼

&#x20;       Root Cause   Corrective    Preventive

&#x20;                    Actions       Actions

&#x20;                          │

&#x20;                          ▼

&#x20;                   Related Incidents

```



\---



\# Frontend Integration



\## Axios Example



```ts

const response = await axios.post(

&#x20; "/api/v1/rcas",

&#x20; {

&#x20;   rcaId: "RCA-001",

&#x20;   problem: problemId,

&#x20;   rootCause: "Incorrect VPN configuration",

&#x20;   investigation: "Investigation findings...",

&#x20;   contributingFactors: \[

&#x20;     "Outdated configuration"

&#x20;   ],

&#x20;   correctiveActions: \[

&#x20;     "Updated configuration"

&#x20;   ],

&#x20;   preventiveActions: \[

&#x20;     "Added configuration validation"

&#x20;   ],

&#x20;   identifiedBy: userId,

&#x20;   relatedIncidents: \[

&#x20;     incidentId

&#x20;   ],

&#x20;   status: "Draft"

&#x20; },

&#x20; {

&#x20;   headers: {

&#x20;     Authorization: `Bearer ${token}`

&#x20;   }

&#x20; }

);

```



\---



\# Frontend Create Form



The frontend should provide fields for:



```text

RCA ID

Problem

Root Cause

Investigation

Contributing Factors

Corrective Actions

Preventive Actions

Identified By

Related Incidents

Status

```



\---



\# Frontend Update Form



The frontend can update:



```text

Problem

Root Cause

Investigation

Contributing Factors

Corrective Actions

Preventive Actions

Identified By

Related Incidents

Status

```



\---



\# Recommended RCA UI



A Problem Details page can display:



```text

Problem

│

├── Problem Information

│

├── Related Incidents

│

└── Root Cause Analysis

&#x20;    │

&#x20;    ├── RCA ID

&#x20;    ├── Root Cause

&#x20;    ├── Investigation

&#x20;    ├── Contributing Factors

&#x20;    ├── Corrective Actions

&#x20;    ├── Preventive Actions

&#x20;    ├── Identified By

&#x20;    └── Status

```



The frontend can use:



```http

GET /api/v1/rcas/problem/:problemId

```



to load the RCA directly from a Problem Details page.



\---



\# TypeScript Types



```ts

export type RCAStatus =

&#x20; | "Draft"

&#x20; | "Under Investigation"

&#x20; | "Completed"

&#x20; | "Approved";



export interface RCA {

&#x20; \_id: string;



&#x20; rcaId: string;



&#x20; problem: string | Problem;



&#x20; rootCause: string;



&#x20; investigation: string;



&#x20; contributingFactors: string\[];



&#x20; correctiveActions: string\[];



&#x20; preventiveActions: string\[];



&#x20; identifiedBy: string | User;



&#x20; relatedIncidents: string\[] | Incident\[];



&#x20; organizationId: string;



&#x20; status: RCAStatus;



&#x20; createdAt: string;



&#x20; updatedAt: string;

}

```



\---



\# API Summary



| Method | Endpoint | Authentication |

|---|---|:---:|

| POST | `/api/v1/rcas` | Required |

| GET | `/api/v1/rcas` | Required |

| GET | `/api/v1/rcas/problem/:problemId` | Required |

| GET | `/api/v1/rcas/:id` | Required |

| PUT | `/api/v1/rcas/:id` | Required |

| DELETE | `/api/v1/rcas/:id` | Required |



\---



\# Error Responses



\## Authentication Required



```text

401 Unauthorized

```



```json

{

&#x20; "success": false,

&#x20; "message": "Authentication required"

}

```



\---



\## Invalid ObjectId



Examples:



```text

Invalid organization ID

Invalid problem ID

Invalid identifiedBy user ID

Invalid RCA ID

```



\---



\## Problem Validation Error



```json

{

&#x20; "success": false,

&#x20; "message": "Problem not found or does not belong to this organization"

}

```



\---



\## Identifying User Validation Error



```json

{

&#x20; "success": false,

&#x20; "message": "Identifying user not found, inactive, or does not belong to this organization"

}

```



\---



\## Related Incident Validation Error



```json

{

&#x20; "success": false,

&#x20; "message": "One or more related incidents were not found or do not belong to this organization"

}

```



\---



\## Duplicate RCA ID



```json

{

&#x20; "success": false,

&#x20; "message": "An RCA with this RCA ID already exists in this organization"

}

```



\---



\## Duplicate RCA For Problem



```json

{

&#x20; "success": false,

&#x20; "message": "An RCA already exists for this problem"

}

```



\---



\# Testing Checklist



\## Authentication



\- \[ ] Request without JWT

\- \[ ] Request with invalid JWT

\- \[ ] Request with valid JWT



\## Create



\- \[ ] Create RCA

\- \[ ] Create RCA with default Draft status

\- \[ ] Create RCA with valid status

\- \[ ] Invalid organization ID

\- \[ ] Invalid problem ID

\- \[ ] Non-existent problem

\- \[ ] Problem from another organization

\- \[ ] Invalid identifiedBy

\- \[ ] Inactive identifying user

\- \[ ] Identifying user from another organization

\- \[ ] Invalid related incident ID

\- \[ ] Related incident from another organization

\- \[ ] Duplicate RCA ID

\- \[ ] Second RCA for same problem



\## Read



\- \[ ] Get all RCAs

\- \[ ] Get RCA by ID

\- \[ ] Get RCA by problem

\- \[ ] Invalid RCA ID

\- \[ ] Invalid problem ID

\- \[ ] Non-existent RCA

\- \[ ] Problem without RCA

\- \[ ] Verify organization isolation

\- \[ ] Verify populated problem

\- \[ ] Verify populated identifying user

\- \[ ] Verify populated related incidents

\- \[ ] Verify newest RCAs appear first



\## Update



\- \[ ] Update root cause

\- \[ ] Update investigation

\- \[ ] Update contributing factors

\- \[ ] Update corrective actions

\- \[ ] Update preventive actions

\- \[ ] Update status

\- \[ ] Change problem

\- \[ ] Change identifiedBy

\- \[ ] Change related incidents

\- \[ ] Clear related incidents

\- \[ ] Assign RCA to problem with existing RCA

\- \[ ] Assign invalid problem

\- \[ ] Assign inactive user

\- \[ ] Assign user from another organization

\- \[ ] Assign invalid incident

\- \[ ] Assign incident from another organization



\## Delete



\- \[ ] Delete RCA

\- \[ ] Delete non-existent RCA

\- \[ ] Delete RCA from another organization

\- \[ ] Verify employee deletion is rejected with 403

\- \[ ] Verify admin delete behavior



\---



\# Backend Route Structure



```text

POST   /api/v1/rcas

GET    /api/v1/rcas

GET    /api/v1/rcas/problem/:problemId

GET    /api/v1/rcas/:id

PUT    /api/v1/rcas/:id

DELETE /api/v1/rcas/:id

```



All routes currently use:



```ts

authenticate

```



\---



\# Database Constraints



The RCA model defines the following important indexes.



\## Unique RCA ID Per Organization



```text

rcaId + organizationId

```



This allows the same RCA ID to exist in different organizations while preventing duplicates inside the same organization.



\## One RCA Per Problem



```text

problem + organizationId

```



This guarantees one RCA per problem within an organization.



\## Organization + Status



```text

organizationId + status

```



This supports organization-level status queries.



\## Organization + Creation Date



```text

organizationId + createdAt

```



This supports organization-level recent RCA queries.



\---



\# RCA Workflow



The available statuses are:



```text

Draft

&#x20;  │

&#x20;  ▼

Under Investigation

&#x20;  │

&#x20;  ▼

Completed

&#x20;  │

&#x20;  ▼

Approved

```



The current service validates the existence and organization ownership of referenced entities, but it does not currently implement explicit status-transition restrictions.



Therefore, the frontend should not assume that the backend enforces a strict workflow between these statuses unless transition rules are added to the service.



\---



\# Important Implementation Notes



\### `identifiedBy`



The current create controller does not automatically derive the identifying user from the JWT.



The request currently needs to provide:



```json

{

&#x20; "identifiedBy": "USER\_OBJECT\_ID"

}

```



If the intended behavior is that the authenticated user automatically becomes the RCA creator/identifier, the controller can later be changed to:



```ts

const rca = await createRCA({

&#x20; ...req.body,

&#x20; identifiedBy: req.user.id,

&#x20; organizationId: req.user.organizationId,

});

```



\### Delete Authorization



RCA deletion is ADMIN-only through `authorize("admin")`. EMPLOYEE remains a read-only RCA consumer; hiding frontend controls does not replace this backend restriction.

\---



\# Summary



The RCA API provides a tenant-isolated Root Cause Analysis system connected to Problems and Incidents.



The main relationships are:



```text

Organization

&#x20;    │

&#x20;    ├── Problem

&#x20;    │     │

&#x20;    │     └── RCA

&#x20;    │           ├── Root Cause

&#x20;    │           ├── Investigation

&#x20;    │           ├── Contributing Factors

&#x20;    │           ├── Corrective Actions

&#x20;    │           ├── Preventive Actions

&#x20;    │           └── Related Incidents

&#x20;    │

&#x20;    └── Users

```



The frontend can use the RCA API to build:



\- RCA list

\- RCA details

\- RCA creation form

\- RCA edit form

\- Problem → RCA view

\- Related incidents section

\- Root cause analysis workflow

\- Corrective action tracking

\- Preventive action tracking

\- RCA status management

