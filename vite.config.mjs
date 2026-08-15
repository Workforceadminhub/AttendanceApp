import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const clientEnv = {
    NODE_ENV: mode,
    REACT_APP_BASE_URL: env.REACT_APP_BASE_URL ?? env.VITE_BASE_URL ?? "",
    REACT_APP_DATE: env.REACT_APP_DATE ?? env.VITE_DATE ?? "",
    REACT_APP_FRONTEND_URL: env.REACT_APP_FRONTEND_URL ?? env.VITE_FRONTEND_URL ?? "",
  };

  return {
    plugins: [react(), tailwindcss()],
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
