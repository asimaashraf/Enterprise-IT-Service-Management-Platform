# MERN-014 ITSM — Frontend Development Roadmap

**Frontend Stack:** React + TypeScript + Redux Toolkit + React Query + shadcn/ui + Tailwind CSS + Zod + React Hook Form + TanStack Table + Axios + Recharts + React Router

## Development Rule

Each phase must be fully completed and verified before moving to the next phase.

Do not skip phases. Later modules depend on the architecture, reusable components, authentication flow, and application foundations established in the earlier phases.

---

# Architecture Pattern

The frontend follows the same proven layered architecture used in the previous MERN-007 (Ezitech Observability Platform) project.

The primary UI difference is that this project uses **shadcn/ui** instead of MUI or direct Radix components. Since shadcn/ui itself is built on Radix primitives, the overall architectural pattern remains similar.

## Routing Separation

Public authentication pages and authenticated application pages must use separate route groups.

Public routes include pages such as:

- Login
- Authentication-related pages

Authenticated routes must render inside the main application layout.

## Two-Layer Route Protection

The frontend must use two different protection layers:

### Auth Guard

The `AuthGuard` verifies that the user has a valid authenticated session before allowing access to protected routes.

### Role Guard

The `RoleGuard` controls navigation elements, pages, and UI actions based on the authenticated user's role.

**Golden Rule:** Client-side role protection exists only for user experience and interface control.

Real authorization must always be enforced again by the backend. Hiding a button or route in the frontend must never be treated as a security boundary.

## Server State vs Client State

Keep server state and client-only state separate.

### React Query

Use React Query for server-side data, including:

- API fetching
- Caching
- Mutations
- Cache invalidation
- Loading states
- Error states
- Refetching

### Redux Toolkit

Use Redux Toolkit only for application-wide client state, such as:

- Authentication/session state
- Sidebar state
- Theme
- Global UI filters

Do not duplicate React Query server data inside Redux.

## Axios Centralization

Create a single shared Axios instance.

The centralized API client must:

- Use the configured backend base URL
- Automatically attach the JWT Bearer token
- Handle common API errors
- Automatically clear the session/logout on unauthorized `401` responses

Suggested location:

`src/shared/utils/apiClient.ts`

## Socket.IO Architecture

Use one authenticated raw Socket.IO connection.

Build domain-specific socket services on top of that shared connection instead of mixing every event inside one large socket service.

Required domain services:

- `incidentSocketService`
- `slaSocketService`
- `changeSocketService`
- `notificationSocketService`

Each service should subscribe only to events relevant to its domain.

## Charts and Visualization

Use **Recharts** for dashboards and analytics visualization.

---

# Phase 0 — Project Setup & Tooling

## Goal

Create a clean and working frontend project skeleton that provides the foundation for all later development.

## Tasks

- [ ] Initialize Vite + React + TypeScript project
- [ ] Install and configure Tailwind CSS
- [ ] Initialize shadcn/ui
- [ ] Add required base shadcn/ui components:
  - Button
  - Input
  - Card
  - Dialog
  - Table
  - Form
  - Badge
  - Select
  - Sonner/Toast
- [ ] Configure ESLint
- [ ] Configure Prettier
- [ ] Configure environment variables (`.env`) for API base URL and other frontend configuration
- [ ] Create centralized Axios instance at `src/shared/utils/apiClient.ts`
- [ ] Install and configure React Router
- [ ] Create the basic router at `src/app/router.tsx`
- [ ] Configure Redux Toolkit store at `src/app/store.ts`
- [ ] Start with an empty/minimal Redux slice if necessary
- [ ] Configure React Query
- [ ] Wrap the application with the React Query provider

## Exit Criteria

Phase 0 is complete when:

- `npm run dev` runs successfully
- The application loads without runtime errors
- A basic homepage renders
- Tailwind CSS classes work correctly
- Router, Redux, and React Query foundations are initialized

---

# Phase 1 — Core Layout & Theming

## Goal

Build the main visual application shell that will be reused by all authenticated pages.

## Tasks

- [ ] Create `AppShell`
- [ ] Add sidebar, topbar, and main content area
- [ ] Create desktop sidebar
- [ ] Create mobile sidebar using shadcn `Sheet`
- [ ] Create `Topbar`
- [ ] Add user menu
- [ ] Add notification icon
- [ ] Add logout action
- [ ] Configure Tailwind theme and application color palette
- [ ] Add dark/light mode toggle if required
- [ ] Test responsive layout on:
  - Mobile
  - Tablet
  - Desktop
