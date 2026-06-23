# RBAC + Training + Certificate Engine — Frontend Plan

## Ground rules
1. **Side-by-side** — zero modifications to existing pages, components, services, or utils. New code lives in new files. Only two existing files get additive changes: `App.jsx` (new routes appended) and `Header.jsx` (new nav items added alongside existing ones, gated by RBAC context).
2. **Build only against live APIs** — all 68 hub endpoints tested live on 2026-06-22; all return 401 (route exists, needs auth) or proper validation errors. Zero 404s except cert verify/download which return app-level "not found" (route exists).

## Key unknown (must resolve first)
**Does the legacy JWT work on hub endpoints?**
- Current login: `POST /auth/signin` → returns `{ accessToken }` stored in sessionStorage
- Hub endpoints: `GET /api/hub/rbac/me`, `GET /api/hub/trainings`, etc. — all behind `BearerAuth`
- Same server, same base URL (`REACT_APP_BASE_URL`)
- **Test:** After a normal login, call `GET /api/hub/rbac/me` with the existing token
  - If 200 → legacy JWT works → no new login needed, existing users get hub features immediately
  - If 401 → need hub login (`POST /api/hub/auth/signin`) as a separate entry point

This determines whether Phase 0 needs a login page or not.

---

## What exists today (snapshot)

