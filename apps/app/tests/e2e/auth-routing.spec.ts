import { expect, test } from "@playwright/test";

const bypassAuthEnabled =
  process.env.BYPASS_AUTH_FOR_TESTING === "true";

test.describe("Auth routing regressions", () => {
  test("unauthenticated / redirects to /login with a visible form", async ({ page }) => {
    await page.goto("/");

    if (bypassAuthEnabled) {
      await expect(page).toHaveURL(/\/dashboard(?:\?|$)/, { timeout: 15000 });
      await expect(page.locator("body")).toContainText(/Operator Dashboard/i, { timeout: 15000 });
      return;
    }

    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
    await expect(page.getByPlaceholder("operator@domain.com")).toBeVisible();
    await expect(page.getByRole("button", { name: /^SIGN IN$/ })).toBeVisible();
  });
});
