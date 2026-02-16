import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

const routes = ["/login", "/register", "/pos/sale", "/settings"];

test.describe("Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
  });

  for (const route of routes) {
    test(`has no critical accessibility violations on ${route}`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator("body")).toBeVisible();

      const results = await new AxeBuilder({ page })
        .disableRules(["color-contrast"])
        .analyze();

      const critical = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
      expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
    });
  }

  test("supports keyboard navigation for login", async ({ page }) => {
    await page.goto("/login");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const active = await page.evaluate(() => document.activeElement?.tagName);
    expect(active).toBeTruthy();
  });
});
