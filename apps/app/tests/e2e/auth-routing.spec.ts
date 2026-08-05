import { expect, test } from "@playwright/test";

test.describe("Auth routing regressions", () => {
  test("/ resolves to a valid configured entry surface", async ({ page }) => {
    await page.goto("/");

    const pathname = new URL(page.url()).pathname;

    if (pathname === "/dashboard") {
<<<<<<< HEAD
      await expect(page.getByRole("link", { name: "Dashboard", exact: true }).first()).toBeVisible();
=======
      await expect(page.getByRole("main")).toBeVisible();
>>>>>>> origin/main
      return;
    }

    if (pathname === "/waitlist") {
<<<<<<< HEAD
      await expect(page.getByRole("heading", { name: /join the waitlist/i })).toBeVisible();
=======
      await expect(page.getByText(/beta access/i).first()).toBeVisible();
>>>>>>> origin/main
      return;
    }

    await expect(page).toHaveURL(/\/login(?:\?|$)/);
<<<<<<< HEAD
    await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
=======
    await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
>>>>>>> origin/main
    await expect(page.getByRole("textbox", { name: /email address/i })).toBeVisible();
  });
});
