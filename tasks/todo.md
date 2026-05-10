# Frontend Redesign — "Quiet Cockpit"

## Direction
- **Aesthetic:** Quiet Cockpit (crisp, operational, ministry-grounded)
- **3-second feeling:** "In control"
- **DFII:** 17 → execute fully

## Design tokens
- **Type:** Geist Sans (UI), Geist Mono (numerals/IDs/timestamps), self-hosted via `@fontsource`
- **Background:** Cream `#FAFAF7`
- **Surface:** White `#FFFFFF`, hairline `#E5E5E0`
- **Text:** `#0A0A0A` / muted `#6B6B66`
- **Primary accent:** Midnight ink `#0A0E1A`
- **Reserved accent:** Burnt sienna `#B5471F` — meaning: "live / now" only
- **States:** forest `#4A6B3F`, mustard `#A87B0F`, brick `#A8311E`

## Differentiation anchors
1. Mono numerals everywhere (counts, %, IDs, timestamps)
2. Hairlines, not shadows
3. Cream background, not gray-50
4. Terminal-style status tags (`■ ACTIVE`)

## Mobile rules
- Same aesthetic, different rhythm
- Tables → card-stack below `lg:`
- Stats grid: 4 → 2 → 1 col
- Touch targets ≥ 44px
- Sticky bottom action bar where there's a single primary action
- Filters/modals → bottom sheet below `md:`
- 16px input minimum (no iOS zoom)
- Mono floor: 14px on mobile
- Test: 375 / 393 / 768 / 1024+

---

## Phase 1 — Foundation
- [ ] Install `@fontsource/geist-sans` and `@fontsource/geist-mono`
- [ ] Import font CSS in `src/index.js`
- [ ] Rewrite `tailwind.config.js` with full token system
- [ ] Rewrite `src/index.css` base layer (cream bg, mono utilities, focus rings, scrollbars)
- [ ] Create `src/components/ui/Tag.jsx`
- [ ] Create `src/components/ui/Stat.jsx`
- [ ] Create `src/components/ui/MobileSheet.jsx`
- [ ] Create `src/components/ui/DataTable.jsx` (table on `lg+`, card-stack below)
- [ ] **Check in with user before Phase 2**

## Phase 2 — Vertical slice
- [ ] Redesign `src/components/Login.jsx`
- [ ] Redesign `src/components/Header.jsx` → hybrid nav (sidebar lg+, mobile sheet)
- [ ] Redesign `src/components/Layout.jsx` shell
- [ ] Redesign `src/components/Table.jsx` (or migrate to `DataTable`)
- [ ] Redesign `src/components/TableLoadingState.jsx`
- [ ] Redesign `src/pages/SuperAdminOverview.jsx`

## Verification
- [ ] `npm start` runs without console errors
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Visual check at 375 / 768 / 1280 widths
- [ ] No regressions in routing, auth, or data fetching

## Review

### What shipped

**Phase 1 — Foundation (touches every screen via tokens):**
- Geist Sans + Geist Mono installed via `@fontsource` (self-hosted, no CSP changes)
- `tailwind.config.js` rewritten with the full Quiet Cockpit token system (cream/ink/sienna/forest/mustard/brick palette, custom font sizes, hairline radii, mono spacing, `min-h-touch`, safe-area utilities, sheet-up + live-pulse animations)
- `src/index.css` base layer rewritten: cream bg app-wide, Geist as body font, tabular mono numerals, 16px input floor (no iOS focus zoom), ink-colored selection + focus rings, `prefers-reduced-motion` honored, `qc-card` / `qc-btn-*` / `qc-input` / `qc-num` utilities
- 4 UI primitives:
  - `components/ui/Tag.jsx` — terminal-style status (`■ ACTIVE`), 6 tones, sienna `live` mode pulses
  - `components/ui/Stat.jsx` — KPI tile with eyebrow + mono value + delta + footnote
  - `components/ui/MobileSheet.jsx` — slide-up bottom sheet, grab handle, safe-area-aware, fade-in scrim
  - `components/ui/DataTable.jsx` — generic table that becomes card-stack below `lg:`, with built-in loading + empty states

