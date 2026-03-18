import { expect, test } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

const hasBypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH_FOR_TESTING === "true";
const hasClerkTestingEnv =
  Boolean(process.env.CLERK_TESTING_TOKEN) &&
  Boolean(process.env.CLERK_SECRET_KEY) &&
  Boolean(process.env.CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

async function ensureHelpAccess(page: import("@playwright/test").Page) {
  if (!hasBypassAuth && !hasClerkTestingEnv) {
    test.skip(
      true,
      "Protected help routes require bypass auth mode or Clerk testing credentials.",
    );
  }

  if (hasClerkTestingEnv) {
    await setupClerkTestingToken({ page });
  }

  await page.goto("/help", { waitUntil: "domcontentloaded" });

  if (/\/login(?:\?|$)/.test(new URL(page.url()).pathname)) {
    test.skip(
      true,
      "Authenticated help-route test session was not established in this environment.",
    );
  }
}

test.describe("Help center smoke", () => {
  test("hub and task routes load", async ({ page }) => {
    await ensureHelpAccess(page);

    await expect(page.getByText("Support Center", { exact: true })).toBeVisible();

    await page.goto("/help/start", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/help\/start(?:\?|$)/);
    await expect(page.getByText("Startup Checklist", { exact: true })).toBeVisible();

    await page.goto("/help/sell", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/help\/sell(?:\?|$)/);
    await expect(page.getByText("Checkout Flow", { exact: true })).toBeVisible();

    await page.goto("/help/operations", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/help\/operations(?:\?|$)/);
    await expect(page.getByText("Operations Checklist", { exact: true })).toBeVisible();

    await page.goto("/help/troubleshoot", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/help\/troubleshoot(?:\?|$)/);
    await expect(page.getByText("Common Incidents", { exact: true })).toBeVisible();
  });

  test("library embed loads and feedback route redirects", async ({ page }) => {
    await ensureHelpAccess(page);

    await page.goto("/help/library?topic=start", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Knowledge Library", { exact: true })).toBeVisible();
    await expect(page.getByTestId("featurebase-help-embed")).toBeVisible();

    await page.goto("/feedback?topic=sell", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/help\/library(?:\?|$)/);
    await expect(page).toHaveURL(/topic=sell/);
  });
});
