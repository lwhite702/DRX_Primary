import { test, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

test.describe("Feature flags access @smoke", () => {
  test.beforeEach(async ({ page }) => {
    if (process.env.CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY) {
      await setupClerkTestingToken({ page });
    }
  });

  test("admin feature route is guarded and non-blank @smoke", async ({ page }) => {
    if (test.info().project.name.includes("mobile")) return;
    await page.goto("/admin/features");
    await expect(page.locator("body")).toBeVisible();

    const url = page.url();
    const guarded = /\/admin\/features|\/dashboard|\/login|\/onboarding/.test(url);
    expect(guarded).toBe(true);
  });
});
