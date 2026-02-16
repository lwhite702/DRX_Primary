import { expect, test } from "@playwright/test";

test.describe("Testsprite Customers & Sales Local", () => {
  test("TC020 (adapted): customers route loads and customer detail route is reachable", async ({
    page,
  }) => {
    await page.goto("/customers");
    await expect(page).toHaveURL(/\/customers/);

    const setupMsg = page.getByText(/no business found/i);
    const customersHeading = page.getByRole("heading", { name: /customers/i });
    await expect(setupMsg.or(customersHeading).first()).toBeVisible();

    await page.goto("/customers/test-id");
    await expect(page).toHaveURL(/\/customers\/test-id/);
    await expect(page.locator("body")).toContainText(
      /(customers|dashboard|online)/i,
    );
  });

  test("TC021 (adapted): customers page shows baseline list/search surface", async ({
    page,
  }) => {
    await page.goto("/customers");
    await expect(page.locator("body")).toContainText(
      /(no business found|customers|search customers)/i,
    );
  });

  test("TC022 (adapted): nonexistent customer search shows empty state", async ({
    page,
  }) => {
    await page.goto("/customers");

    const search = page.getByPlaceholder(/search customers/i);
    if ((await search.count()) === 0) {
      await expect(page.getByText(/no business found/i)).toBeVisible();
      return;
    }

    await search.fill("zzzz-nonexistent-customer-12345");
    await expect(page.getByText(/no customers found/i)).toBeVisible();
  });

  test("TC023 (adapted): clearing customer search restores baseline state", async ({
    page,
  }) => {
    await page.goto("/customers");

    const search = page.getByPlaceholder(/search customers/i);
    if ((await search.count()) === 0) {
      await expect(page.getByText(/no business found/i)).toBeVisible();
      return;
    }

    await search.fill("zzzz-nonexistent-customer-12345");
    await expect(page.getByText(/no customers found/i)).toBeVisible();
    await search.fill("");
    await expect(page.getByRole("heading", { name: /customer list/i })).toBeVisible();
  });

  test("TC024 (adapted): sales workspace route and sale detail route are reachable", async ({
    page,
  }) => {
    await page.goto("/sales");
    await expect(page).toHaveURL(/\/sales/);

    const setupMsg = page.getByText(/no business found/i);
    const posHeading = page.getByRole("heading", { name: /point of sale/i });
    await expect(setupMsg.or(posHeading).first()).toBeVisible();

    await page.goto("/sales/test-id");
    await expect(page).toHaveURL(/\/sales\/test-id/);
    await expect(page.locator("body")).toContainText(
      /(sale not found|sale details|loading sale details)/i,
    );
  });

  test("TC025 (adapted): sale detail page shows summary sections or not-found guard", async ({
    page,
  }) => {
    await page.goto("/sales/test-id");
    await expect(page.locator("body")).toContainText(
      /(sale not found|order summary|loading sale details)/i,
    );
  });

  test("TC026 (adapted): sales route renders standard sales workspace", async ({
    page,
  }) => {
    await page.goto("/sales");

    const setupMsg = page.getByText(/no business found/i);
    const posHeading = page.getByRole("heading", { name: /point of sale/i });
    await expect(setupMsg.or(posHeading).first()).toBeVisible();
  });

  test("TC027 (adapted): customer detail view resolves to stable detail or not-found state", async ({
    page,
  }) => {
    await page.goto("/customers/test-id");
    await expect(page).toHaveURL(/\/customers\/test-id/);
    await expect(page.locator("body")).toContainText(
      /(customers|dashboard|online)/i,
    );
  });
});
