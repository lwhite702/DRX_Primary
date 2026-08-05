import { expect, test } from "@playwright/test";

const checks = [
<<<<<<< HEAD
  { route: "/dashboard", text: /Operator Dashboard|No Business Found/i },
=======
  { route: "/dashboard", text: /Welcome to DRX|Operator Dashboard/i },
>>>>>>> origin/main
  { route: "/customers", text: /CUSTOMERS/i },
  { route: "/pos/sale", text: /Continue to Payment/i },
  { route: "/help", text: /Support Center/i },
  { route: "/help/library?topic=start", text: /Knowledge Library/i },
];

test.describe("Required UX smoke", () => {
  for (const check of checks) {
    test(`route renders: ${check.route}`, async ({ page }) => {
      await page.goto(check.route, { waitUntil: "domcontentloaded" });
      await expect(page.locator("body")).toBeVisible();
      await expect(page.locator("body")).not.toContainText(/Application error|Internal Server Error/i);
      await expect(page.locator("body")).toContainText(check.text);
    });
  }
});