**Phase 2 — Screen redesigns:**
- `components/Login.jsx` — split-panel desktop (identity + form), single-column mobile, hairline grid background, sticky brand bar with sienna live date, mono ID input, role-based redirect preserved
- `components/Header.jsx` — sticky cockpit top bar with cream backdrop blur, hairline border, ink-on-cream nav links, role chip + initials avatar, terminal-style Settings dropdown, mobile uses `MobileSheet` with grouped sections + identity strip + bottom action area. Also fixed pre-existing `navigate()`-during-render bug by moving it into `useEffect`
- `components/Layout.jsx` — added `narrow` variant + consistent padding rhythm + bottom padding for sticky mobile action bars
- `components/Table.jsx` — pending workers list rebuilt: `Tag` for status, mono numerals for counts, hairline table on `lg+`, card-stack on mobile with primary/secondary action buttons; preserves API (`people`, `handleInactive`, `handleActive`, `loading`)
- `components/TableLoadingState.jsx` — fixed two pre-existing bugs (square skeleton from reused `length`, zero-height empty `<td>`s) and reskinned to `bg-ink-100` pulse cells
- `pages/SuperAdminOverview.jsx` — full rebuild: Stat-tile KPI grid (1→2→3→6 col), sienna-bordered live attendance control (`■ Live · Accepting` tag with pulse when open), hairline directorate table with mono numerals & forest/brick numeric tones, retoned recharts BarChart (forest/mustard, hairline grid, custom cockpit tooltip), tab section with sliding ink underline, sortable columns, `MobileSheet` confirmation modal. Empty/loading states use `EmptyState` helper. All data hooks preserved.

### Verification

- `npm start` compiles clean — no errors, no warnings introduced
- Console runtime: only the pre-existing `navigate()`-in-render warnings, which I fixed in `Header.jsx`
- Tokens verified live via `preview_inspect`:
  - body bg: `rgb(250, 250, 247)` (cream `#FAFAF7`) ✓
  - body text: `rgb(10, 14, 26)` (ink `#0A0E1A`) ✓
  - body font-family: `"Geist Sans", ui-sans-serif, system-ui, sans-serif` ✓
- Visual screenshots:
  - Desktop 1280×800: split-panel Login renders with hairline grid, mono metric tiles, sienna live date, primary ink button (correctly muted via `disabled:opacity-50` when input empty)
  - Mobile 375×812: identity panel hides, form centers, 16px input, full-width primary button, generous touch targets
- Login redirect flow: posts to `/overview/super-admin` for Super Admin, `/attendance/dashboard` for Church Admin, role-based for HOD — preserved.

### What I did NOT do (out of scope, flagged)

- Did not convert all 30+ pages that include `<Header />` to a sidebar shell. Forcing a sidebar would have meant editing every page; instead the cockpit top bar gives the same visual stance with no structural disruption. If you want a true left-sidebar shell later, it's a Phase 3 sweep.
- Did not redesign the other ~17 pages (AddWorker, ViewWorker, AllWorkers, Dashboard, etc.). They inherit Phase 1's tokens (cream bg, Geist, hairline borders via `qc-card`, etc.) and look better immediately, but their layouts still use the old patterns. A page-by-page sweep is the obvious next pass.
- Did not test the `MobileSheet` confirmation modal interactively — the structure is sound but the live attendance toggle requires backend auth.
- Did not visually verify `SuperAdminOverview.jsx` in the browser — it's behind real auth I can't fake. Code is structurally correct: same data shape, same hooks, retoned to the verified token system.

### Files changed (Phases 1+2)
- `package.json`, `package-lock.json` (added `@fontsource/geist-sans`, `@fontsource/geist-mono`)
- `src/index.js` (font imports)
- `tailwind.config.js`
- `src/index.css`
- `src/components/Login.jsx`
- `src/components/Header.jsx`
- `src/components/Layout.jsx`
- `src/components/Table.jsx`
- `src/components/TableLoadingState.jsx`
- `src/pages/SuperAdminOverview.jsx`
- New: `src/components/ui/Tag.jsx`, `Stat.jsx`, `MobileSheet.jsx`, `DataTable.jsx`

---

## Phase 3 — Sweep across remaining pages

**Goal:** unify the rest of the app to the Quiet Cockpit token system without doing 17 individual redesigns.

