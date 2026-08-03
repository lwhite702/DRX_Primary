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
const visualFixturesEnabled = process.env.VISUAL_FIXTURES === "true";

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
          { name: "login", url: "/login", heading: "Sign In" },
          { name: "register", url: "/register", heading: "Initialize Session" },
        ]
      : visualTarget === "protected"
        ? [
            { name: "dashboard", url: visualFixturesEnabled ? "/visual-fixtures/dashboard" : "/dashboard", heading: "Operator dashboard" },
            { name: "pos-sale", url: visualFixturesEnabled ? "/visual-fixtures/pos-sale" : "/pos/sale", heading: "Quick sale" },
            { name: "inventory", url: visualFixturesEnabled ? "/visual-fixtures/inventory" : "/inventory", heading: "Inventory" },
            { name: "customers", url: visualFixturesEnabled ? "/visual-fixtures/customers" : "/customers", heading: "Customers" },
          ]
        : [
            { name: "login", url: "/login", heading: "Sign In" },
            { name: "register", url: "/register", heading: "Initialize Session" },
            { name: "dashboard", url: visualFixturesEnabled ? "/visual-fixtures/dashboard" : "/dashboard", heading: "Operator dashboard" },
            { name: "pos-sale", url: visualFixturesEnabled ? "/visual-fixtures/pos-sale" : "/pos/sale", heading: "Quick sale" },
            { name: "inventory", url: visualFixturesEnabled ? "/visual-fixtures/inventory" : "/inventory", heading: "Inventory" },
            { name: "customers", url: visualFixturesEnabled ? "/visual-fixtures/customers" : "/customers", heading: "Customers" },
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
        const heading = page.getByRole("heading", {
          name: pageMeta.heading,
          exact: true,
        });

        for (let attempt = 0; attempt < 3; attempt += 1) {
          await page.goto(pageMeta.url, { waitUntil: "domcontentloaded" });
          expect(new URL(page.url()).pathname).toBe(pageMeta.url);
          try {
            await expect(heading).toBeVisible({ timeout: 7000 });
            break;
          } catch (error) {
            if (attempt === 2) {
              throw error;
            }
          }
        }
        // Next's development portal is not product UI. Remove the shadow-root
        // host before capture so dev controls never become part of a baseline.
        await page.evaluate(() => {
          document.querySelectorAll("nextjs-portal").forEach((portal) => portal.remove());
        });
        await page.addStyleTag({
          content: `
            *, *::before, *::after {
              animation: none !important;
              transition: none !important;
            }
          `,
        });
        await expect(page).toHaveScreenshot(`${pageMeta.name}-${viewport.name}.png`, {
          fullPage: false,
          animations: "allow",
          maxDiffPixelRatio: 0.02,
        });
      });
    }
  }
});
