import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env.local") });
dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

process.env.NEXT_PUBLIC_SUPABASE_URL ??= process.env.SUPABASE_URL;

const appPort = Number(process.env.PLAYWRIGHT_APP_PORT || 3000);
const appBaseUrl = `http://localhost:${appPort}`;
const useWebpackDevServer = process.env.PW_NEXT_WEBPACK === "1";
const skipGlobalSetup = process.env.PW_SKIP_GLOBAL_SETUP === "1";
const reuseExistingServer = process.env.PW_REUSE_EXISTING_SERVER === "1";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
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
