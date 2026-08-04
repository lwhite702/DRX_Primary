import { expect, test } from "@playwright/test";

test.describe("Auth routing regressions", () => {
  test("/ resolves to a valid configured entry surface", async ({ page }) => {
    await page.goto("/");

    const pathname = new URL(page.url()).pathname;

    if (pathname === "/dashboard") {
      await expect(page.getByRole("link", { name: "Dashboard", exact: true }).first()).toBeVisible();
      return;
    }

    if (pathname === "/waitlist") {
      await expect(page.getByRole("heading", { name: /join the waitlist/i })).toBeVisible();
      return;
    }

    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /email address/i })).toBeVisible();
  });
});
