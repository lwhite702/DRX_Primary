import { test, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

// @target:apps/app/app/login/[[...rest]]/page.tsx
// @target:apps/app/app/register/[[...rest]]/page.tsx

const bypassAuthEnabled =
  process.env.BYPASS_AUTH_FOR_TESTING === "true";
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
          { name: "login", url: "/login", heading: "Sign in" },
          { name: "register", url: "/register", heading: "Create account" },
          { name: "waitlist", url: "/waitlist", heading: "Join the beta" },
        ]
      : visualTarget === "protected"
        ? [
            { name: "dashboard", url: visualFixturesEnabled ? "/visual-fixtures/dashboard" : "/dashboard", heading: "Operator dashboard" },
            { name: "pos-sale", url: visualFixturesEnabled ? "/visual-fixtures/pos-sale" : "/pos/sale", heading: "Quick sale" },
            { name: "inventory", url: visualFixturesEnabled ? "/visual-fixtures/inventory" : "/inventory", heading: "Inventory" },
            { name: "customers", url: visualFixturesEnabled ? "/visual-fixtures/customers" : "/customers", heading: "Customers" },
          ]
        : [
            { name: "login", url: "/login", heading: "Sign in" },
            { name: "register", url: "/register", heading: "Create account" },
            { name: "waitlist", url: "/waitlist", heading: "Join the beta" },
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
          return Promise.all(
            Array.from(document.images).map((image) =>
              image.complete ? image.decode().catch(() => undefined) : new Promise<void>((resolve) => {
                image.addEventListener("load", () => resolve(), { once: true });
                image.addEventListener("error", () => resolve(), { once: true });
              }),
            ),
          );
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
          // Chromium's Linux and macOS text rasterizers differ slightly even
          // after web fonts settle. Keep the allowance narrow enough to catch
          // layout regressions while avoiding platform-only glyph noise.
          maxDiffPixelRatio: 0.025,
        });
      });
    }
  }
});
