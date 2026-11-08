import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    proxy: {
      "/api":
        loadEnv(mode, ".", "BACKEND_").BACKEND_URL || "http://127.0.0.1:8000",
    },
  },
  test: {
    include: ["src/**/*.test.tsx"],
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
  },
}));
