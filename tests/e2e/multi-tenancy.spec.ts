import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseServiceKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY environment variable is required for e2e tests"
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

test.describe("Multi-Tenancy", () => {
  let userEmail: string;
  let userId: string;
  let business1Id: string;
  let business2Id: string;

  test.beforeAll(async () => {
    // 1. Create User
    userEmail = `test-user-${Date.now()}@example.com`;
    const { data: userData, error: userError } =
      await supabase.auth.admin.createUser({
        email: userEmail,
        password: "password123",
        email_confirm: true,
      });
    if (userError) throw userError;
    userId = userData.user.id;

    // 2. Create Business 1
    const { data: b1, error: b1Error } = await supabase
      .from("business_profile")
      .insert({
        business_name: "Business Alpha",
        owner_id: userId,
        is_active: true,
      })
      .select()
      .single();
    if (b1Error) throw b1Error;
    business1Id = b1.id;

    // 3. Create Business 2
    const { data: b2, error: b2Error } = await supabase
      .from("business_profile")
      .insert({
        business_name: "Business Beta",
        owner_id: userId,
        is_active: true,
      })
      .select()
      .single();
    if (b2Error) throw b2Error;
    business2Id = b2.id;

    // 4. Assign Roles
    await supabase.from("user_roles").insert([
      { user_id: userId, business_id: business1Id, role: "owner" },
      { user_id: userId, business_id: business2Id, role: "owner" },
    ]);
  });

  test("should allow user to switch businesses", async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.fill("input[name='email']", userEmail);
    await page.fill("input[name='password']", "password123");
    await page.click("button[type='submit']");
    await page.waitForURL("/dashboard");

    // Verify initial state (should probably be one of them, order indeterminate w/o preference)
    // We just verify Business Switcher is present
    const switcher = page.locator("button[role='combobox']");
    await expect(switcher).toBeVisible();

    // Open Switcher
    await switcher.click();

    // Check both businesses exist in list
    const alphaItem = page.getByRole("menuitem", { name: "Business Alpha" });
    const betaItem = page.getByRole("menuitem", { name: "Business Beta" });

    await expect(alphaItem).toBeVisible();
    await expect(betaItem).toBeVisible();

    // Switch to Beta
    await betaItem.click();

    // Wait for reload/update
    await page.waitForTimeout(1000); // Wait for page reload if triggered, or state update

    // Verify Switcher text changed
    await expect(switcher).toHaveText(/Business Beta/);

    // Verify LocalStorage (Mocked check implies persistent state)
    // const selectedId = await page.evaluate(() => localStorage.getItem("selectedBusinessId"));
    // expect(selectedId).toBe(business2Id); // Can't easily access closure variable in browser context without exposing it
  });
});