- [ ] Add temporary/dummy navigation links for layout testing

## Exit Criteria

Phase 1 is complete when:

- Sidebar renders correctly on desktop
- Mobile navigation works through a drawer/sheet
- Topbar renders correctly
- Main content area is responsive
- Navigation links are clickable
- Layout works across mobile, tablet, and desktop sizes

---

# Phase 2 — Authentication Flow

## Goal

Implement the complete frontend authentication lifecycle from login to protected routes, with enterprise-grade admin-controlled onboarding.

## Tasks

- [x] Create Redux `authSlice`
- [x] Store:
  - User
  - JWT token
  - Role
  - Organization information
- [x] Build Login page
- [x] Create login validation schema with Zod
- [x] Use React Hook Form
- [x] Use shadcn Form components
- [x] Connect login form to the backend authentication API
- [x] Configure Axios interceptor to automatically attach the JWT token
- [x] Handle `401 Unauthorized` responses with automatic session cleanup/logout
- [x] Create `AuthGuard` (`ProtectedRoute`)
- [x] Create `RoleGuard`
- [x] Persist authentication session using localStorage or an appropriate persistence mechanism
- [x] Restore session when the application reloads
- [x] Implement logout flow
- [x] **Invitation-based onboarding** (admin-controlled):
  - Replace the shared Organization ID registration model with an admin invitation flow
  - Add `AcceptInvitePage` (`/accept-invite?token=...`) that validates the token,
    displays the organization name and the invited email (read-only), and captures
    name and password (with confirm). Does NOT accept an organizationId from the browser.
  - Update LoginPage copy so the UX no longer advertises shared-Organization-ID sign-up
  - Keep the legacy `/register` route for backward compatibility / existing tests
    but no longer link to it from the UI

## Exit Criteria

Phase 2 is complete when:

- Valid credentials successfully log the user in
- JWT is used for authenticated API requests
- Protected routes are inaccessible without authentication
- Invalid credentials display an appropriate error
- Session survives a browser refresh
- Logout clears the session correctly
- Role-based UI restrictions work without replacing backend authorization
- New users join only through admin-issued invitations
- The shared Organization ID is not a public onboarding surface in the UI

---

# Phase 3 — Core Reusable Component Library

## Goal

Build reusable components that will be shared across all ITSM modules.

## Tasks

- [x] Create reusable `DataTable`
- [x] Use TanStack Table with shadcn Table
- [x] Support:
  - Sorting
  - Pagination
  - Loading state
  - Empty state
- [x] Create reusable form field wrappers for React Hook Form + Zod
- [x] Support shadcn Input and Select components
- [x] Create `StatusBadge`
- [x] Add status-based badge variants
- [x] Create `ConfirmDialog` using shadcn AlertDialog
- [x] Create `PageHeader`
- [x] Support:
  - Page title
  - Breadcrumb
  - Action button slot
- [x] Create generic/configurable `FilterBar`
- [x] Support:
  - Search input
  - Dropdown filters
- [x] Create `EmptyState`
- [x] Create `LoadingSpinner`
- [x] Create `ErrorState`

## Exit Criteria

Phase 3 is complete when a temporary component showcase/test page successfully demonstrates all reusable components working together.

---

# Phase 4 — Incident Management

## Goal

Implement the first complete real ITSM module.

Incident Management will serve as the reference/template architecture for the modules that follow.

## Tasks

- [ ] Create `incidentApi.ts`
- [ ] Create React Query hooks for:
  - List incidents
  - Get incident
  - Create incident
  - Update incident
  - Delete incident
  - Assign incident
  - Escalate incident
- [ ] Build Incident List page
- [ ] Use reusable `DataTable`
- [ ] Use reusable `FilterBar`
- [ ] Add filters for:
  - Status
  - Priority
  - Severity
- [ ] Build Incident Create form
- [ ] Build Incident Edit form
- [ ] Create Zod validation matching backend validation rules
- [ ] Build Incident Detail page
- [ ] Display:
  - Status
  - Priority
  - Severity
  - Assignment
  - Escalation
  - Resolution tracking
- [ ] Add PDF export action
- [ ] Apply role-based UI controls for employee and admin actions

