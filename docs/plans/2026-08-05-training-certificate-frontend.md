# Training & Certificate Frontend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the remaining FE-T / FE-C gaps so workers, leaders, facilitators, and admins can complete the full BLC→Serving→ALC training lifecycle and certificate flow in the Hub UI.

**Architecture:** Extend the existing Hub training/certificate pages under `src/pages/hub/` and thin API clients in `src/services/hub/`. Match Quiet Cockpit (`qc-*`) patterns, React Query, `useCanAction` RBAC, and `react-toastify`. No new npm deps unless a task explicitly requires one. Backend lives on the external Hub API (`/api/hub/...`); frontend only consumes documented endpoints.

**Tech Stack:** React (Vite/CRA hybrid), React Router v6, TanStack React Query v5, Tailwind + `qc-*` design system, Heroicons, react-toastify.

---

## Current state (do not rebuild)

| Task | Status | Location |
|------|--------|----------|
| FE-T1 List + filters | Done | `TrainingList.jsx` (fix Enrollees stat bug) |
| FE-T2 Create Training | Done | `CreateTraining.jsx` |
| FE-T4 Nominate | Done | `NominateWorkers.jsx` |
| FE-T5 Accept/Decline | Done | `MyNominations.jsx` |
| FE-T7 Attendance mark | Done | `MarkAttendance.jsx` |
| FE-T10 Progression UI | Partial | `ProgressionTracker.jsx` (needs worker view) |
| FE-C2 Training assign | Partial | `template_slug` on create training only |
| FE-C3 Gallery + download | Done | `WorkerCertificates.jsx` |
| FE-C5 Public verify | Done | `VerifyCertificate.jsx` (fix placeholder ID) |

**Still open (this plan):** FE-T3, FE-T6 approve UI, FE-T8 attendance columns, FE-T9 completion/refresher, FE-T10 worker page, FE-T11 BLC dept view, FE-T12 live/recordings, FE-C1 builder, FE-C2 course assign, FE-C4 preview popup, FE-C6 inventory.

---

## Conventions (every task)

- Quiet Cockpit: `qc-card`, `qc-btn-primary`, `qc-btn-secondary`, `qc-input`, `qc-label`, `qc-eyebrow`, `qc-section-title`, `Tag`, `Stat`.
- User-facing copy: no em dashes; empty values show `-`.
- RBAC: `useCanAction("create_training" | "nominate_workers" | "mark_training_attendance")`. Never hardcode Facilitator/Leader strings.
- Data: `const rows = data?.data ?? []` pattern used everywhere in hub pages.
- Toasts on mutation success/error; never silent `catch {}`.
- Routes: lazy import in `App.jsx` + `HubRoute requiredNav=...`.
- Verify after each task group: `npm run lint` (or project lint script) and `npm run build`.
- Do not commit unless the user asks.

---

### Task 1: FE-T1 polish — Training list stats + Link navigation

**Files:**
- Modify: `src/pages/hub/trainings/TrainingList.jsx`

**Step 1:** Fix the third summary card. Prefer `metrics.total_enrollees` (or whatever the API returns) over paginated `data.total`. If the API only exposes `total_trainings` / `ongoing_trainings` / `total_certificates_issued`, relabel the third card to match a real metric (e.g. "Certificates" already exists as fourth — drop the misleading "Enrollees" card or rename it to "Matching" showing `total`).

**Step 2:** Replace `window.location.href` row navigation with React Router `<Link to={/hub/trainings/${id}}>` or `useNavigate`.

**Step 3:** Lint the file. Manual check: filters All/Ongoing/Upcoming/Completed still work.

---

### Task 2: FE-T6 — Leader approval on registration requests

**Files:**
- Modify: `src/pages/hub/trainings/TrainingDetail.jsx` (`RequestTable`)
- Service already exists: `reviewRegistrationRequest` in `src/services/hub/trainings.js`

**Step 1:** Change `RequestTable` signature to accept `onReview` or use mutations inside:

