import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  use: { baseURL: "http://localhost:3000", ...devices["Desktop Chrome"] },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      ACCESS_MODE: "open",
      RATE_LIMIT_DRIVER: "memory",
      AUTH_SECRET:
        process.env.AUTH_SECRET || "playwright-secret-playwright-secret",
    },
  },
  globalSetup: "./e2e/global-setup.ts",
});
