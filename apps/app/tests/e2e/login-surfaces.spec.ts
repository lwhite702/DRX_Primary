import { expect, test } from "@playwright/test";

const bypassAuthEnabled =
  process.env.NEXT_PUBLIC_BYPASS_AUTH_FOR_TESTING === "true";

test.describe("Login and register surfaces", () => {
  test("/login is accessible", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login(?:\?|$)/);

    if (bypassAuthEnabled) {
      await expect(page.locator("body")).toContainText(/Auth Bypass Enabled/i);
      return;
    }

    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });

  test("/register is accessible", async ({ page }) => {
    await page.goto("/register");
    await expect(page).toHaveURL(/\/register(?:\?|$)/);

    if (bypassAuthEnabled) {
      await expect(page.locator("body")).toContainText(/Auth Bypass Enabled/i);
      return;
    }

    await expect(page.getByRole("heading", { name: /initialize session/i })).toBeVisible();
  });
});
