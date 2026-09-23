# Lessons — Harvesters Workers System

Captured after user corrections during the Quiet Cockpit redesign. Each entry is a rule for future work, with the trigger that surfaced it.

## Frontend / design

### 1. Address mobile end-to-end up front, not as an afterthought
**Trigger:** User asked "did you account for mobile experiences?" after I glossed over mobile in a one-liner ("hybrid nav, mobile sheet").
**Rule:** When proposing a design pass, list mobile-specific decisions for every category (tables, modals, filters, dense data, touch targets, primary actions, forms) before writing code. Don't ship a plan that says "mobile too" without specifics.

### 2. `bg-cream/90 backdrop-blur` ≠ solid `bg-cream`
**Trigger:** Sticky header rendered visibly different from the page bg even though both used `cream`.
**Rule:** If the goal is for a sticky bar to blend with the page surface, use a solid bg. `backdrop-blur` + `/90` opacity composites differently against any non-uniform underlying content. Reserve backdrop-blur for surfaces over images or non-flat backgrounds.

### 3. JPG logos with baked-in white backgrounds
**Trigger:** Wordmark logo (`public/logo.jpg`) showed a visible white box on cream backgrounds.
**Rule:** For dark wordmarks on light page backgrounds, `mix-blend-mode: multiply` (Tailwind `mix-blend-multiply`) drops the white into the page color while keeping the dark glyphs intact. No asset replacement required. Math: `multiply(white, anyColor) = anyColor`; `multiply(black, anyColor) = black`.

### 4. Logo sizing must account for internal whitespace
**Trigger:** User said "logo looks tiny" after I used `h-7` (28px). The JPG includes whitespace padding around the wordmark, so the visible glyphs were ~50% of the img element height.
**Rule:** When a logo asset includes internal padding/whitespace, the actual visible glyphs are smaller than the `<img>` height. Bump up by 30–50% to compensate, or use a tightly-cropped asset.

### 5. Don't render placeholder characters when data is missing
**Trigger:** I rendered a `?` then later `—` inside the user avatar circle when name data was missing. User flagged both as wrong.
**Rule:** When data is missing, prefer omitting the UI element entirely (conditional render) over showing a placeholder character. A missing avatar circle is cleaner than a circle with `?` or `—` in it.

### 6. Grep for actual field names before assuming object shape
**Trigger:** I assumed the auth user object had `firstName`/`lastName` (camelCase). Real shape was `fullname` (single field) and `firstname`/`lastname` (lowercase) used elsewhere in the codebase.
**Rule:** Before writing code that depends on a domain object's shape, `grep -r "authUser?\." src/` (or equivalent) to find the actual field names used elsewhere. The codebase is the source of truth, not memory.

## React / patterns

### 8. When making a `<tr>` clickable, stop propagation on interactive cells
**Trigger:** User asked for clickable rows on the Workers table.
**Rule:** Add `onClick` + `cursor-pointer` + `hover:bg-*` on the `<tr>`, then add `onClick={(e) => e.stopPropagation()}` to any `<td>` containing checkboxes, action buttons, or links. Otherwise clicking those still triggers row navigation. Also keep a real `<a>`/`<Link>` inside the row for keyboard nav and right-click "open in new tab" — it's an a11y gain.

## Build / tokens

### 9. Self-host fonts under strict CSP
**Trigger:** The CSP in `vercel.json` (mirrored in `public/index.html`) is `font-src 'self' data:`. Google Fonts blocked.
**Rule:** When CSP blocks third-party `font-src`, use `@fontsource/<font>` npm packages and import the CSS in `src/index.jsx`. Fonts ship with the bundle, no CSP changes needed.

## Workflow

### 12. Don't redesign when a token sweep will do
**Trigger:** User asked for "scope: both" (vertical slice + surface polish across everything). 17+ pages would have been a multi-week redesign.
**Rule:** When the design language change is mostly token swaps (color, typography, focus rings), do the mechanical sweep first. Reserve full per-page redesigns for the highest-traffic / first-impression screens. Status pills, card shadows, etc. that *only* affect specific patterns can stay until each page is properly refactored.

### 13. Auth-gated screens need a real session to verify
**Rule:** Most screens sit behind a real auth token the backend validates, so a faked session won't render them. To verify one visually, run `node scripts/prepare-ux-audit-login.mjs` (the user enters the credentials) and load the session at the dev-only `/__ux-audit/<role>` route. If that isn't possible, say the screen was only structurally checked, not visually verified.
