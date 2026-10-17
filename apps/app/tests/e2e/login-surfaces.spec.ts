import { expect, test, type Page } from "@playwright/test";

async function expectConfiguredFallback(page: Page) {
  const pathname = new URL(page.url()).pathname;

  if (pathname === "/dashboard") {
    await expect(page.getByRole("link", { name: "Dashboard", exact: true }).first()).toBeVisible();
    return true;
  }

  if (pathname === "/waitlist") {
    await expect(page.getByText(/beta access/i).first()).toBeVisible();
    return true;
  }

  return false;
}

test.describe("Login and register surfaces", () => {
  test("nested favicon requests do not enter the login server component", async ({ request }) => {
    const response = await request.get("/login/favicon.ico", { maxRedirects: 0 });
    expect(response.status()).toBe(404);
  });

  test("/login is accessible", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/(login|dashboard|waitlist)(?:\?|$)/);

    if (await expectConfiguredFallback(page)) {
      return;
    }

    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible({ timeout: 10000 });
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
