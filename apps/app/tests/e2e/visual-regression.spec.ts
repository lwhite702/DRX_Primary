import { test, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

const bypassAuthEnabled =
  process.env.NEXT_PUBLIC_BYPASS_AUTH_FOR_TESTING === "true";
const hasClerkTestingKeys =
  Boolean(process.env.CLERK_SECRET_KEY) &&
  Boolean(
    process.env.CLERK_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );

test.describe("Visual regression", () => {
  test.beforeEach(async ({ page }) => {
    if (bypassAuthEnabled || !hasClerkTestingKeys) {
      return;
    }
    await setupClerkTestingToken({ page });
  });

  const visualTarget = process.env.VISUAL_TARGET ?? "all";
  const pages =
    visualTarget === "public"
      ? [
          { name: "login", url: "/login" },
          { name: "register", url: "/register" },
        ]
      : visualTarget === "protected"
        ? [
            { name: "dashboard", url: "/dashboard" },
            { name: "pos-sale", url: "/pos/sale" },
            { name: "inventory", url: "/inventory" },
            { name: "customers", url: "/customers" },
          ]
        : [
            { name: "login", url: "/login" },
            { name: "register", url: "/register" },
            { name: "dashboard", url: "/dashboard" },
            { name: "pos-sale", url: "/pos/sale" },
            { name: "inventory", url: "/inventory" },
            { name: "customers", url: "/customers" },
          ];

  const viewports = [
    { name: "desktop", width: 1440, height: 1024 },
    { name: "tablet", width: 834, height: 1194 },
    { name: "mobile", width: 390, height: 844 },
  ];

  for (const pageMeta of pages) {
    for (const viewport of viewports) {
      test(`matches baseline: ${pageMeta.name} · ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(pageMeta.url);
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveScreenshot(`${pageMeta.name}-${viewport.name}.png`, {
          fullPage: true,
          maxDiffPixelRatio: 0.02,
        });
      });
    }
  }
});
