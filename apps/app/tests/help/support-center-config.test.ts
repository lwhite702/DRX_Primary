import { describe, expect, it } from "vitest";

import {
  HELP_LIBRARY_CONTEXT,
  HELP_SECTION_ROUTES,
  buildHelpLibraryHref,
  getHelpLibraryContext,
  normalizeHelpTopic,
} from "@/lib/help/support-center";

describe("Support center route model", () => {
  it("keeps task routes unique and rooted under /help", () => {
    const hrefs = HELP_SECTION_ROUTES.map((route) => route.href);
    const uniqueHrefs = new Set(hrefs);

    expect(uniqueHrefs.size).toBe(hrefs.length);
    expect(hrefs.every((href) => href.startsWith("/help/"))).toBe(true);
  });

  it("keeps every task route mapped to a library context", () => {
    for (const route of HELP_SECTION_ROUTES) {
      expect(HELP_LIBRARY_CONTEXT[route.id]).toBeDefined();
    }
  });

  it("builds topic-aware library links", () => {
    const href = buildHelpLibraryHref("sell", { path: "/articles/checkout" });
    const parsed = new URL(`https://example.test${href}`);

    expect(parsed.pathname).toBe("/help/library");
    expect(parsed.searchParams.get("topic")).toBe("sell");
    expect(parsed.searchParams.get("path")).toBe("/articles/checkout");
  });

  it("falls back to default topic context on invalid topic", () => {
    expect(normalizeHelpTopic("not-real")).toBe("start");
    expect(getHelpLibraryContext("not-real").topic).toBe("start");
  });
});
