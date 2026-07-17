import { defineConfig, devices } from "@playwright/test";

const appPort = Number(process.env.PLAYWRIGHT_APP_PORT || 3000);
const appBaseUrl = `http://localhost:${appPort}`;
const useWebpackDevServer = process.env.PW_NEXT_WEBPACK === "1";
const skipGlobalSetup = process.env.PW_SKIP_GLOBAL_SETUP === "1";
const reuseExistingServer = process.env.PW_REUSE_EXISTING_SERVER === "1";
const betaE2EEnabled = ["1", "true", "yes"].includes(
  String(process.env.BETA_E2E_ENABLED || "").toLowerCase(),
);
const betaE2ERequired = process.env.BETA_E2E_REQUIRED === "1";

if (betaE2ERequired && !betaE2EEnabled) {
  throw new Error(
    "Real beta E2E was requested but is disabled. Set BETA_E2E_ENABLED=true and provide the documented Clerk, Supabase, and PII credentials.",
  );
}

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  testIgnore: betaE2EEnabled ? [] : ["**/beta-real-workflow.spec.ts"],
  snapshotPathTemplate:
    "{testDir}/{testFilePath}-snapshots/{arg}-{projectName}{ext}",
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
    baseURL: appBaseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: useWebpackDevServer
      ? `pnpm exec next dev --webpack --port ${appPort}`
      : `pnpm exec next dev --port ${appPort}`,
    url: appBaseUrl,
    // Avoid silently targeting an unrelated local app on the same port.
    // Reuse only when explicitly requested.
    reuseExistingServer,
    timeout: 600 * 1000,
  },
  ...(skipGlobalSetup
    ? {}
    : { globalSetup: require.resolve("./tests/e2e/global.setup.ts") }),
});
