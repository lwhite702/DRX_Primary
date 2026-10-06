import { afterEach, describe, expect, it, vi } from "vitest";

async function sitemapFor(timestamp: string) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_BUILD_TIMESTAMP", timestamp);
  const { default: sitemap } = await import("@/app/sitemap");
  return sitemap();
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("app sitemap build date", () => {
  it("preserves a valid configured timestamp and public routes", async () => {
    const routes = await sitemapFor("2026-10-03T18:00:00.000Z");
    expect(routes.map((route) => route.url)).toEqual([
      "https://deelrxcrm.app/",
      "https://deelrxcrm.app/waitlist",
      "https://deelrxcrm.app/pricing",
      "https://deelrxcrm.app/contact",
      "https://deelrxcrm.app/privacy",
      "https://deelrxcrm.app/terms",
    ]);
    expect(routes.every((route) => route.lastModified instanceof Date && route.lastModified.toISOString() === "2026-10-03T18:00:00.000Z")).toBe(true);
  });

  it.each(["", "not-a-date"])("uses a valid build date when configuration is %j", async (timestamp) => {
    const before = Date.now();
    const routes = await sitemapFor(timestamp);
    const after = Date.now();
    for (const route of routes) {
      expect(route.lastModified).toBeInstanceOf(Date);
      expect((route.lastModified as Date).getTime()).toBeGreaterThanOrEqual(before);
      expect((route.lastModified as Date).getTime()).toBeLessThanOrEqual(after);
    }
  });
});
