import { defineConfig, devices } from "@playwright/test";

const e2eProfile = process.env.E2E_PROFILE ?? "smoke";
const shard = process.env.PLAYWRIGHT_SHARD;
const currentShard = shard ? { current: Number(shard.split("/")[0]), total: Number(shard.split("/")[1]) } : undefined;
const smokeGrep = e2eProfile === "smoke" ? /@smoke/i : /$^/;
const fullGrep = e2eProfile === "full" ? /@full/i : /$^/;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["junit", { outputFile: "test-results/playwright-junit.xml" }],
    ["list"],
  ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "smoke-desktop",
      grep: smokeGrep,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "smoke-mobile",
      grep: smokeGrep,
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "full-desktop",
      grep: fullGrep,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  shard: currentShard,
  webServer: {
    command: process.env.CI ? "pnpm dev:ci" : "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  globalSetup: require.resolve("./tests/e2e/global.setup.ts"),
});