```jsx
function RequestTable({ requests, trainingId }) {
  const queryClient = useQueryClient();
  const canNominate = useCanAction("nominate_workers"); // leaders who nominate also review
  const reviewMut = useMutation({
    mutationFn: ({ requestId, approved }) =>
      reviewRegistrationRequest(requestId, approved),
    onSuccess: (_d, vars) => {
      toast.success(vars.approved ? "Request approved" : "Request declined");
      queryClient.invalidateQueries({ queryKey: ["hub-training-requests", trainingId] });
      queryClient.invalidateQueries({ queryKey: ["hub-training-enrollees", trainingId] });
    },
    onError: (err) => toast.error(err.message || "Review failed"),
  });
  // For each pending row, show Approve / Decline buttons when canNominate
}
```

**Step 2:** Import `reviewRegistrationRequest` at top of `TrainingDetail.jsx`.

**Step 3:** Only show actions when `r.status === "pending"` (or missing status).

---

### Task 3: FE-T8 — Enrollee attendance record on detail page

**Files:**
- Modify: `src/pages/hub/trainings/TrainingDetail.jsx` (`EnrolleeTable`)

**Step 1:** Expand enrollee table columns. Prefer fields the API already returns on enrollees:

| Column | Field (try in order) |
|--------|----------------------|
| Worker | `worker_name` / `worker_id` |
| Type | `enrollment_type` |
| Status | `status` |
| Sessions present | `sessions_present` / `present_count` |
| Sessions total | `sessions_total` / `total_sessions` |
| Attendance | `attendance_pct` or compute `present/total` |

If the list endpoint lacks attendance, call `fetchEnrollees(id, { include_attendance: true })` or fetch sessions once and show a nested expandable row per enrollee using `e.participation` / `e.attendance_records` if present.

**Step 2:** Do **not** show grades anywhere.

**Step 3:** Empty attendance → display `-`.

---

### Task 4: FE-T9 — Completed badge, disabled Register, Refresher

**Files:**
- Modify: `src/pages/hub/trainings/TrainingDetail.jsx`
- Modify: `src/services/hub/trainings.js` (add refresher helper if missing)

**Step 1:** Derive viewer state from training payload:

```js
const isCompleted = Boolean(
  training.viewer_completed ||
  training.completion_status === "completed" ||
  (training.is_enrolled && training.enrollment_status === "completed")
);
const canRefresher = Boolean(training.allows_refresher && isCompleted);
```

**Step 2:** Replace the Self-Register block:

```jsx
{isCompleted ? (
  <div className="flex flex-wrap items-center gap-2">
    <Tag tone="success">Completed</Tag>
    <button type="button" disabled className="qc-btn-secondary opacity-50 cursor-not-allowed">
      Register
    </button>
    {canRefresher && (
      <button
        type="button"
        className="qc-btn-primary"
        disabled={refresherMut.isPending}
        onClick={() => refresherMut.mutate()}
      >
        Register as Refresher
      </button>
    )}
  </div>
) : (
  /* existing self-register when !is_enrolled && status !== completed */
)}
```

**Step 3:** Add service:

```js
export function registerAsRefresher(id) {
  return hubPost(`/trainings/${id}/register`, { enrollment_type: "refresher" });
}
```

If the backend uses a different shape (`POST /trainings/:id/refresher`), match that instead and document in a code comment.

**Step 4:** Optional admin action: button on enrollee row calling `completeEnrollment(id, enrollmentId)` gated by `mark_training_attendance` (backend still owns 100% attendance auto-complete).

---

### Task 5: FE-T3 — Cohort / batch management inside a training

**Files:**
- Create: `src/pages/hub/trainings/ManageCohorts.jsx`
- Modify: `src/services/hub/trainings.js`
- Modify: `src/App.jsx` (route)
- Modify: `src/pages/hub/trainings/TrainingDetail.jsx` (link + tab)

**API assumption** (adjust if Hub differs):

