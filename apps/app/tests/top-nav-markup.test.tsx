import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/layout/notifications-popover", () => ({ NotificationsPopover: () => null }));
vi.mock("@/components/layout/business-switcher", () => ({ BusinessSwitcher: () => null }));
vi.mock("@/components/layout/dashboard-view-switcher", () => ({ DashboardViewSwitcher: () => null }));
vi.mock("@/lib/adapters/auth/ui", () => ({ UserButton: () => null }));
vi.mock("@/lib/hooks/use-permission", () => ({ usePermission: () => ({ hasPermission: () => false, loading: false }) }));
vi.mock("@/lib/hooks/use-user-role", () => ({ useUserRole: () => ({ role: "staff" }) }));

import { TopNav } from "@/components/layout/top-nav";

describe("top navigation markup", () => {
  it("renders one dashboard brand link without invalid nested anchors", () => {
    // Inspect SSR markup before an HTML parser repairs invalid anchor nesting.
    const html = renderToStaticMarkup(<TopNav />);
    let anchorDepth = 0;
    for (const tag of html.matchAll(/<\/?a(?:\s[^>]*|)>/g)) {
      anchorDepth += tag[0].startsWith("</") ? -1 : 1;
      expect(anchorDepth).toBeLessThanOrEqual(1);
    }
    expect(anchorDepth).toBe(0);
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('aria-label="Deelrx CRM Home"');
  });
});
