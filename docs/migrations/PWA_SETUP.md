# PWA / Service Worker setup

Status: **PLANNED, NOT APPLIED.** Decisions needed below before implementation.

## Why

Make the app installable on mobile, offline-friendly for read-only screens, and faster on repeat loads via cache-first strategy on static assets.

## Decisions before you start

1. **Caching strategy for the API:** which endpoints (if any) should the SW cache?
   - `GET /api/departments` — yes, cache 24h. Backed by our localStorage cache anyway.
   - `GET /api/super/admin/workers` — probably no, data changes frequently, but maybe stale-while-revalidate is OK.
   - `POST/PUT/DELETE` — never cache.
2. **Offline scope:** what should work offline?
   - Login screen? (probably no — users need fresh auth)
   - Read-only worker lists for the user's own dept? (yes — most useful)
   - Adding/editing? (no — too risky to queue mutations offline)
3. **Update strategy:** when a new version ships, do you force a reload, prompt the user, or silently update on next visit?

## Recommended steps once decisions are made

CRA has built-in PWA scaffolding via Workbox:

1. Generate the SW from CRA's template by editing `src/index.js`:
   ```js
   import * as serviceWorkerRegistration from "./serviceWorkerRegistration";
   serviceWorkerRegistration.register();
   ```

2. Use [Workbox runtime caching](https://developer.chrome.com/docs/workbox/runtime-caching-strategies) for the API endpoints you decided to cache.

3. Add `public/manifest.json` with name, icons, theme color, etc. (CRA already has a stub.)

4. Add a small "update available — reload" banner (use `serviceWorkerRegistration.onUpdate`).

5. **Audit with Lighthouse PWA category** — should hit > 90.

## Vite + PWA

If you've migrated to Vite, use `vite-plugin-pwa` (Workbox under the hood):
```sh
npm i -D vite-plugin-pwa
```
Configure in `vite.config.js`. See https://vite-pwa-org.netlify.app/.