```js
export function fetchCohorts(id) {
  return hubGet(`/trainings/${id}/cohorts`);
}
export function createCohort(id, data) {
  // { name, capacity?, start_date?, end_date? }
  return hubPost(`/trainings/${id}/cohorts`, data);
}
export function updateCohort(id, cohortId, data) {
  return hubPatch(`/trainings/${id}/cohorts/${cohortId}`, data);
}
export function assignEnrolleeCohort(id, enrollmentId, cohortId) {
  return hubPost(`/trainings/${id}/enrollments/${enrollmentId}/cohort`, {
    cohort_id: cohortId,
  });
}
```

**Step 1:** If `GET /trainings/:id/cohorts` 404s in practice, fall back to treating `training.cohort` as a single batch label and manage enrollee grouping client-side via `enrollment.cohort` filter only — document that fallback in the page eyebrow.

**Step 2:** Page UI:
- List cohorts (name, capacity, enrollee count, dates)
- Create cohort form (Admin via `create_training`)
- On Enrollees tab (or this page): dropdown to assign enrollee → cohort

**Step 3:** Routes:
- `/hub/trainings/:id/cohorts` → `ManageCohorts`
- Link from TrainingDetail actions: "Manage Cohorts" when `canCreate` or always read-only

---

### Task 6: FE-T10 — Worker progression tracker page

**Files:**
- Create: `src/pages/hub/trainings/MyProgression.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/Header.jsx` (Hub dropdown link)
- Service exists: `fetchWorkerTrainingMetrics(workerId)`

**Step 1:** Page loads metrics for current worker (`getUser()` → `workerId`):

```jsx
const { data } = useQuery({
  queryKey: ["hub-worker-training-metrics", workerId],
  queryFn: () => fetchWorkerTrainingMetrics(workerId),
  enabled: Boolean(workerId),
});
// expected: { current_stage, completed_stages, blc_completed, serving_months, alc_eligible }
```

**Step 2:** Render `<ProgressionTracker currentStage={...} completedStages={...} />` plus a short eligibility note for ALC (BLC complete + serving time + participation). If API returns `alc_blocked_reason`, show it under the tracker.

**Step 3:** Route `/hub/trainings/progression` with `HubRoute requiredNav="trainings"`. Add "My Progression" next to "My Nominations" in Header Hub menu.

---

### Task 7: FE-T11 — BLC In Training department view

**Files:**
- Rewrite/extend: `src/pages/hub/trainings/DepartmentAssignments.jsx`
- Modify: `src/services/hub/trainings.js`

**Step 1:** Add patch helper:

```js
export function updateDeptAssignment(id, assignmentId, data) {
  return hubPatch(`/trainings/${id}/department-assignments/${assignmentId}`, data);
}
```

Payload fields: `{ status: "active"|"inactive", notes?, weekly_participation?: "present"|"absent"|"excused", week_of?: "YYYY-MM-DD" }`.

**Step 2:** Rebrand page when `training.category` is BLC / name matches BLC:
- Eyebrow: `BLC In Training`
- Title: department leader weekly participation

**Step 3:** Replace manual `worker_id` text input with worker search (same pattern as `NominateWorkers.jsx` → `GET /workers` via existing hub worker fetch used there).

**Step 4:** Per assignment row: status toggle Active/Inactive, notes textarea, "Mark this week" Present/Absent buttons calling `updateDeptAssignment`.

**Step 5:** Gate mutations with `useCanAction("nominate_workers")` (department leaders) or `create_training` (admin). Read-only for others.

---

### Task 8: FE-T12 — Live session screen + recording library

**Files:**
- Create: `src/pages/hub/trainings/LiveSession.jsx`
- Create: `src/pages/hub/trainings/RecordingLibrary.jsx`
- Modify: `src/services/hub/trainings.js` (already has stream/recording APIs)
- Modify: `src/App.jsx`
- Modify: `src/pages/hub/trainings/TrainingDetail.jsx` (tabs or action links)

**Step 1 — LiveSession** (`/hub/trainings/:id/live`):
- Fetch training + latest stream session (if list endpoint missing, use `training.live_stream` / create on demand).
- Admin/Facilitator (`mark_training_attendance` or `create_training`): form to start session `{ title, embed_url, starts_at }` via `createStreamSession`.
- All enrolled viewers: responsive 16:9 iframe from `embed_url` (YouTube/Vimeo/Zoom embed). Sandbox: `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"`.
- End session: `updateStreamSession(id, sessionId, { status: "ended" })`.

