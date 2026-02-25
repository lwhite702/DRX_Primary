import { expect, test } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

const hasClerkTestingEnv =
  Boolean(process.env.CLERK_TESTING_TOKEN) &&
  Boolean(process.env.CLERK_SECRET_KEY) &&
  Boolean(process.env.CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

test.describe("Auth routing regressions", () => {
  test("unauthenticated / redirects to /login with a visible form", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
    await expect(page.getByPlaceholder("operator@domain.com")).toBeVisible();
    await expect(page.getByRole("button", { name: /^SIGN IN$/ })).toBeVisible();
  });

  test("authenticated / lands on /dashboard without a redirect loop", async ({ page }) => {
    test.skip(!hasClerkTestingEnv, "Clerk testing credentials are required for authenticated route tests.");

    await setupClerkTestingToken({ page });
    await page.goto("/");

    if (!process.env.CI && /\/login(?:\?|$)/.test(new URL(page.url()).pathname)) {
      test.skip(
        true,
        "Local Clerk testing token did not establish an authenticated session (check localhost allowlist / Clerk test token setup).",
      );
    }

    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/, { timeout: 15_000 });

    // The URL should remain stable after initial auth redirects settle.
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
  });
});