## Exit Criteria

Phase 4 is complete when the complete Incident CRUD and status workflow works against the real backend API.

---

# Phase 5 — Service Request Management

## Goal

Implement the Service Request module by reusing the patterns established in Incident Management.

## Tasks

- [ ] Build request type selection UI
- [ ] Support:
  - Software
  - Hardware
  - Email
  - VPN
  - Account
  - Password Reset
  - Cloud Resource
- [ ] Build Service Request List page
- [ ] Build Service Request Create page
- [ ] Build Service Request Detail page
- [ ] Implement status tracking UI
- [ ] Connect all supported workflows to the real backend

## Exit Criteria

Service Request creation, listing, detail viewing, and status tracking work correctly with the backend.

---

# Phase 6 — Asset Management

## Goal

Provide frontend management for IT assets and their lifecycle.

## Tasks

- [ ] Build Asset List page
- [ ] Add category filters for:
  - Laptop
  - Desktop
  - Server
  - Switch
  - Router
  - License
  - Mobile
- [ ] Build Asset Create form
- [ ] Build Asset Edit form
- [ ] Support ownership information
- [ ] Support warranty information
- [ ] Support assignment information
- [ ] Build lifecycle transition UI
- [ ] Support lifecycle flow:
  - Available
  - Assigned
  - Maintenance
  - Retired
- [ ] Display asset lifecycle/history
- [ ] Display relevant audit information

## Exit Criteria

Asset CRUD, ownership, assignment, warranty, lifecycle transitions, and history work against the backend.

---

# Phase 7 — SLA Engine UI

## Goal

Expose SLA configuration and SLA tracking through the frontend.

## Tasks

- [ ] Build SLA policy configuration screens
- [ ] Support business hours configuration
- [ ] Support timezone configuration
- [ ] Support response targets
- [ ] Support resolution targets
- [ ] Display SLA indicators inside Incident Detail
- [ ] Display breach warnings
- [ ] Display SLA countdown/status
- [ ] Build escalation policy management screen

## Exit Criteria

SLA policies can be managed and live incident SLA state is clearly visible in the UI.

---

# Phase 8 — Change Management

## Goal

Implement the complete Change Management workflow.

## Tasks

- [ ] Build Change Request List page
- [ ] Build Change Request Create form
- [ ] Support risk assessment fields
- [ ] Build Change Request Detail page
- [ ] Add admin approval action
- [ ] Add admin rejection action
- [ ] Hide approval/rejection controls from unauthorized users
- [ ] Keep backend authorization as the final security boundary
- [ ] Support deployment scheduling
- [ ] Support rollback plan fields

## Exit Criteria

Change creation, review, approval/rejection, scheduling, and rollback information work correctly with backend RBAC.

---

# Phase 9 — Knowledge Base

## Goal

Provide searchable tenant-scoped knowledge management.

## Tasks

- [ ] Build knowledge content list
- [ ] Support:
  - Article
  - FAQ
  - Troubleshooting Guide
  - SOP
- [ ] Add tenant-scoped search
- [ ] Build Create Article page
- [ ] Build Edit Article page
- [ ] Integrate rich-text or Markdown editor
- [ ] Add attachment upload UI
- [ ] Add attachment download UI

## Exit Criteria

Knowledge content can be searched, created, edited, viewed, and used with attachments through the real backend.

---

# Phase 10 — Root Cause Analysis (RCA)

## Goal

Expose RCA workflows and related incident management.

## Tasks

- [ ] Build RCA List page
- [ ] Build RCA Detail page
- [ ] Build corrective actions form
- [ ] Build preventive actions form
- [ ] Restrict mutation controls according to RBAC
- [ ] Keep backend authorization as the final security boundary
- [ ] Build related incidents linking UI

## Exit Criteria

RCA data, corrective/preventive actions, and incident relationships work correctly against the backend.

---

# Phase 11 — Analytics & Dashboards

## Goal

Build the main operational dashboard and analytics visualizations.

## Tasks

- [ ] Build Dashboard Home page
- [ ] Create key metric summary cards
- [ ] Use Recharts for analytics visualization
- [ ] Build Incident Trends chart
- [ ] Build SLA Compliance chart
- [ ] Build Technician Performance chart
- [ ] Build Resolution Time chart
- [ ] Build Asset Health chart
- [ ] Build Change Success Rate chart
- [ ] Add date-range filters
- [ ] Add organization-level filters where supported by backend authorization and API scope

