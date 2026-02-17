import { test, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

test.describe("Visual regression @full", () => {
  test.beforeEach(async ({ page }) => {
    if (process.env.CLERK_PUBLISHABLE_KEY) {
      await setupClerkTestingToken({ page });
    }
  });

  const pages = [
    { name: "login", url: "/login" },
    { name: "dashboard", url: "/dashboard" },
    { name: "pos-sale", url: "/pos/sale" },
    { name: "customers", url: "/customers" },
  ];

  for (const pageMeta of pages) {
    test(`matches baseline: ${pageMeta.name} @full`, async ({ page }) => {
      await page.goto(pageMeta.url);
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveScreenshot(`${pageMeta.name}.png`, {
        fullPage: true,
        timeout: 20_000,
        maxDiffPixelRatio: 0.02,
      });
    });
  }
});
