# Frontend Roadmap

## Phase 0: Foundation (COMPLETED ✓)
- [x] React + TypeScript + Vite project setup
- [x] Tailwind CSS configuration
- [x] shadcn/ui base components (Button, Card, Input, Label, Badge)
- [x] ESLint and Prettier configured
- [x] Environment variable setup for API base URL
- [x] Centralized Axios apiClient with interceptors
- [x] React Router (v6) foundation
- [x] Redux Toolkit store foundation
- [x] TanStack/React Query provider
- [x] TypeScript passes (`npm run typecheck`)
- [x] ESLint passes (`npm run lint`)
- [x] Production build succeeds (`npm run build`)
- [x] Dev server starts and serves content

## Phase 1: Core Layout & Theming (COMPLETED ✓)
- [x] Authenticated AppShell foundation (`AppShell` with `Outlet`)
- [x] Desktop sidebar (`Sidebar.tsx`, dark slate background)
- [x] Mobile responsive sidebar/drawer using shadcn `Sheet` (`MobileSidebar.tsx`)
- [x] Topbar with sticky positioning (`Topbar.tsx`)
- [x] User menu placeholder (`UserMenu.tsx` — name/email/role from props)
- [x] Notification bell placeholder (`NotificationBell.tsx` — unread count = 0)
- [x] Logout placeholder action (toast only — real flow in Phase 2)
- [x] Clickable navigation links/placeholders for ITSM modules
  - [x] Dashboard (`/`)
  - [x] Incidents (`/incidents`)
  - [x] Service Requests (`/service-requests`)
  - [x] Changes (`/changes`)
  - [x] SLA (`/sla`)
  - [x] Assets (`/assets`)
  - [x] Knowledge Base (`/knowledge-base`)
  - [x] Analytics (`/analytics`)
  - [x] Settings (`/settings`)
- [x] MERN-014 light-first theme applied
  - [x] Primary Indigo `#4F46E5` → `--primary`
  - [x] Primary Dark `#3730A3` → `--primary-dark`
  - [x] Page Background `#F8FAFC` → `--background`
  - [x] Sidebar Background `#0F172A` → `--sidebar`
- [x] Responsive AppShell (mobile / tablet / desktop)
- [x] Active route highlighting in sidebar
- [x] TypeScript passes (`npm run typecheck`)
- [x] ESLint passes (`npm run lint`)
- [x] Production build succeeds (`npm run build`)
- [x] Dev server starts; all routes return 200

## Phase 2: Authentication (PENDING)
- [ ] Login/Register pages with form validation (react-hook-form + zod)
- [ ] JWT token storage and auth state management
- [ ] Redux auth slice with login/logout actions
- [ ] Protected routes and auth guards
- [ ] User profile dropdown integration with real user data
- [ ] Theme switching (light/dark mode toggle)

## Phase 3: Dashboard (PENDING)
- [ ] Dashboard layout with metrics cards
- [ ] Incident summary widget
- [ ] SLA compliance widget
- [ ] Recent activity feed
- [ ] Quick action buttons

## Phase 4: Incidents Module (PENDING)
- [ ] Incident list with filtering/pagination
- [ ] Incident detail view
- [ ] Create incident form
- [ ] Incident assignment UI
- [ ] Incident status workflow
- [ ] Incident priority/severity badges

## Phase 5: Assets Module (PENDING)
- [ ] Asset list with filtering
- [ ] Asset detail view
- [ ] Asset assignment/unassignment
- [ ] Asset maintenance history
- [ ] Asset lifecycle tracking

## Phase 6: SLA Management (PENDING)
- [ ] SLA configuration UI
- [ ] SLA monitoring dashboard
- [ ] SLA breach notifications

## Phase 7: Changes Module (PENDING)
- [ ] Change request list
- [ ] Change request workflow
- [ ] Approval workflow

## Phase 8: Knowledge Base (PENDING)
- [ ] Article list
- [ ] Article detail view
- [ ] Search functionality

## Phase 9: Notifications (PENDING)
- [ ] Real-time notification handling (Socket.IO)
- [ ] Notification bell dropdown
- [ ] Notification list panel

## Phase 10: Analytics (PENDING)
- [ ] Incident trends chart
- [ ] SLA compliance chart
- [ ] Resolution time metrics
- [ ] Export functionality

---

## Exit Criteria

### Phase 0
| Criterion | Status |
|---|---|
| `npm run typecheck` passes | ✓ PASSED |
| `npm run lint` passes | ✓ PASSED |
| `npm run build` succeeds | ✓ PASSED |
| Dev server starts | ✓ PASSED |
| Home page loads at http://localhost:5173 | ✓ PASSED (200 OK) |

### Phase 1
| Criterion | Status |
|---|---|
| `npm run typecheck` passes | ✓ PASSED |
| `npm run lint` passes | ✓ PASSED |
| `npm run build` succeeds | ✓ PASSED |
| Dev server starts and serves `/` | ✓ PASSED (200 OK) |
| All navigation routes render (200) | ✓ PASSED (`/`, `/incidents`, `/service-requests`, `/changes`, `/sla`, `/assets`, `/knowledge-base`, `/analytics`, `/settings`) |
| Desktop sidebar visible at md+ | ✓ IMPLEMENTED |
| Mobile sheet drawer at <md | ✓ IMPLEMENTED |
| Topbar with user menu + notification bell | ✓ IMPLEMENTED |
| Logout placeholder only | ✓ IMPLEMENTED (toast) |
| MERN-014 light theme tokens applied | ✓ APPLIED |
