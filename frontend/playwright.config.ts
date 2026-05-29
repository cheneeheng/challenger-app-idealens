import { defineConfig, devices } from "@playwright/test";

// E2E config (ITER_07 §05.10). The happy-path spec drives the real app, so both
// the backend (:8000) and the frontend dev server (:3000) must be running, and
// E2E_ANTHROPIC_API_KEY must be set to a valid key for the streaming steps.
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
