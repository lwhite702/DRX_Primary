import { expect, test } from "@playwright/test";

const bypassAuthEnabled =
  process.env.NEXT_PUBLIC_BYPASS_AUTH_FOR_TESTING === "true";

test.describe("Auth routing regressions", () => {
  test("unauthenticated / redirects to /login with a visible form", async ({ page }) => {
    await page.goto("/");

    if (bypassAuthEnabled) {
      await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
      await expect(page.locator("body")).toContainText(/Operator Dashboard/i);
      return;
    }

    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
    await expect(page.getByPlaceholder("operator@domain.com")).toBeVisible();
    await expect(page.getByRole("button", { name: /^SIGN IN$/ })).toBeVisible();
  });
});
