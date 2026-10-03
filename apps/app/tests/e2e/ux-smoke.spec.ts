import { expect, test } from "@playwright/test";

const checks = [
  { route: "/dashboard", text: /Today|No Business Found/i },
  { route: "/customers", text: /CUSTOMERS/i },
  { route: "/inventory", text: /Inventory|Finish business setup/i },
  { route: "/settings/team", text: /Team Management|Team members could not be loaded|Finish business setup/i },
  { route: "/settings", text: /Settings|Finish business setup/i },
  { route: "/pos/sale", text: /Continue to Payment/i },
  { route: "/help", text: /Support Center/i },
  { route: "/help/library?topic=start", text: /Documentation & Guides/i },
];

test.describe("Required UX smoke", () => {
  for (const check of checks) {
    test(`route renders: ${check.route}`, async ({ page }) => {
      test.setTimeout(90000);
      await page.goto(check.route, { waitUntil: "domcontentloaded" });
      await expect(page.locator("body")).toBeVisible();
      await expect(page.locator("body")).not.toContainText(/Application error|Internal Server Error/i);
      await expect(page.locator("body")).toContainText(check.text, { timeout: 15000 });
      if (check.route === "/settings/team" && await page.getByText("Team members could not be loaded").isVisible()) {
        await expect(page.locator("button").filter({ hasText: "Try Again" })).toBeVisible();
      }
      if (!check.route.startsWith("/help") && !check.route.startsWith("/pos")) {
        await expect(page.locator("#main-content")).toHaveCount(1);
      }
    });
  }
});
