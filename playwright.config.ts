import { defineConfig } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

// Demo account passwords and the service role key come from .env.local (never printed).
loadEnvConfig(process.cwd());

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 180_000,
  expect: { timeout: 20_000 },
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    // Runs against the live site by default. E2E_BASE_URL=http://localhost:3000 for local.
    baseURL: process.env.E2E_BASE_URL ?? "https://promly-eight.vercel.app",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // E2E_VIDEO=1 records a video of each browser (useful as the stage backup video).
    video: process.env.E2E_VIDEO ? "on" : "off",
  },
});
