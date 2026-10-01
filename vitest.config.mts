import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["node_modules", "e2e", ".next", ".claude"],
    // Integration tests share one disposable PostgreSQL database (see
    // TEST_DATABASE_URL in README.md) and reset its tables between cases, so
    // test files must not run concurrently against it.
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
