import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";

const AUDIT_ROLES = new Set(["church-admin", "super-admin", "hod"]);

function oneTimeAuditSessionPlugin() {
  return {
    name: "one-time-local-ux-audit-session",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/_ux-audit/session", async (request, response, next) => {
        if (request.method !== "GET") return next();
        const role = request.url?.split("?")[0].replace(/^\//, "");
        if (!AUDIT_ROLES.has(role)) return next();

        const remoteAddress = request.socket.remoteAddress || "";
        const isLoopback = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(remoteAddress);
        if (!isLoopback) {
          response.statusCode = 403;
          response.end("Local audit sessions are available only on loopback.");
          return;
        }

        const sessionPath = resolve(process.cwd(), ".ux-audit", `${role}.json`);
        try {
          const session = await readFile(sessionPath, "utf8");
          response.statusCode = 200;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.setHeader("Cache-Control", "no-store");
          response.end(session);
          await rm(sessionPath, { force: true });
        } catch (error) {
          if (error?.code === "ENOENT") {
            response.statusCode = 404;
            response.end("One-time audit session not found.");
            return;
          }
          next(error);
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const clientEnv = {
    NODE_ENV: mode,
    REACT_APP_BASE_URL: env.REACT_APP_BASE_URL ?? env.VITE_BASE_URL ?? "",
    REACT_APP_DATE: env.REACT_APP_DATE ?? env.VITE_DATE ?? "",
    REACT_APP_FRONTEND_URL: env.REACT_APP_FRONTEND_URL ?? env.VITE_FRONTEND_URL ?? "",
  };

  return {
    plugins: [react(), tailwindcss(), oneTimeAuditSessionPlugin()],
    define: Object.fromEntries(
      Object.entries(clientEnv).map(([key, value]) => [
        `process.env.${key}`,
        JSON.stringify(value),
      ])
    ),
    build: {
      outDir: "build",
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/setupTests.js",
    },
  };
});
