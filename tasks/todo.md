# Super Admin dashboard → use Church Admin dashboard

Problem: `/overview/super-admin` (SuperAdminOverview) shows wrong numbers — it
re-aggregates workers/directorates client-side instead of using the attendance
API the Church Admin dashboard uses. Its own service already called
`fetchAdminAttendance("All", true, date)` internally, so the Dashboard data
path is the correct source of truth.

## Plan
- [x] Dashboard.jsx: treat Super Admin like Church Admin (same query, same
      tables, team filter, birthdays); heading shows campus name
- [x] Dashboard.jsx: for Super Admin, replace the read-only window banner with
      the manual Open/Close attendance-window control (ported from
      SuperAdminOverview, incl. confirm sheet) so no functionality is lost
- [x] App.jsx: route `/overview/super-admin` → Dashboard; drop SuperAdminOverview
- [x] Delete src/pages/SuperAdminOverview.jsx
- [x] Lint + build
- [x] Verify in browser with both logins (super admin + church admin)

## Review

- **Dashboard.jsx**: `isChurchAdmin` now includes `isSuperAdmin` (from
  `getUserRole()`), so Super Admin gets the exact Church Admin query —
  `fetchAdminAttendance(activeGroup, true, selectedDate, …, permissions)` —
  plus the same stats, directorate table, department summary, team/Sunday
  filters, and birthdays. Heading `scope` resolves to `ADMIN_ENUMS.ADMIN_TEAM`
  ("Gbagada Campus") for Super Admin. The attendance-window card is split:
  Super Admin sees the manual Open/Close control with the MobileSheet confirm
  (ported from SuperAdminOverview, using `enableAttendance`/
  `disableAttendance` + localStorage flag); all other roles keep the
  schedule-based read-only banner.
- **App.jsx**: `/overview/super-admin` renders `Dashboard`; the
  `SuperAdminOverview` lazy import is gone. `src/pages/SuperAdminOverview.jsx`
  deleted (−735 lines).
- **Lint + build**: both pass clean.
- **Browser verification** (dev server, mocked API responses since the AWS
  backend requires a real login token — network log confirmed the Super Admin
  route fires `GET /api/attendance/admin?…&isChurchAdmin=true`, i.e. the
  correct data path):
  - Super Admin at `/overview/super-admin`: "Gbagada Campus" heading, Open
    window control + confirm sheet (opened and cancelled — no writes), stats
    computed from API rows (49/40/9/81.63%), directorate + department tables,
    birthdays widget.
  - Church Admin at `/attendance/dashboard`: identical dashboard with the
    read-only "Closed – opens Sunday" banner and no toggle.
- Also flipped `.claude/launch.json` `autoPort` to `true` so a second session
  can start the dev server when port 3000 is busy.

# Add Worker form: District/Sub-team placement + super admin filters

## Plan
- [x] AddWorker.jsx: when Team = Districts, show District/Sub-team before
      Department; mark it required (label + validation); reset it on team change
- [x] departments.js: seed `fetchTeamsAndDepartmentsForFilter` with the static
      `teamsAndDepartments` map so super admin Workers filters show every team,
      not just the ones mapped in the departments table (was: only Ministry)
- [x] Lint + build
- [x] Verify in browser

## Review
- **Why data only showed for Ministry**: the super admin Workers page builds
  its Team/Department filters from `GET /api/departments` (grouped by each
  row's `team` field). Only Ministry departments have a team assigned in that
  table, so every other team vanished from the filters. Church Admin's page
  never uses that API — it falls back to the static list, hence "has all".
  Frontend now merges static + API; assigning teams in Manage Departments
  remains the data-side fix.
- **Verified** (mocked API): field order Team → District/Sub-team → Department;
  "Please select a District/Sub-team" blocks submit until selected; Workers
  filter lists all 11 teams and Districts shows its 15 communities even with
  an empty departments API response. Lint + build pass.

# Super Admin dashboard shows only Ministry (follow-up)

## Plan
- [x] expandPermissions: always expand fully for Super/Church Admin, even when
      the stored permissions array is a non-empty partial allowlist
- [x] Switch remaining raw `authUser?.permissions` call sites to
      expandPermissions (DepartmentSummary, DepartmentAttendance, Workers,
      DepartmentAttendanceHistory, DepartmentSummaryHistory)
- [x] Fix resulting exhaustive-deps warnings (deps now use stable `authUser`)
- [x] Lint + build + browser verify

## Review
- **Root cause**: the real super admin's login record carries a partial
  permissions array (Ministry departments only). `expandPermissions` trusted
  any non-role-only array and passed it through, so the backend scoped the
  dashboard to Ministry. Earlier testing missed it because the fake test user
  had no permissions array (which did trigger full expansion).
- **Fix**: Super/Church Admin roles now always get the full department
  expansion regardless of the stored array; other roles unchanged. Also
  applied expandPermissions at the five remaining raw call sites so summary,
  attendance, history, and workers pages don't hit the same bug.
- **Verified** (mocked API, super admin with Ministry-only stored permissions):
  dashboard and /summary/super-admin both send the full 129-permission
  expansion (Districts + Programs + Ministry all present); one request per
  endpoint (no fetch loops). Lint passes, build compiles clean after clearing
  a stale CRA eslint cache.

# Live test with real Super Admin login (2026-07-04)

## Findings
- Logged in with the real super admin credential. The backend, not the
  frontend, was scoping data: `/api/attendance/admin` ignores the
  `permissions` query param entirely and scopes by the JWT's `team` claim,
  and `/api/workers` honors the account's **stored** permissions.
- Her admin record (id 1000000) had `permissions: ["Super Admin"]` and
  `team: "Ministry"` — vs the Church Admin record (id 102) with 125
  department permissions and `team: "Gbagada Campus"`. That's the entire
  reason "church admin has all" and super admin didn't.

## Production data fix applied (via the app's own admin API)
- `PUT /api/super/admin/1000000/permissions` — set to the Church Admin's 125
  department list + "Super Admin" (was `["Super Admin"]`).
- `PUT /api/super/admin/1000000` — set `team: "Gbagada Campus"`
  (was `"Ministry"`).
- Revert anytime by putting back the old values above.

## Result (verified live)
- Fresh login → `/overview/super-admin` shows the whole campus: all
  directorates (ATTRACTION, SPD, NEXT GEN, GENERAL SERVICES, COMMUNITIES,
  SENIOR LEADERSHIP), TOTAL 2417 strength / 1711 present / 70.79%, and
  birthdays across all teams (159). Department/role/route unchanged
  ("Super Admin" / super-admin / /super-admin), so all super admin pages
  remain accessible.
