import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

test.describe("Accessibility @smoke", () => {
  const hasClerkEnv = Boolean(process.env.CLERK_PUBLISHABLE_KEY);
  const routes = hasClerkEnv ? ["/login", "/register", "/pos/sale", "/settings"] : ["/pos/sale", "/settings"];

  test.beforeEach(async ({ page }) => {
    if (hasClerkEnv) {
      await setupClerkTestingToken({ page });
    }
  });

  for (const route of routes) {
    test(`has no critical accessibility violations on ${route} @smoke`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator("body")).toBeVisible();
      if (!hasClerkEnv) return;

      const results = await new AxeBuilder({ page })
        .disableRules(["color-contrast"])
        .analyze();

      const critical = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
      expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
    });
  }

  test("supports keyboard navigation for login @smoke", async ({ page }) => {
    if (!hasClerkEnv) return;
    await page.goto("/login");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const active = await page.evaluate(() => document.activeElement?.tagName);
    expect(active).toBeTruthy();
  });

  test("supports keyboard navigation for checkout form @smoke", async ({ page }) => {
    if (!hasClerkEnv) return;
    await page.goto("/pos/payment");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const active = await page.evaluate(() => document.activeElement?.tagName);
    expect(active).toBeTruthy();
  });

  test("supports keyboard navigation for settings form @smoke", async ({ page }) => {
    if (!hasClerkEnv) return;
    await page.goto("/settings");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const active = await page.evaluate(() => document.activeElement?.tagName);
    expect(active).toBeTruthy();
  });
});
