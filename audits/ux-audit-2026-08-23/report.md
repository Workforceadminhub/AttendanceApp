# Harvesters Workers System UX audit

Date: 24 August 2026  
Production audited: `https://attendance.hiccgbagada.com`  
Improved build re-tested: `http://127.0.0.1:5173`

## Verdict

**Authenticated walkthrough complete with three role sessions.** Public and authenticated flows were interaction-tested and repaired. The deployed Workers Meeting API is still missing, and lab Core Web Vitals were not available in the in-app browser.

The repaired public routes passed the final interaction, console, layout, and targeted accessibility checks described below.

## Persona and scope

Primary persona: a time-pressed ministry leader or administrator, moderately comfortable with web forms, completing registration and meeting check-in on a phone or laptop.

Inventoried the reachable public entry points at 1440×900 and 375×812. The task-bearing interaction pass covered sign-in error recovery, alternate sign-in mode, leadership registration lookup and fallback, Leaders Meeting lookup and fallback, Workers Meeting lookup and fallback, Awakening conditional fields and validation, certificate verification default state, and new-worker registration validation. Token-gated reset/set-password pages and the duplicate Workers confirmation alias were not separately exercised.

The public interaction log plus the authenticated role walkthrough is in `interaction-manifest.json`. The evidence folder contains the original public states plus authenticated desktop/mobile dashboard captures.

## Hard-gate status

| Gate | Result | Evidence |
| --- | --- | --- |
| Console errors/warnings | Pass on final re-tested public flows | Fresh local tab: 0 after new-worker validation, Leaders Meeting empty recovery, and Workers Meeting unavailable recovery |
| Network 5xx | Pass in exercised public flows | No 5xx observed; Workers Meeting instead exposes a deployed 404 endpoint gap |
| Layout collapse / horizontal overflow | Pass | 375 px re-test: no horizontal overflow; form controls and actions remain usable |
| axe Critical / Serious | Pass for redesigned registration | `NewWorker.a11y.test.jsx`: 0 Critical/Serious violations |
| Performance budget | Not measured | Browser runtime did not expose Performance APIs; production build succeeded but the 929.58 kB `exceljs` chunk remains a warning |
| Authenticated product coverage | Pass with follow-up fixes | Church Admin, Super Admin, and HOD sessions; dashboard, workers, filters, summaries, reports, attendance history, validation, and detail routes exercised |

## Findings and outcomes

### F1 — Critical — Meeting confirmation routes crashed before first interaction

- Routes: `/leadersmeeting/confirm`, `/workersmeeting/confirm`
- Reproduction: open either production URL.
- Before: blank/error-boundary state; console `ReferenceError: sessionToken is not defined`.
- Suspected code: `LeadersMeetingConfirm.jsx`, `WorkersMeetingConfirm.jsx` passed an undeclared token even though the meeting service now owns token acquisition.
- Fix: removed the stale prop dependency and re-tested both routes through lookup and recovery states.
- Outcome: fixed; final console count 0.

### F2 — High — Workers Meeting check-in calls a route absent from the deployed API

- Routes: `/workersmeeting/confirm`, `/workers-meeting`
- Reproduction: enter a full name and choose **Find Me**.
- Before: generic “Unable to reach the server” message.
- Root cause evidence: an authenticated request to `/api/meeting/workers/workers/search` returns HTTP 404; the sanitized response is archived in `backend-evidence.md`.
- Fix in client: the failure now says Workers Meeting check-in is temporarily unavailable and directs the person to retry later or speak to their team leader; expected recoverable failures no longer pollute the dev console.
- Outcome: graceful recovery fixed; backend route remains unresolved.

### F3 — High — New-worker registration depended on placeholders and discarded context

- Route: `/new/worker`
- Before: placeholder-only controls, detached asterisks, no section hierarchy, generic “Some fields are missing,” and a visually destructive Cancel action.
- Fix: persistent labels, semantic sections, field-specific messages, error summary, first-invalid focus, preserved entered values, correct Team → Department dependency, real helper text, safer action hierarchy, public header/footer, and single-column mobile layout.
- Outcome: fixed; incomplete submission produces 12 precise inline errors, preserves “Ada,” focuses Last name, and has no horizontal overflow.

### F4 — Medium — Homepage secondary action duplicated Sign in

- Route: `/`
- Before: **Sign in** and **Learn more** both opened login.
- Fix: replaced the ambiguous duplicate with **Register a worker**, linked to `/new/worker`.
- Outcome: fixed and re-tested by click-through.

### F5 — Medium — Meeting date/type configuration was called inconsistently

