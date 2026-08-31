import React from "react";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const m = vi.hoisted(() => ({ metrics: vi.fn(), console: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/control/synthetic" }));
vi.mock("@/components/layout/logout-button", () => ({ LogoutButton: () => <button>Sign out</button> }));
vi.mock("@/components/layout/app-logo", () => ({ AppLogo: () => <span>Business workspace</span> }));
vi.mock("@/lib/hooks/use-business", () => ({ useBusiness: () => ({ business: { id: "business-a" } }) }));
vi.mock("@/lib/hooks/use-permission", () => ({ usePermission: () => ({ hasPermission: () => true, loading: false }) }));
vi.mock("@/lib/auth/platform-console", () => ({ requirePlatformConsole: m.console }));
vi.mock("@/lib/platform/queries", () => ({ getPlatformMetrics: m.metrics }));
import { PlatformShell } from "@/components/platform/platform-shell";
import Overview from "@/app/(platform)/control/[consoleKey]/page";
import { Sidebar } from "@/components/layout/sidebar";

describe("separate platform presentation", () => {
  beforeEach(() => { vi.resetAllMocks(); });
  it("never exposes platform entry in the business sidebar, even with every business permission", () => {
    const html = renderToStaticMarkup(<Sidebar />);
    expect(html).toContain('href="/settings/team"');
    expect(html).toContain('href="/settings/audit"');
    expect(html).toContain('href="/inventory/approvals"');
    expect(html).not.toContain('href="/admin');
    expect(html).not.toContain('/control/');
    expect(html).not.toContain('Platform overview');
  });
  it("has a persistent red banner and platform-only navigation", () => {
    render(<PlatformShell basePath="/control/synthetic"><p>Platform metrics</p></PlatformShell>);
    const banner = screen.getByRole("banner", { name: "Platform administration warning" });
    expect(banner.className).toContain("bg-red-700");
    expect(banner.className).not.toMatch(/hidden/);
    expect(banner.textContent).toContain("PLATFORM ADMINISTRATION");
    const nav = screen.getByRole("navigation", { name: "Platform navigation" });
    expect(within(nav).getByRole("link", { name: "Platform overview" }).getAttribute("aria-current")).toBe("page");
    expect(within(nav).getAllByRole("link").every(link => link.getAttribute("href")?.startsWith("/control/synthetic"))).toBe(true);
    expect(within(nav).queryByText("Point of Sale")).toBeNull();
    expect(within(nav).queryByText("Customers")).toBeNull();
    expect(screen.getByRole("main").id).toBe("platform-content");
  });
  it("shows registry counts rather than business revenue", async () => {
    m.metrics.mockResolvedValue({ businesses: 12, activeBusinesses: 10, memberships: 40, aiFailures: 2 });
    const html = renderToStaticMarkup(await Overview({ params: Promise.resolve({ consoleKey: "synthetic" }) }));
    expect(html).toContain("Registered web businesses");
    expect(html).toContain("Business memberships");
    expect(html).not.toContain("Gross profit");
    expect(m.console.mock.invocationCallOrder[0]).toBeLessThan(m.metrics.mock.invocationCallOrder[0]);
  });
  it("shows unavailable metrics instead of fabricating zero counts", async () => {
    m.metrics.mockRejectedValue(new Error("synthetic outage"));
    const html = renderToStaticMarkup(await Overview({ params: Promise.resolve({ consoleKey: "synthetic" }) }));
    expect(html).toContain("Unavailable");
    expect(html).toContain('role="alert"');
    expect(html).not.toContain("synthetic outage");
  });
});
