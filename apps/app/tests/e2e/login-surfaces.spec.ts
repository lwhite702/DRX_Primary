import { expect, test, type Page } from "@playwright/test";

async function expectConfiguredFallback(page: Page) {
  const pathname = new URL(page.url()).pathname;

  if (pathname === "/dashboard") {
    await expect(page.getByRole("main")).toBeVisible();
    return true;
  }

  if (pathname === "/waitlist") {
    await expect(page.getByText(/beta access/i).first()).toBeVisible();
    return true;
  }

  return false;
}

test.describe("Login and register surfaces", () => {
  test("/login is accessible", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/(login|dashboard|waitlist)(?:\?|$)/);

    if (await expectConfiguredFallback(page)) {
      return;
    }

    await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
  });

  test("/register is accessible", async ({ page }) => {
    await page.goto("/register");
    await expect(page).toHaveURL(/\/(register|dashboard|waitlist)(?:\?|$)/);

    if (await expectConfiguredFallback(page)) {
      return;
    }

    await expect(page.getByRole("heading", { name: /create account/i })).toBeVisible();
  });
});
