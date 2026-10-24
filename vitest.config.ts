import path from "node:path";
import { config } from "dotenv";
import { defineConfig } from "vitest/config";

config({ path: ".env.local", quiet: true });

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    // Os testes de integração compartilham um banco: rodam em série.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    globalSetup: ["tests/global-setup.ts"],
    env: {
      APP_ENV: "test",
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgres://arrumae:arrumae_dev@localhost:5432/arrumae_test",
      APP_SECRET: "test-secret-0123456789abcdef0123456789abcdef",
      STORAGE_LOCAL_DIR: path.resolve(import.meta.dirname, ".test-storage"),
      EMAIL_DRIVER: "console",
      PAYMENT_PROVIDER: "offline",
    },
  },
});