| Layer | Current state | What we DON'T touch |
|-------|--------------|---------------------|
| Login | Code-based → `POST /auth/signin` → sessionStorage | `Login.jsx`, `services/login.js` |
| Role detection | 5-tier hardcoded in `getUserRole.js` | `getUserRole.js`, `RequirePermission.jsx` |
| Navigation | Hardcoded per-role in `Header.jsx` | Existing nav items, existing Settings dropdown |
| Route guards | `PrivateRoute` (auth-only) | `PrivateRoute.jsx` |
| Services | 14 files, all `/api/*` legacy | All files in `services/` |
| Pages | ~24 pages, all attendance/worker/admin | All files in `pages/`, `components/Workers/` |
| API client | `apiClient.js` — axios + Bearer token | `apiClient.js` (we reuse it, don't modify) |

## What the API gives us (all live today)

| Group | Endpoints | Status |
|-------|-----------|--------|
| Hub Auth | 6 (`signin`, `register`, `verify-email`, `resend`, `forgot-password`, `reset-password`) | All return proper 400 validation errors — fully functional |
| RBAC | `GET /rbac/me` (nav + actions + scope), `GET /roles` | Both 401 → exist |
| Scope | `GET /scope/tree`, `GET /scope/org-units`, `POST /scope/org-units`, `PUT /scope/admins/{id}` | All 401 → exist |
| Trainings | 29 endpoints (CRUD, nominations, registration, attendance, completion, curriculum, streaming, recordings) | All 401 → exist |
| Courses | 11 endpoints (CRUD, sections, lectures, enrollment, completion) | All 401 → exist |
| Certificates | `GET/POST certificate-templates`, `GET verify/{id}` (public), `GET certificates/{id}/download` (public) | All exist |
| Hub Workers/Attendance | Mirror of legacy endpoints under `/api/hub/*` | All 401 → exist |
| Hub Departments/Audit | `GET/POST/PUT/DELETE departments`, `GET audit` | All 401 → exist |

---

## Phase 0 — Foundation (no visible UI changes to existing app)

### 0A: Hub service layer (new files only)
- [ ] `src/services/hub/client.js` — thin wrapper that reuses `apiRequest` from existing `apiClient.js` but prefixes paths with `/api/hub`. No new axios instance needed — same base URL, same token.
- [ ] `src/services/hub/auth.js` — `hubSignIn(email, password)`, `hubRegister(...)`, `hubVerifyEmail(email, otp)`, `hubResendVerification(email)`, `hubForgotPassword(email)`, `hubResetPassword(token, password)`
- [ ] `src/services/hub/rbac.js` — `fetchMyRBAC()` → `GET /api/hub/rbac/me`, `fetchRoles()` → `GET /api/hub/roles`
- [ ] `src/services/hub/scope.js` — `fetchOrgTree()`, `fetchOrgUnits()`, `createOrgUnit(data)`, `assignAdminScope(adminId, orgUnitIds)`

### 0B: RBAC React context (new file)
- [ ] `src/contexts/RBACContext.jsx`
  - Calls `fetchMyRBAC()` on mount if `sessionStorage.accessToken` exists
  - Stores: `{ role, navigation, actions, scopeFilter, orgUnits, loading, error }`
  - If the call fails (401 / network error): context returns `null` — all consumers fall back gracefully. **Existing app behavior unchanged.**
  - Hooks:
    - `useRBAC()` → full context or `null`
    - `useHubNav(key)` → `true` if `navigation[key] === "full"`, `false` otherwise
    - `useCanAction(action)` → `true` if `actions[action] === true`
  - Wrap in `App.jsx` alongside existing `DepartmentsProvider` (additive, not replacing)

### 0C: Route guard for hub pages (new file)
- [ ] `src/components/auth/HubRoute.jsx` — wraps hub pages
  - If no auth → redirect to `/login`
  - If RBAC loaded and `navigation[requiredNav]` is `"hidden"` → redirect to dashboard
  - If RBAC not loaded (legacy login, or `/rbac/me` failed) → still allow access (graceful degradation — let the API enforce permissions server-side)

### 0D: Resolve the JWT question
- [ ] After 0A is built, manually test: login with existing code → call `GET /api/hub/rbac/me` with that token
  - **If 200:** Done — existing users get hub features via their current login
  - **If 401:** Build `src/pages/hub/HubLogin.jsx` as a separate login page at `/hub/login`, stores the hub token in sessionStorage alongside (or replacing) the legacy one. Old `/login` stays untouched.

### 0E: Add hub nav items to Header (minimal additive change to Header.jsx)
- [ ] After RBAC context is available, add to Header.jsx:
  - "Trainings" nav item — shown only if `useHubNav("trainings")` is true
  - "Courses" nav item — shown only if `useHubNav("courses")` is true
  - If RBAC context is null (legacy login where `/rbac/me` failed), these items simply don't appear. **Existing nav is unchanged.**
  - Mobile sheet: same logic, new items appended to nav group

**Acceptance:**
- [ ] All existing pages work exactly as before — zero regressions
- [ ] A user who logs in and has hub access sees Trainings/Courses in the nav
- [ ] A user whose `/rbac/me` fails sees the exact same nav they see today
- [ ] Clicking Trainings/Courses navigates to the new hub pages

---

## Phase 1 — Training list + create + detail

### 1A: Training service (new file)
- [ ] `src/services/hub/trainings.js` — all 29 training endpoint wrappers
  - List: `fetchTrainings({ page, per_page, search, category, status })`
  - CRUD: `createTraining(data)`, `fetchTraining(id)`, `fetchEnrollees(id, params)`
  - Registration: `registerForTraining(id, workerId?)`, `fetchRegistrationRequests(id)`, `reviewRequest(requestId, approved)`
  - Nominations: `nominateWorkers(id, workerIds, expiresInDays?)`, `fetchNominations(id)`, `fetchMyNominations()`, `acceptNomination(id)`, `declineNomination(id)`
  - Sessions: `fetchSessions(id)`, `addSession(id, date, label?)`
  - Attendance: `markParticipation(id, workerId, sessionDate, status)`
  - Curriculum: `fetchCurriculum(id)`, `fetchWorkerCurriculum(id)`, `addModule(id, data)`, `addLesson(id, moduleId, data)`
  - Completion: `completeEnrollment(id, enrollmentId)`
  - Dept assignments: `fetchDeptAssignments(id)`, `createDeptAssignment(id, data)`
  - Streaming: `createStreamSession(id, data)`, `updateStreamSession(id, sessionId, data)`
  - Recordings: `fetchRecordings(id, libraryOnly?)`, `addRecording(id, data)`
  - Certificates: `fetchTrainingCertificates(id)`
  - Per-worker: `fetchWorkerTrainings(workerId)`, `fetchWorkerTrainingMetrics(workerId)`

### 1B: Training list page (new files)
- [ ] `src/pages/hub/trainings/TrainingList.jsx`
  - Summary stat cards: Total, Ongoing, Upcoming, Completed, Enrollees, Certificates (from API `metrics`)
  - Filter tabs: All / Ongoing / Upcoming / Completed (maps to `status` query param)
  - Category filter dropdown: Leadership / Orientation / Skills
  - Search input (debounced)
  - Paginated DataTable: name, category, mode, status, enrollee count
  - Row click → `/hub/trainings/:id`
  - "Create Training" button — shown only if `useCanAction("create_training")`
  - Uses Quiet Cockpit tokens (cream bg, ink text, Tag for status, Stat for metrics)

### 1C: Create training form (new file)
- [ ] `src/pages/hub/trainings/CreateTraining.jsx`
  - Fields: name*, description, cohort, start_date*, end_date*, category* (select), mode* (select), duration, capacity, registration_deadline, template_slug (cert template picker from `GET /certificate-templates`)
  - On success: show registration link from response, link to training detail
  - Page gated by `useCanAction("create_training")` — redirect if false

### 1D: Training detail page (new file)
- [ ] `src/pages/hub/trainings/TrainingDetail.jsx`
  - Header: name, category Tag, mode Tag, status Tag, date range (mono numerals)
  - Tab bar: Overview | Enrollees | Sessions | Curriculum | Nominations | Requests | Certificates
  - Overview: training info + stats
  - Enrollees: DataTable with attendance status per session
  - Sessions: list + "Add Session" button (admin)
  - Curriculum: collapsible modules → lessons
  - Nominations: nomination table with status tags
  - Requests: pending self-registrations with Approve/Decline (admin)
  - Certificates: issued certificates for this training
  - Action buttons at top: "Register", "Nominate Workers", "Mark Attendance" — each gated by `useCanAction()`

### 1E: Routes (additive to App.jsx)
- [ ] Add route block in App.jsx (appended, no existing routes moved):
  ```
  /hub/trainings → TrainingList
  /hub/trainings/create → CreateTraining
  /hub/trainings/:id → TrainingDetail
  ```
  All wrapped in `<HubRoute requiredNav="trainings">`

**Acceptance:**
- [ ] Training list loads with real data from the API
- [ ] Summary cards show correct metrics
- [ ] Admin can create a training and gets a registration link
- [ ] Training detail shows enrollees, sessions, curriculum
- [ ] "Create Training" button hidden for non-admins
- [ ] All existing pages still work unchanged

---

## Phase 2 — Training flows (nomination, registration, attendance, completion)

### 2A: Nomination flow (new files)
- [ ] `src/pages/hub/trainings/NominateWorkers.jsx` — leader picks workers, sends nominations
  - Worker picker: search from directory (`GET /api/hub/workers`)
  - Expiry setting (optional)
  - Shows nomination status after submit
- [ ] `src/pages/hub/trainings/MyNominations.jsx` — worker's pending nominations
  - Cards showing: training name, nominated by, expires_at
  - Accept / Decline buttons
- [ ] Notification badge on "Trainings" nav when `fetchMyNominations()` returns items
- [ ] Routes: `/hub/trainings/:id/nominate`, `/hub/trainings/nominations`

### 2B: Self-registration + approval (additions to existing training detail)
- [ ] "Register" on training detail → `registerForTraining(id)` for self, or opens worker picker for on-behalf
- [ ] Registration request review (in Requests tab of training detail) — Approve/Decline
- [ ] "Completed" badge + disabled Register button when worker already completed
- [ ] "Refresher" option for completed workers

### 2C: Attendance marking (new file)
- [ ] `src/pages/hub/trainings/MarkAttendance.jsx`
  - Session date selector (from `fetchSessions()`)
  - Enrolled workers checklist — Present / Absent toggle per worker
  - Bulk: Mark All Present, Mark All Absent
  - Submit calls `markParticipation()` for each worker
  - Gated by `useCanAction("mark_training_attendance")`
  - Shows auto-completion result if returned
- [ ] Route: `/hub/trainings/:id/attendance`

### 2D: Completion + progression (new files)
- [ ] `src/components/hub/trainings/ProgressionTracker.jsx`
  - Visual stepper: Level 1 (BLC) → Serving Period → Level 2 (ALC)
  - Current position highlighted
  - Uses `fetchWorkerTrainingMetrics()` + `fetchDeptAssignments()`
- [ ] `src/pages/hub/trainings/DepartmentAssignments.jsx`
  - Department leader view: assigned workers + weekly participation marking
  - Active/Inactive toggle, notes field
- [ ] Routes: `/hub/trainings/:id/progression`, `/hub/trainings/:id/assignments`

**Acceptance:**
- [ ] Nominated worker sees nomination and can Accept/Decline
- [ ] Worker who completed BLC sees Register disabled + "Completed" badge + Refresher option
- [ ] Only Admin/Facilitator can access attendance marking
- [ ] Worker present for every session gets marked Completed (backend handles this)
- [ ] Progression tracker shows correct position in the pipeline

---

## Phase 3 — Course management

### 3A: Course service (new file)
- [ ] `src/services/hub/courses.js` — all 11 endpoint wrappers
  - List: `fetchCourses({ page, per_page, status, search })`
  - CRUD: `createCourse(data)`, `fetchCourse(id)`, `updateCourse(id, data)`
  - Curriculum: `fetchCurriculum(id)`, `addSection(id, title, sortOrder)`, `addLecture(sectionId, data)`
  - Enrollment: `enrollInCourse(id, workerId?)`, `fetchEnrollments(id)`
  - Progress: `completeLecture(enrollmentId, lectureId)`
  - Per-worker: `fetchWorkerCourses(workerId)`

### 3B: Course pages (new files)
- [ ] `src/pages/hub/courses/CourseList.jsx` — paginated, status filter (draft/published), search, "Create Course" button (admin)
- [ ] `src/pages/hub/courses/CreateCourse.jsx` — form: title*, description*, category*, level*, language_code*, certificate_template_id
- [ ] `src/pages/hub/courses/CourseDetail.jsx`
  - Tabs: Curriculum | Enrollments
  - Curriculum: sections → lectures (video/quiz/text), add/reorder for admin
  - Enrollments: worker list with progress_percent
  - "Enroll" button, "Publish" button (admin, sets status to "published")
- [ ] `src/components/hub/courses/LectureViewer.jsx` — video player, quiz form, text content
- [ ] Routes:
  ```
  /hub/courses → CourseList
  /hub/courses/create → CreateCourse
  /hub/courses/:id → CourseDetail
  ```

**Acceptance:**
- [ ] Admin can create a course, add sections/lectures, publish
- [ ] Worker can enroll, view lectures, track progress
- [ ] Completing all lectures auto-issues certificate (backend)

---

## Phase 4 — Certificate engine

### 4A: Certificate service (new file)
- [ ] `src/services/hub/certificates.js`
  - `fetchTemplates()`, `createTemplate(data)` (layout: headline, subtitle, body, signatory, accent_color)
  - `verifyCertificate(certNumber)` (public, no auth)
  - `downloadCertificate(certNumber)` (public, returns PDF)

### 4B: Certificate pages (new files)
- [ ] `src/pages/hub/certificates/TemplateList.jsx` — admin view of templates + "Create Template" button
- [ ] `src/pages/hub/certificates/CreateTemplate.jsx` — form with layout fields + live preview
- [ ] `src/pages/hub/certificates/MyCertificates.jsx` — worker's earned certs from `fetchWorkerTrainingMetrics()` + `fetchWorkerCourses()`, download buttons
- [ ] `src/pages/hub/certificates/CertificateInventory.jsx` — admin: all certs across trainings/courses
- [ ] `src/pages/hub/certificates/VerifyCertificate.jsx` — **PUBLIC page (no auth)**
  - Input field for cert number, or direct URL `/verify/:certificateNumber`
  - Shows: valid/invalid, recipient, title, source type, issue date
  - Download button
  - Church branding (logo, cream bg)
- [ ] Routes:
  ```
  /hub/certificates → MyCertificates
  /hub/certificates/templates → TemplateList (admin)
  /hub/certificates/templates/create → CreateTemplate (admin)
  /hub/certificates/inventory → CertificateInventory (admin)
  /verify/:certificateNumber → VerifyCertificate (public — outside PrivateRoute)
  ```

**Acceptance:**
- [ ] Admin can create template with layout fields
- [ ] Worker completing 100% training attendance auto-gets certificate (backend)
- [ ] `/verify/HRV-M5XYZ-ABC123` shows valid certificate publicly
- [ ] Worker can view and download their certificates
- [ ] PDF contains name, unique ID, date, title

---

## Phase 5 — Integration + polish (only phase that touches existing files beyond App.jsx/Header.jsx)

- [ ] Wire cert template picker into Create Training / Create Course forms
- [ ] Add worker training/course stats to `ViewWorker.jsx` (additive section)
- [ ] Add training metrics to `SuperAdminOverview.jsx` (additive cards)
- [ ] Hub auth flow: if legacy JWT doesn't work on hub endpoints, add hub login option on Login.jsx (or separate page)
- [ ] End-to-end testing with real auth on all role types

---

## File plan (new files only — existing files untouched except App.jsx + Header.jsx)

```
src/
├── services/hub/           # NEW directory
│   ├── client.js           # Hub API wrapper (reuses existing apiClient)
│   ├── auth.js             # Hub auth endpoints
│   ├── rbac.js             # /rbac/me, /roles
│   ├── scope.js            # Org tree, org units
│   ├── trainings.js        # 29 training endpoints
│   ├── courses.js          # 11 course endpoints
│   └── certificates.js     # Certificate endpoints
├── contexts/
│   └── RBACContext.jsx     # NEW — RBAC context + hooks
├── components/
│   └── auth/
│       └── HubRoute.jsx    # NEW — route guard for hub pages
│   └── hub/                # NEW directory
│       └── trainings/
│           └── ProgressionTracker.jsx
│       └── courses/
│           └── LectureViewer.jsx
├── pages/hub/              # NEW directory
│   ├── trainings/
│   │   ├── TrainingList.jsx
│   │   ├── CreateTraining.jsx
│   │   ├── TrainingDetail.jsx
│   │   ├── NominateWorkers.jsx
│   │   ├── MyNominations.jsx
│   │   ├── MarkAttendance.jsx
│   │   └── DepartmentAssignments.jsx
│   ├── courses/
│   │   ├── CourseList.jsx
│   │   ├── CreateCourse.jsx
│   │   └── CourseDetail.jsx
│   ├── certificates/
│   │   ├── TemplateList.jsx
│   │   ├── CreateTemplate.jsx
│   │   ├── MyCertificates.jsx
│   │   ├── CertificateInventory.jsx
│   │   └── VerifyCertificate.jsx
│   └── HubLogin.jsx        # Only if legacy JWT doesn't work on hub endpoints
```

**Modified files (additive only):**
- `App.jsx` — append new route blocks (existing routes untouched)
- `Header.jsx` — append Trainings/Courses nav items gated by RBAC context (existing items untouched)

**Total: ~22 new files, 2 existing files with additive changes, 0 breaking changes**

---

## Dependency graph

```
Phase 0 (foundation — services, RBAC context, route guard, JWT test)
  │
  ├── Phase 1 (training list/create/detail)
  │     └── Phase 2 (training flows — nominations, attendance, completion)
  │
  ├── Phase 3 (courses — independent of trainings)
  │
  └── Phase 4 (certificates — can start after Phase 0, but cert issuance depends on Phase 1/3 for testing)
        │
        └── Phase 5 (integration — ties everything together, only phase with wider modifications)
```

Phase 0 is blocking. Phases 1, 3, 4 can run in parallel after Phase 0. Phase 2 needs Phase 1. Phase 5 comes last.
