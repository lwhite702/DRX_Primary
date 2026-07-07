import { expect, test } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

const hasBypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH_FOR_TESTING === "true";
const hasClerkTestingEnv =
  Boolean(process.env.CLERK_TESTING_TOKEN) &&
  Boolean(process.env.CLERK_SECRET_KEY) &&
  Boolean(process.env.CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

async function ensureHelpAccess(page: import("@playwright/test").Page) {
  if (hasClerkTestingEnv) {
    await setupClerkTestingToken({ page });
  }

  await page.goto("/help", { waitUntil: "domcontentloaded" });

  const redirectedToLogin = /\/login(?:\?|$)/.test(new URL(page.url()).pathname);
  return {
    hasProtectedAccess: (hasBypassAuth || hasClerkTestingEnv) && !redirectedToLogin,
    redirectedToLogin,
  };
}

test.describe("Help center smoke", () => {
  async function expectRouteShell(page: import("@playwright/test").Page) {
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(
      /Application error|Internal Server Error/i,
    );
  }

  test("hub and task routes load", async ({ page }) => {
    const access = await ensureHelpAccess(page);
    if (!access.hasProtectedAccess) {
      await expect(page).toHaveURL(/\/login(?:\?|$)/);
      await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
      return;
    }

    await expectRouteShell(page);

    await page.goto("/help/start", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/help\/start(?:\?|$)/);
    await expectRouteShell(page);

    await page.goto("/help/sell", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/help\/sell(?:\?|$)/);
    await expectRouteShell(page);

    await page.goto("/help/operations", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/help\/operations(?:\?|$)/);
    await expectRouteShell(page);

    await page.goto("/help/troubleshoot", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/help\/troubleshoot(?:\?|$)/);
    await expectRouteShell(page);
  });

  test("library embed loads and feedback route redirects", async ({ page }) => {
    const access = await ensureHelpAccess(page);
    if (!access.hasProtectedAccess) {
      await expect(page).toHaveURL(/\/login(?:\?|$)/);
      await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
      return;
    }

    await page.goto("/help/library?topic=start", { waitUntil: "domcontentloaded" });
    await expectRouteShell(page);
    await expect(page.getByTestId("featurebase-help-embed")).toBeVisible();

    await page.goto("/feedback?topic=sell", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/help\/library(?:\?|$)/);
    await expect(page).toHaveURL(/topic=sell/);
  });
});