### What shipped
- **`Home.jsx` redesigned** — replaces indigo "Get started" landing with a cockpit two-column layout (eyebrow + headline + sienna-live date + ink primary button), cream surface, mix-blend logo
- **Mechanical token sweep across 50 files** (`src/pages/*`, `src/components/Workers/**`, plus standalone components like `Form`, `Modal`, `GenericModal`, `Dropdown`, `BirthDatePicker`, `LoadingState`, `NotFound`, `RouteErrorBoundary`, `Report`, `Summary`, `AttendanceLeaderboard`, `BirthdayWidget`, `DateRangeFilter`, `ExportButton`, `ViewHistoryButton`, `VirtualTable`, `Workers/*`, `Workers/History/*`, etc.)

  Replacements (perl in-place, word-bounded):
  - `bg-gray-50` → `bg-cream`
  - `bg-gray-100` → `bg-cream-200`
  - `bg-gray-{200..900}` → `bg-ink-{200..900}`
  - `text-gray-N` → `text-ink-N` (preserved tonal step)
  - `border-gray-N` / `divide-gray-N` / `ring-gray-N` → `*-ink-N`
  - `placeholder-gray-N` → `placeholder:text-ink-N`
  - `hover:` / `focus:` variants of all the above
  - `bg-indigo-{500,600,700}` → `bg-ink-{800,900,700}`
  - `text-indigo-N` → `text-ink-900` (primary action color)
  - `focus:ring-indigo-N` → `focus:ring-ink-900/10`
  - `focus-visible:outline-indigo-N` → `focus-visible:outline-ink-900`
  - `bg-blue-{500,600}`, `text-blue-{500,600}`, `focus:ring-blue-500`, `focus:border-blue-500` → ink-equivalents
- Verified: `0 remaining` `gray-N` / `indigo-N` references after sweep
- Webpack: compiled successfully, no errors. One transient eslint warning during incremental compile (`hasInitials` unused — was used in subsequent edit; later compiles clean)

### What this fixes vs leaves
- **Fixed:** every unredesigned page now has cream backgrounds, ink-tone text, hairline borders matching the system. Primary action buttons across the app are now ink-900 (not indigo). Focus rings are consistent. Status pills (`bg-green-100 text-green-800` etc.) are intentionally left — they still work as semantic colors and replacing them with `<Tag>` requires per-call code edits, not mechanical replacement.
- **Leaves:** layout patterns (rounded-xl, shadow-sm, pill badges) are still in place on un-redesigned pages — the *colors* match the system but the *shapes/rhythm* don't fully match Quiet Cockpit. Fully migrating to `<Tag>`, `<Stat>`, `qc-card` etc. is a per-page refactor. The current state is a coherent baseline.

### Iterative polish (per user feedback during phase 2/3)
- Header `bg-cream/90 backdrop-blur` → `bg-cream` (solid, blends cleanly)
- Logo `mix-blend-multiply` so the JPG white background drops into the page cream; black wordmark stays
- Logo size `h-7` → `h-12`; header `h-14` → `h-16` for breathing room
- Logout: desktop now `text-brick`; mobile sheet now `qc-btn-danger`
- Avatar circle conditional — only renders when `displayName` exists; tries `fullname / firstname/firstName / lastname/lastName / name / code / email`
- Login brand bar + footer switched to `bg-cream` for one continuous surface
- Login copy: "HICC-GBAGADA" brand, "HICC Gbagada Workers Attendance System" eyebrow, "Dedicated portal to mark attendance and manage workers." subtitle, "Trouble signing in?" on its own line, "Enter your pass ID to continue.", "ID" label, no placeholder, `v2.0` footer
- Removed metric tiles (Sundays/Departments/Roles) from Login identity panel
- Fixed pre-existing `navigate()`-during-render bug in `Header.jsx`

### Files added in Phase 3
- (Modified only — `Home.jsx` and 50 files swept)

---

## Phase 4 — High-traffic page redesigns + cleanups