**Step 2 — RecordingLibrary** (`/hub/trainings/:id/recordings`):
- `fetchRecordings(id, true)` for library.
- List: title, recorded_at, duration, link/play.
- Admin: form `addRecording({ title, url, recorded_at, library: true })`.

**Step 3:** Add tabs "Live" and "Recordings" on TrainingDetail **or** action buttons linking to the new routes.

---

### Task 9: FE-C1 — Template builder with logo, signature, preview

**Files:**
- Modify: `src/pages/hub/certificates/CertificateTemplates.jsx`
- Modify: `src/services/hub/certificates.js`
- Create: `src/components/hub/certificates/CertificatePreview.jsx`
- Reuse upload: `src/services/email.js` → `uploadEmailImage` **or** mirror that helper into `certificates.js` as `uploadCertificateAsset(file)` posting to `/api/upload-email-image` with a `certificates/` filename prefix.

**Step 1 — Extend create payload:**

```js
{
  name, title_text, body_text, footer_text, background_color,
  logo_url, signature_url,
  fields: [
    // optional layout hints if backend supports them
    { key: "recipient_name", x: 50, y: 40 },
    { key: "certificate_number", x: 50, y: 55 },
    { key: "issued_at", x: 50, y: 62 },
    { key: "title", x: 50, y: 28 },
  ]
}
```

If backend rejects `fields`, omit and keep logo/signature URLs only.

