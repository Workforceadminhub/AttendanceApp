# Migration: Create React App → Vite

Status: **PLANNED, NOT APPLIED.** Read this and execute carefully on a feature branch.

## Why

`react-scripts` (CRA) is unmaintained since 2023, has slow dev start (~30s) and slow HMR. Vite gives ~10x faster dev start, fast HMR via native ESM, and better tree-shaking.

## Steps

1. **Install:**
   ```sh
   npm i -D vite @vitejs/plugin-react vite-plugin-svgr
   npm un react-scripts
   ```

2. **Move `public/index.html` to project root** and update its script tag:
   ```html
   <!-- before (CRA): %PUBLIC_URL% interpolation -->
   <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
   <!-- after (Vite): -->
   <link rel="icon" href="/favicon.ico" />
   <!-- and add at the end of <body>: -->
   <script type="module" src="/src/index.js"></script>
   ```

3. **Add `vite.config.js` at the project root:**
   ```js
   import { defineConfig } from "vite";
   import react from "@vitejs/plugin-react";

   export default defineConfig({
     plugins: [react()],
     server: { port: 3000, open: true },
     build: { outDir: "build", sourcemap: true },
     resolve: {
       // CRA allowed JSX in .js files; Vite needs an explicit hint
       extensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
     },
     esbuild: { loader: "jsx", include: /src\/.*\.jsx?$/ },
     optimizeDeps: { esbuildOptions: { loader: { ".js": "jsx" } } },
   });
   ```

4. **Replace env var references — CRITICAL.** Vite uses `import.meta.env.VITE_*` instead of `process.env.REACT_APP_*`:

   ```sh
   # Find every reference:
   grep -rn "process.env.REACT_APP_" src/

   # Rewrite each. Example:
   #   process.env.REACT_APP_BASE_URL  →  import.meta.env.VITE_BASE_URL
   ```

   Then rename `.env.local`:
   ```
   REACT_APP_BASE_URL=...   →   VITE_BASE_URL=...
   ```

   Also update `process.env.NODE_ENV` → `import.meta.env.MODE` (string `"development"`/`"production"`/`"test"`).

5. **Update `package.json` scripts:**
   ```json
   "scripts": {
     "start": "vite",
     "build": "vite build",
     "preview": "vite preview",
     "test": "vitest"
   }
   ```

6. **Test runner:** CRA used Jest via `react-scripts test`. Migrate to Vitest:
   ```sh
   npm i -D vitest @testing-library/jest-dom jsdom
   ```
   Add to `vite.config.js`:
   ```js
   test: { environment: "jsdom", setupFiles: ["./src/setupTests.js"] }
   ```

7. **Lazy-load chunk names** — currently using `React.lazy(() => import("..."))` which produces hashed chunk names. Vite/rollup names them automatically; verify the bundle splits look reasonable in `npm run build`.

## Rollback

`git revert` the migration commit and `npm i react-scripts`. Keep this on a separate branch until verified working.

## Verification checklist

- [ ] `npm start` — dev server boots in < 2s, HMR works
- [ ] All pages load without 404s
- [ ] Auth flow works (env var migration didn't break the API base URL)
- [ ] `npm run build` produces a `build/` directory similar in shape to before
- [ ] `npm run analyze` (source-map-explorer) still works against the built bundle
- [ ] Tests pass under Vitest