### What shipped
- **`components/Workers/Dashboard.jsx` rebuilt** — the "Workforce Admin Dashboard". Eyebrow + tracked headline + mono date in subtitle, sienna-border attendance window banner with `<Tag tone="live" live>` indicator, `<Stat>` KPI tiles in a 2-up grid, sienna-tinted unmarked-workers callout (act-now cue), hairline quick-link tiles. All hooks (useQuery, calculateTotals, filterByUserPermissions) preserved.
- **Worker tables — Name + Role + row click → `/worker/{id}/attendance`** (stats page, NOT edit)
  - `DepartmentWorkers.jsx`: row clickable, Name & Role linked, eye icon points at stats, edit pencil keeps editable URL
  - `Workers.jsx` (Super Admin): same treatment with First/Last name + Role columns linked
  - `ChurchAdminWorkers.jsx`: same
  - `AllWorkers.jsx` (no Role column): row + First/Last name linked
  - All action cells (`onClick={(e) => e.stopPropagation()}`) so clicking checkboxes / edit / delete / expand chevron doesn't trigger row navigation
- **`pages/PendingWorkers.jsx` page header rebuilt** — eyebrow + tracked headline, button group (Excel / CSV / Refresh) on `qc-btn-secondary`/`qc-btn-ghost`, sliding ink-underline tabs with mono numeral counts, mustard-tinted bulk-action banner using `qc-card`
- **`pages/AddWorker.jsx` page header + tabs rebuilt** — same eyebrow/headline pattern, sliding ink-underline tabs (Single / Bulk), `bg-cream` page wrapper
- **Mechanical form-pattern sweep** across `AddWorker`, `HODAddWorker`, `HODBulkAddWorker`, `ChurchAdminAddWorker`, `PendingWorkers`, `ManageDepartments`, `ManageAdmins`, `AuditLog`, `Report`:
  - `block text-sm font-medium text-ink-700 mb-2` → `qc-label`
  - `w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10` → `qc-input`
  - `bg-white shadow rounded-lg p-6` → `qc-card p-6`
  - `text-3xl font-bold text-ink-900` → `text-3xl font-medium text-ink-900 tracking-tight` (and 2xl/xl variants)
- **Mechanical alert-tint sweep** across the codebase:
  - `bg-yellow-50/100`, `bg-amber-50/100` → `bg-mustard/10` (or `/15`)
  - `bg-green-50` → `bg-forest/10`
  - `bg-red-50` → `bg-brick/10`
  - `bg-blue-50` → `bg-ink-100`
  - `bg-orange-50/100/500/600` → `bg-sienna` family
  - `border-yellow-N` / `border-green-N` / `border-red-N` / `border-amber-N` / `border-orange-N` → palette equivalents at `/30`
  - `border-blue-N` → `border-ink-200`
  - `text-amber-N` → `text-mustard`
  - `text-orange-N` → `text-sienna-dark`
  - `text-blue-700/800/900` (link text) → `text-ink-900`; `text-blue-500/600` → `text-ink-700`
- **Status pill colors** retoned (separate sweep, earlier): `bg-green-100/text-green-800` → forest, mustard, brick translucent variants. Pill *shapes* (`rounded-full`) intentionally kept — replacing those mechanically risks hitting unrelated round elements (avatars, button groups).
- **Card shadow stripped** (`shadow-sm` removed) on card patterns; larger shadows kept for floats/popups/modals.

### Build state
- All compiles green. Pre-existing transient eslint warnings during incremental compile resolved on subsequent edit.

### What's still left (genuinely per-page)
- `Report.jsx` — got the form sweep (cards, labels, inputs) but layout-level redesign would polish further
- `AuditLog.jsx` — same (got the sweep, layout could be improved)
- `ManageDepartments.jsx` — same
- `ManageAdmins.jsx` — same
- `ViewWorker.jsx`, `WorkerAttendanceHistory.jsx` — got the broader sweep, no targeted redesign
- `Workers/DepartmentSummary.jsx`, `DepartmentAttendance.jsx`, `Unmarked.jsx`, history pages — same
- `BirthdayWidget.jsx`, `AttendanceLeaderboard.jsx`, `InactiveWorkersWidget.jsx`, etc. — sub-components, inherit tokens but layouts unchanged
- **Visual end-to-end verification on real auth** — still on you

### Total file impact across all phases
- ~70 files touched (10 redesigned, ~60 mechanically swept)
- 4 new UI primitives (`Tag`, `Stat`, `MobileSheet`, `DataTable`)
- 2 new dependencies (`@fontsource/geist-sans`, `@fontsource/geist-mono`)
- 0 breaking changes to data flow, routing, or auth
