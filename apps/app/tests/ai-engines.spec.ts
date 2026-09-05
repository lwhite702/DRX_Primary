import { test, expect } from "@playwright/test";

// @target:apps/app/app/api/ai/product-intelligence/route.ts

test.describe("AI Features E2E", () => {
  test("AI Intelligence Page redirects to login", async ({ page }) => {
    // Navigate to the AI Intelligence dashboard
    await page.goto("/ai-intelligence");

    // Expect redirect to login page
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator("body")).toContainText("Sign In", {
      ignoreCase: true,
    });
  });

  test("Credit Management Page redirects to login", async ({ page }) => {
    await page.goto("/credit");
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator("body")).toContainText("Sign In", {
      ignoreCase: true,
    });
  });

  test("AI Product Intelligence API is protected", async ({ request }) => {
    const response = await request.post("/api/ai/product-intelligence", {
      data: {
        business_id: "fake-id",
        inventory_id: "fake-id",
        product_name: "Test Product",
        sku: "TEST-SKU-123",
      },
    });

    // URL check might depend on if it redirected or just returned 401
    // The previous run showed it returned JSON directly.

    if (response.status() === 401) {
      const body = await response.json();
      expect(body).toHaveProperty("error", "Unauthorized");
    } else {
      // Fallback if it acted as browser
      const text = await response.text();
      const isJson = text.startsWith("{");
      if (isJson) {
        const body = JSON.parse(text);
        expect(body).toHaveProperty("error");
      } else {
        expect(text).toContain("Sign In");
      }
    }
  });
});