- Routes: public meeting confirmation/presence and authenticated meeting reports.
- Before: hard-coded dates and incorrect `getMeetingDate()` argument usage made Leaders/Workers pages depend on fallback behavior. The current defaults happen to match, so no visible production divergence was reproduced.
- Fix: every meeting page/report now requests the explicit `leaders` or `workers` configuration and formats the configured date consistently.
- Outcome: fixed in source; public displays re-tested. Authenticated report output remains unverified.

### F6 — Medium — Validation and overlays lacked consistent, accessible feedback

- Verified interaction: the date picker opens with a short dropdown transition, closes on Escape, and returns focus; invalid registration focuses and briefly shakes the first missing field while inline messages fade in.
- Source-reviewed fix: navigation dropdowns and both modal implementations now use the same quick open/close timings; closed dropdowns are inert; modals take initial focus, trap Tab, close on Escape, and restore the trigger. Success screens use a drawn check and all new motion respects reduced-motion preferences.
- Outcome: public date/validation behavior verified; the authenticated Workers filter dialog and summary selects were also opened, changed, and re-tested. Generic modal, tab, and success variants remain source-reviewed plus unit-tested. Existing loading spinners were retained because they already communicate pending state clearly.

### F7 — High — Authenticated worker history could flood the API

- Route: `/worker/:id/attendance`
- Reproduction: open a worker attendance link from an HOD or admin summary.
- Before: the page fanned out one request per Sunday in parallel, producing repeated transient `503 Service Unavailable` responses and noisy console errors.
- Fix: requests now run through a four-at-a-time concurrency limiter; transient 429/502/503/504 responses are treated as recoverable backend conditions rather than console failures.
- Outcome: the HOD worker history loaded all 34 year-to-date records after re-test with no new console errors.

### F8 — Medium — Admin worker table emitted a React key warning

- Route: `/church-admin/workers`
- Reproduction: load the Church Admin directory.
- Before: each worker row was returned as an unkeyed fragment, producing a unique-key warning in the console.
- Fix: the row/detail pair now uses a stable keyed `Fragment`.
- Outcome: fixed and reloaded during the authenticated walkthrough.

### F9 — Medium — Session-expiry hydration could crash the dashboard

- Route: authenticated dashboard during token expiry or initial user hydration.
- Before: `checkAdminStatus` dereferenced a missing department object and could throw before the route guard redirected.
- Fix: the department lookup is now optional and resolves to a non-admin state while the session is absent.
- Outcome: no crash on the re-tested authenticated routes; session handoff remains one-time and local-only.

## Re-test summary

- Homepage **Register a worker** navigates to the redesigned form.
- Both confirmation routes render and no longer reference an undeclared token.
- Leaders lookup settles into a clear no-results state with **Try Again** and **Add yourself as a new worker**.
- Workers lookup settles into a specific service-unavailable recovery message.
- New-worker validation preserves entered data, focuses the first missing field, clears errors as fields are corrected, has no horizontal overflow, and records 0 final console issues.
- Date-of-birth opens as a labelled dialog, closes on Escape, and returns focus to the trigger.
- Church Admin: dashboard → Workers Directory → search, filter dialog, row details, add-worker validation.
- Super Admin: dashboard → Summary filters → Reports date selection/export readiness.
- HOD: dashboard → Workers → detail expansion → Attendance → worker history → summary leaderboard link.
- Authenticated dashboard screenshots captured at desktop and 390×844 mobile sizes.
- `npm run lint` passes; `npx vitest run --testTimeout=15000` passes all 41 tests; `npm run build` passes.

## Remaining work

1. Deploy/implement the Workers Meeting session and worker endpoints on the backend.
2. Run Lighthouse/Web Vitals in CI or a Chrome-capable environment and address the oversized `exceljs` chunk if it affects task routes.
3. Review the four dependency advisories reported by `npm install` (2 moderate, 2 high) separately; no automatic force-fix was applied.
4. Expand the authenticated pass to destructive confirmations, bulk operations, and logout/session-expiry with explicit test-data approval.

## Screenshot index

- Before desktop: `evidence/before/production-new-worker-desktop.png`
- After desktop: `evidence/after/local-new-worker-desktop-final.png`
- Before mobile: `evidence/before/production-new-worker-mobile.png`
- After mobile: `evidence/after/local-new-worker-mobile-final.png`
- Final mobile validation: `evidence/after/local-new-worker-mobile-validation-final.png`
- Authenticated desktop: `evidence/after/authenticated-hod-dashboard-desktop.png`
- Authenticated mobile: `evidence/after/authenticated-hod-dashboard-mobile.png`
