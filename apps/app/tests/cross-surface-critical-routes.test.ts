import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// @target:apps/app/app/api/ai/analyze/route.ts
// @target:apps/marketing/app/login/page.tsx
// @target:apps/mobile/app/login.tsx
// @target:apps/mobile/app/(tabs)/index.tsx

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function source(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("critical cross-surface route contracts", () => {
  it("keeps the marketing login route as a non-indexed app redirect", () => {
    const page = source("apps/marketing/app/login/page.tsx");

    expect(page).toContain("redirect(`${appUrl}/login`)");
    expect(page).toContain("index: false");
    expect(page).toContain("NEXT_PUBLIC_APP_URL");
  });

  it("keeps the mobile login entry point labeled and testable", () => {
    const page = source("apps/mobile/app/login.tsx");

    expect(page).toContain('testID="login-button"');
    expect(page).toContain('accessibilityRole="button"');
    expect(page).toContain('accessibilityLabel="Sign In"');
  });

  it("keeps the mobile POS entry point connected to inventory and checkout", () => {
    const page = source("apps/mobile/app/(tabs)/index.tsx");

    expect(page).toContain("api.products.listProducts");
    expect(page).toContain("api.checkout.processCheckout");
    expect(page).toContain("queueSale");
  });
});
