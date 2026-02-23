import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const publicRoutes = ["/login", "/register"];
const protectedRoutes = ["/pos/sale", "/settings"];
const hasClerkTestingKeys =
  Boolean(process.env.CLERK_SECRET_KEY) &&
  Boolean(
    process.env.CLERK_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );

const routes = hasClerkTestingKeys
  ? [...publicRoutes, ...protectedRoutes]
  : publicRoutes;

if (!hasClerkTestingKeys) {
  console.warn(
    "[a11y.spec] Missing Clerk test credentials; skipping protected-route a11y checks",
  );
}

test.describe("Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    if (!hasClerkTestingKeys) {
      return;
    }
    const { setupClerkTestingToken } = await import("@clerk/testing/playwright");
    await setupClerkTestingToken({ page });
  });

  for (const route of routes) {
    test(`has no critical accessibility violations on ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.locator("body")).toBeVisible();

      const results = (await Promise.race([
        new AxeBuilder({ page })
          .disableRules(["color-contrast"])
          .exclude("iframe")
          .analyze(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Timed out running axe on ${route} after 15s`)),
            15_000,
          ),
        ),
      ])) as Awaited<ReturnType<AxeBuilder["analyze"]>>;

      const critical = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
      expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
    });
  }

  test("supports keyboard navigation for login", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const active = await page.evaluate(() => document.activeElement?.tagName);
    expect(active).toBeTruthy();
  });
});
