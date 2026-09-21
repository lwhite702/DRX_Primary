import { defineConfig } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_MARKETING_PORT || 3200);

export default defineConfig({
  testDir: "./tests/e2e",
  forbidOnly: Boolean(process.env.CI),
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",
  use: { baseURL: `http://127.0.0.1:${port}`, colorScheme: "dark" },
  webServer: {
    command:
      `pnpm exec next build --webpack && pnpm exec next start --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: process.env.PW_REUSE_EXISTING_SERVER === "1",
    timeout: 180_000,
  },
});
