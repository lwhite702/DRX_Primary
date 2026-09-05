import { test, expect } from "@playwright/test";
// @target:apps/app/app/(retired)/admin/[[...path]]/page.tsx

test.describe("Feature flags access @smoke", () => {
  test("retired admin feature route returns 404 without disclosing a replacement @smoke", async ({ page }) => {
    const response = await page.goto("/admin/features");
    expect(response?.status()).toBe(404);
    expect(response?.headers().location).toBeUndefined();
    await expect(page).toHaveURL(/\/admin\/features$/);
    // Retired entries deliberately have no app shell or replacement discovery.
    expect(await response?.text()).toBe("");
    await expect(page.getByRole("heading", { name: "PostHog rollout flags" })).toHaveCount(0);
  });
});