## Exit Criteria

All six backend analytics metrics are represented correctly in the frontend and respond to supported filters.

---

# Phase 12 — Notification Center

## Goal

Provide real-time notifications through the existing backend Socket.IO and notification infrastructure.

## Tasks

- [ ] Create a single authenticated Socket.IO connection
- [ ] Use JWT authentication during the socket handshake
- [ ] Create `incidentSocketService`
- [ ] Create `slaSocketService`
- [ ] Create `changeSocketService`
- [ ] Create `notificationSocketService`
- [ ] Keep domain event subscriptions separated
- [ ] Build notification bell
- [ ] Build notification dropdown
- [ ] Display real-time notifications
- [ ] Use shadcn Sonner for toast notifications
- [ ] Handle relevant events including:
  - New incident
  - SLA breach
  - Escalation
  - Change approval
  - Service request updates
- [ ] Build Notification History page

## Exit Criteria

Authenticated users receive appropriate real-time notifications and can view notification history.

---

# Phase 13 — Organization, Tenant & Admin Settings

## Goal

Provide administrative interfaces for tenant-scoped organization management.

## Tasks

- [ ] Build Organization Profile screen
- [ ] Build Department Management UI
- [ ] Build Support Team Management UI
- [x] Build User Management screen
  - Admin-only page listing all users in the tenant
  - Invite Employee dialog (POST /api/v1/invitations)
  - List / revoke pending invitations
  - Activate / Deactivate / Block (soft-delete) users
  - Change user role (admin ↔ employee)
  - Summary cards: Total, Active, Admins, Pending Invites
  - Search by name or email, role filter, status filter
  - Self-action guards (cannot deactivate/block/demote your own account)
  - Last-admin guards prevent orphaning the tenant's admin count
- [ ] Build Role Management controls
- [x] Restrict administrative interfaces to appropriate roles
  - `RoleGuard` component wraps `/users` route
  - Navigation filters `User Management` from sidebar for non-admin users
  - Backend remains the authoritative security boundary on every endpoint
- [ ] Build Audit Log Viewer
- [ ] Ensure audit logs remain tenant-scoped

## Exit Criteria

Administrators can manage supported organization resources through the frontend without bypassing backend tenant isolation or RBAC.

---

# Phase 14 — Responsive Polish & Accessibility

## Goal

Ensure the complete application is usable and consistent across devices and basic accessibility requirements.

## Tasks

- [ ] Manually test every page on mobile
- [ ] Manually test every page on tablet
- [ ] Manually test every page on desktop
- [ ] Confirm mobile fallback/card presentation for complex DataTables where required
- [ ] Test keyboard navigation
- [ ] Verify form labels
- [ ] Verify focus states
- [ ] Review basic accessibility behavior
- [ ] Ensure loading states are consistent
- [ ] Ensure empty states are consistent
- [ ] Ensure error states are consistent

## Exit Criteria

All major pages are responsive, keyboard-usable, and consistently handle loading, empty, and error states.

---

# Phase 15 — Final Integration Testing & Freeze

## Goal

Perform final frontend/backend integration verification and freeze the completed application.

## Tasks

- [ ] Perform an end-to-end manual walkthrough of all modules within authenticated user sessions
- [ ] Test employee workflows
- [ ] Test administrator workflows
- [ ] Double-check role-based frontend restrictions
- [ ] Confirm backend still enforces authorization independently of frontend controls
- [ ] Verify tenant-scoped behavior
- [ ] Build the production bundle using:

      npm run build

- [ ] Resolve build errors
- [ ] Review meaningful build warnings
- [ ] Perform final application smoke test
- [ ] Update README
- [ ] Update relevant `ai-context` documentation
- [ ] Mark all completed phases in this roadmap

## Exit Criteria

The frontend is considered complete when:

- All required ITSM modules are integrated with the real backend
- Authentication and RBAC flows work correctly
- Real-time functionality works
- Responsive behavior has been verified
- Production build completes successfully
- Documentation reflects the final application state

---

# Progress Tracking

After completing and verifying each phase, change its checklist items from:

`[ ]`

to:

`[x]`

Do not mark a phase complete until its exit criteria have been verified.

The next phase must not begin until the current phase is complete.