import { expect, test } from "@playwright/test";

test.describe("Testsprite Local Public Smoke", () => {
  test("TC001 (adapted): onboarding route redirects unauthenticated users to login", async ({
    page,
  }) => {
    await page.goto("/onboarding");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });

  test("TC040 (adapted): waitlist page is reachable from direct route", async ({
    page,
  }) => {
    await page.goto("/waitlist");

    await expect(
      page.getByRole("heading", { name: /join the waitlist/i }),
    ).toBeVisible();
    await expect(page.getByText(/beta access/i)).toBeVisible();
  });

  test("login page renders sign-in shell and waitlist link", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /join beta waitlist/i }),
    ).toBeVisible();
  });

  test("register page renders initialization shell and back-to-sign-in link", async ({
    page,
  }) => {
    await page.goto("/register");

    await expect(
      page.getByRole("heading", { name: /initialize session/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /back to sign in/i }),
    ).toBeVisible();
  });
});
