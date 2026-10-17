import { test, expect } from "@playwright/test";
// @target:apps/app/app/(retired)/admin/[[...path]]/page.tsx

test.describe("Feature flags access @smoke", () => {
  test("retired admin feature route returns 404 without disclosing a replacement @smoke", async ({ page }) => {
    let response;
    try {
      response = await page.goto("/admin/features");
    } catch (err: any) {
      if (String(err?.message || "").includes("ERR_HTTP_RESPONSE_CODE_FAILURE")) {
        return;
      }
      throw err;
    }
    expect(response?.status()).toBe(404);
    expect(response?.headers().location).toBeUndefined();
    await expect(page).toHaveURL(/\/admin\/features$/);
    // Retired entries deliberately have no app shell or replacement discovery.
    expect(await response?.text()).toBe("");
    await expect(page.getByRole("heading", { name: "PostHog rollout flags" })).toHaveCount(0);
  });
});
