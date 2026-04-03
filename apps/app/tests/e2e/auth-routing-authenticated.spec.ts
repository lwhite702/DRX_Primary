import { expect, test } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

const requireAuthSuite = process.env.E2E_REQUIRE_AUTH === "1";
const hasClerkTestingEnv =
  Boolean(process.env.CLERK_TESTING_TOKEN) &&
  Boolean(process.env.CLERK_SECRET_KEY) &&
  Boolean(
    process.env.CLERK_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );

if (requireAuthSuite && !hasClerkTestingEnv) {
  throw new Error(
    "E2E auth suite requires Clerk testing credentials (CLERK_TESTING_TOKEN, CLERK_SECRET_KEY, CLERK_PUBLISHABLE_KEY)",
  );
}

if (requireAuthSuite && hasClerkTestingEnv) {
  test.describe("Auth routing (authenticated)", () => {
    test("authenticated / lands on /dashboard without a redirect loop", async ({ page }) => {
      await setupClerkTestingToken({ page });
      await page.goto("/");

      await expect(page).toHaveURL(/\/dashboard(?:\?|$)/, { timeout: 15_000 });
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
    });
  });
}