**Step 2 — UI:**
- File inputs for Logo and Pastor signature → upload → store URL in form state.
- Live preview panel (`CertificatePreview`) showing merge tags replaced with sample data (`Jane Worker`, `CERT-2026-0042`, today's date, title text).
- "Save template" only after preview is visible (soft requirement: show Preview button that toggles panel).

**Step 3:** Add Header link under admin hub for Certificate Templates when `useHubNav("admin_panel")`.

---

### Task 10: FE-C2 — Assign template on course create

**Files:**
- Modify: `src/pages/hub/courses/CreateCourse.jsx`
- Possibly: `src/services/hub/courses.js` (no change if body is free-form)

**Step 1:** `useQuery` `fetchTemplates` (same as CreateTraining).

**Step 2:** Add optional select:

```jsx
<label className="qc-label">Certificate Template</label>
<select className="qc-input" value={form.template_slug} onChange={set("template_slug")}>
  <option value="">None</option>
  {templates.map((t) => (
    <option key={t.name} value={t.name}>{t.name} — {t.title_text}</option>
  ))}
</select>
```

Include `template_slug` in create payload when non-empty.

---

### Task 11: FE-C4 — Certificate preview popup

**Files:**
- Create: `src/components/hub/certificates/CertificatePreviewModal.jsx`
- Modify: `src/pages/hub/certificates/WorkerCertificates.jsx`
- Modify: `src/pages/hub/trainings/TrainingDetail.jsx` (`CertificateTable`)
- Reuse: `CertificatePreview.jsx` from Task 9

**Step 1:** Modal using a simple fixed overlay (do not reuse the attendance-specific `Modal.jsx`). Pattern:

```jsx
export default function CertificatePreviewModal({ open, onClose, certificate }) {
  if (!open || !certificate) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4" onClick={onClose}>
      <div className="qc-card max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
        <CertificatePreview
          recipientName={certificate.recipient_name}
          certificateNumber={certificate.certificate_number}
          title={certificate.title ?? certificate.training_name}
          issuedAt={certificate.issued_at}
        />
        <div className="mt-4 flex gap-2 justify-end">
          <button type="button" className="qc-btn-secondary" onClick={onClose}>Close</button>
          <a href={`/verify/${certificate.certificate_number}`} className="qc-btn-secondary">Verify</a>
          {/* Download button calling downloadCertificate */}
        </div>
      </div>
    </div>
  );
}
```

**Step 2:** Wire "Preview" on each gallery card and training CertificateTable row.

---

### Task 12: FE-C5 polish + FE-C6 admin inventory

**Files:**
- Modify: `src/pages/hub/certificates/VerifyCertificate.jsx` (placeholder → `CERT-2026-0042`)
- Create: `src/pages/hub/certificates/CertificateInventory.jsx`
- Modify: `src/services/hub/certificates.js`
- Modify: `src/App.jsx`
- Modify: `src/components/Header.jsx`

**Step 1 — Verify polish:**
- Placeholder text: `CERT-2026-0042`
- Keep valid / not-found states; surface download errors with toast.

**Step 2 — Service:**

```js
export function fetchAllCertificates(params) {
  // { search, source_type, page, per_page }
  return hubGet("/certificates", params);
}
```

**Step 3 — Inventory page** (`/hub/certificates/inventory`, `HubRoute requiredNav="admin_panel"`):
- Table: certificate_number, recipient_name, title/source, source_type, issued_at, actions (Preview, Download, Verify link)
- Search + filter by `source_type` (training | course)
- Gated create/view with `useCanAction("create_training")` for admin actions; page visible via admin_panel nav

**Step 4:** Header: "Certificate Inventory" + "Certificate Templates" under Hub/Admin when admin_panel visible.

---

### Task 13: Acceptance-criteria UI wiring checklist

These are mostly backend rules; frontend must surface them correctly.

| Criterion | Frontend check |
|-----------|----------------|
| 100% BLC attendance → Completed | After marking last Present day, invalidate enrollees; show Completed tag when API flips status. Optional: call `completeEnrollment` only if API requires manual trigger. |
| Missed day → not Completed | Enrollee status stays enrolled; no certificate row. |
| Completed → disabled Register + badge + Refresher | Task 4 |
| Nominated → Accept/Decline | Already done (`MyNominations`) |
| ALC blocked until BLC+serving+participation | Task 6 shows blocker; Create/register error toast from API message |
| Attendance screen Admin/Facilitator only | Already done via `mark_training_attendance` |
| Auto certificate on 100% BLC | Certificates tab refresh; gallery shows new cert |
| PDF fields | Download only (server-generated) |
| `/verify/CERT-2026-0042` | Route already public |
| Template logo + signature + assign | Tasks 9–10 |

**Manual QA script (after all tasks):**
1. Admin creates BLC training with template + cohort.
2. Leader nominates worker → worker Accepts.
3. Facilitator marks all session days Present → enrollee Completed + certificate appears.
4. Facilitator marks one Absent on another worker → no Completed.
5. Completed worker sees disabled Register + Refresher.
6. Worker opens My Progression (Level 1 → Serving → Level 2).
7. Dept leader marks weekly BLC participation.
8. Admin opens live embed + adds recording.
9. Visit `/verify/{number}` public page.
10. Admin opens certificate inventory.

---

### Task 14: Verification gate

**Commands:**

```bash
npm run lint
npm run build
```

Expected: both exit 0. Fix any new errors in touched files only.

---

## Out of scope

- Backend Hub API implementation / migrations (external service).
- Legacy `LeadershipRegistration.jsx` BLC/ALC public form (parallel system).
- Grades, scoring, or exam UI.
- Drag-and-drop pixel-perfect certificate designer (preview + URL assets is enough unless backend adds coordinates API).
- Committing / opening PRs (user request required).

---

## Swagger API audit (2026-08-05)

Source: [harvesters-ui-api-pages swagger.yaml](https://chidibede.github.io/harvesters-ui-api-pages/swagger.yaml)

### Documented and usable for this plan

| Plan need | Swagger operation | Method + path | Notes |
|-----------|-------------------|---------------|-------|
| FE-T1 list + filters | `listTrainings` | `GET /api/hub/trainings` | Query: `status` enum upcoming\|ongoing\|completed, `category`, `search`, page. Metrics: `total_trainings`, `ongoing_trainings`, `total_certificates_issued`. List rows include `number_of_enrollees`. **No `total_enrollees` metric.** |
| FE-T2 create | `createTraining` | `POST /api/hub/trainings` | Schema `CreateTrainingInput`: name, description, **cohort (string)**, dates, category enum, mode, duration, capacity, registration_deadline, **template_slug**. |
| FE-T4 nominate | `nominateWorkers` | `POST .../nominate` | `{ worker_ids, expires_in_days }` |
| FE-T4 list | `listTrainingNominations` | `GET .../nominations` | |
| FE-T5 my noms | `listMyNominations` | `GET .../nominations/me` | |
| FE-T5 accept/decline | `acceptNomination` / `declineNomination` | `POST .../nominations/{id}/accept\|decline` | Accept returns `enrollment_type: primary` |
| FE-T6 self-register | `registerForTraining` | `POST .../register` | Worker: `{}` → pending request. Leader: `{ worker_id }` → instant. **No `enrollment_type` / refresher in schema.** |
| FE-T6 list requests | `listRegistrationRequests` | `GET .../registration-requests` | |
| FE-T6 review | `reviewRegistrationRequest` | `POST .../registration-requests/{requestId}/review` | `{ approved: true }` |
| FE-T7 sessions | `listTrainingSessions` / `postTrainingSession` | `GET\|POST .../sessions` | |
| FE-T7 attendance | `postTrainingParticipation` | `POST .../participation` | `{ worker_id, session_date, status: present }`. Response may include `auto_complete.auto_completed` + `certificate_created`. |
| FE-T8 enrollees | `getTrainingEnrollees` | `GET .../enrollees` | Summary: "Paginated enrollee list **with attendance status**" (field shapes not exemplified). |
| FE-T8/T9 detail | `getTrainingDetail` | `GET .../{id}` | Response shape not exemplified. |
| FE-T9 manual complete | `completeEnrollment` | `POST .../enrollments/{enrollmentId}/complete` | Issues certificate; example number `HRV-M5XYZ-ABC123`. |
| FE-T10 metrics | `getUserTrainingMetrics` | `GET /api/hub/users/{id}/training-metrics` | Example only: `total_trainings_taken`, `ongoing`, `completed`, `certificates`. **No progression stages.** |
| FE-T10 trainings | `getUserTrainings` | `GET /api/hub/users/{id}/trainings` | |
| FE-T11 dept list/create | `listDepartmentAssignments` / `postDepartmentAssignment` | `GET\|POST .../department-assignments` | Create body: `worker_id`, **`department_name`**, `start_date`, `required_duration_days`. |
| FE-T12 live create/patch | `postStreamSession` / `patchStreamSession` | `POST .../stream-sessions`, `PATCH .../stream-sessions/{id}` | Fields: `provider`, `provider_room_id`, **`stream_url`**, flags, `started_at`/`ended_at`. **No GET list.** |
| FE-T12 recordings | `listRecordings` / `postRecording` | `GET\|POST .../recordings` | Query `library_only`. Body: `title`, **`storage_url`**, `duration_seconds`, `downloadable`, **`library_visible`**. |
| FE-C1 list/create templates | `listCertificateTemplates` / `createCertificateTemplate` | `GET\|POST /api/hub/certificate-templates` | Create example uses nested **`layout`** (`headline`, `subtitle`, `body`, `signatory`, `accent_color`) + `name`/`description`. **Not** flat `title_text`/`body_text`/`logo_url`/`signature_url`. |
| FE-C2 training template | (on createTraining) | `template_slug` | Documented. |
| FE-C2 course template | `createCourse` | `POST /api/hub/courses` | Uses **`certificate_template_id`** (nullable), not `template_slug`. |
| FE-C5 verify | `verifyCertificate` | `GET /api/hub/verify/{certificateNumber}` | Public; example ID `HRV-M5XYZ-ABC123`. |
| FE-C3/C5 download | `downloadCertificate` | `GET /api/hub/certificates/{certificateNumber}/download` | Public PDF. |
| Per-training certs | `listTrainingCertificates` | `GET .../trainings/{id}/certificates` | |
| Curriculum (optional) | modules/lessons/curriculum | documented | Not required for open FE-T gaps. |

### Missing from swagger (plan assumed these — do not invent clients as if they exist)

| Plan assumption | Status in swagger | Frontend implication |
|-----------------|-------------------|----------------------|
| **FE-T3** `GET/POST/PATCH .../cohorts`, assign enrollee cohort | **Absent.** Only `cohort: string` on create training. | Cohort "management" = edit/display the string label + filter enrollees by `cohort` if returned; no batch CRUD API. |
| **FE-T9** refresher via `register` `{ enrollment_type: "refresher" }` | **Absent.** Register body only optional `worker_id`. Accept example only shows `enrollment_type: primary`. | Block Refresher UI until backend adds it, or surface only if detail payload exposes `allows_refresher` + a documented path. |
| **FE-T10** progression stages (BLC → Serving → ALC) | **Absent** on `training-metrics` (counts only). No progression endpoint. | Keep `ProgressionTracker` as presentational; derive stages only if `getTrainingDetail` / user trainings returns them. Else show metrics cards from documented fields. |
| **FE-T11** `PATCH .../department-assignments/{id}`, weekly participation | **Absent.** POST create only; no Active/Inactive or weekly mark. | List + create with swagger body (`department_name`, `start_date`, `required_duration_days`). Weekly Active/Inactive needs a backend addition. |
| **FE-T12** `GET .../stream-sessions` | **Absent** (POST + PATCH only). | Live page must get `stream_url` from training detail, create response, or client-held session id after create. |
| **FE-C1** logo/signature upload + field placement | **Absent.** Template = `layout` text/color object only. | Align create form to swagger `layout` shape. Logo/signature upload is out of band (or blocked) until API supports URLs. |
| **FE-C4** preview API | **Absent.** | Client-side preview from template/cert metadata only. |
| **FE-C6** `GET /api/hub/certificates` inventory | **Absent.** | Aggregate via `listTrainings` → `listTrainingCertificates` per training (and courses if a cert list appears later). |
| **FE-C3** `GET /api/hub/users/{id}/certificates` | **Absent from swagger** (frontend already calls it). | Keep calling it; treat as undocumented. Fallback: worker trainings + per-training certs. |
| Cert ID format `CERT-YYYY-####` | Swagger examples use **`HRV-M5XYZ-ABC123`**. | Verify placeholder should match swagger (`HRV-…`), not CERT-2026-0042, unless product overrides docs. |

### Payload mismatches vs current frontend / plan

| Area | Plan / current FE | Swagger |
|------|-------------------|---------|
| Dept assignment create | `{ department, status, notes }` | `{ worker_id, department_name, start_date, required_duration_days }` |
| Certificate template create | `title_text`, `body_text`, `footer_text`, `background_color` | `name`, `description`, `layout.{headline,subtitle,body,signatory,accent_color}` |
| Course template assign | `template_slug` | `certificate_template_id` |
| Stream session | `embed_url` | `stream_url` (+ provider fields) |
| Recording add | `url`, `library` | `storage_url`, `library_visible` |
| List metrics "Enrollees" card | hoped `metrics.total_enrollees` | Use row `number_of_enrollees` sum **or** drop card; metrics only have trainings/ongoing/certs |

### Revised build rules (replace earlier API risks)

1. **Only call paths that appear in swagger** (plus the already-shipped undocumented `GET /users/{id}/certificates` until confirmed).
2. **FE-T3 / FE-T9 Refresher / FE-T11 weekly PATCH / FE-C6 global inventory / FE-C1 logo+signature** are **backend gaps**. UI for those must either (a) degrade to documented fields, or (b) wait on API. Do not invent `/cohorts` or `GET /certificates`.
3. Align Create Template + Create Course + Dept Assignments + Live/Recordings payloads to swagger field names before polish work.
4. Auto-complete + auto-certificate is **documented** on participation response (`auto_complete`); FE should toast and invalidate queries when those flags return true.
5. If an endpoint 404s, toast the error; do not invent local mock stores.
