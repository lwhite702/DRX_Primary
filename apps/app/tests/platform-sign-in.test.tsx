import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ auth: vi.fn(), bypass: vi.fn(), token: vi.fn(), query: vi.fn() }));
vi.mock("@/lib/auth/convex-token", () => ({ getConvexAuthToken: m.token }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { setAuth() {} query = m.query; } }));
vi.mock("@/lib/adapters/auth/server", () => ({ auth: m.auth, isAuthBypassEnabled: m.bypass }));
vi.mock("@/lib/adapters/auth/appearance", () => ({ drxClerkAuthAppearance: { elements: {} } }));
vi.mock("@/lib/adapters/auth/ui", () => ({ SignIn: ({ path, forceRedirectUrl }: { path: string; forceRedirectUrl: string }) => <div data-sign-in-path={path} data-destination={forceRedirectUrl}>Sign in</div> }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); }, redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));
import PlatformSignInPage from "@/app/(platform)/control/[consoleKey]/sign-in/[[...rest]]/page";
const key = "b".repeat(48);
const page = (consoleKey = key) => PlatformSignInPage({ params: Promise.resolve({ consoleKey }) });
describe("private platform sign-in", () => {
  beforeEach(() => {
    vi.resetAllMocks(); vi.stubEnv("PLATFORM_CONSOLE_SLUG", key);
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://synthetic.convex.cloud");
    m.auth.mockResolvedValue({ userId: null }); m.bypass.mockReturnValue(false);
    m.token.mockResolvedValue("synthetic-token"); m.query.mockRejectedValue(new Error("FORBIDDEN"));
  });
  afterEach(() => { vi.unstubAllEnvs(); });
  it("shows sign-in and a red warning without exposing console data or navigation", async () => {
    const html = renderToStaticMarkup(await page());
    expect(html).toContain("PLATFORM ADMINISTRATION"); expect(html).toContain("bg-red-700");
    expect(html).toContain(`data-sign-in-path="/control/${key}/sign-in"`);
    expect(html).toContain(`data-destination="/control/${key}"`);
    expect(html).not.toContain("Platform overview"); expect(m.query).not.toHaveBeenCalled();
  });
  it("rejects guessed entry values before identity access", async () => {
    await expect(page("admin")).rejects.toThrow("NOT_FOUND"); expect(m.auth).not.toHaveBeenCalled();
  });
  it("rejects absent configuration", async () => {
    vi.stubEnv("PLATFORM_CONSOLE_SLUG", ""); await expect(page()).rejects.toThrow("NOT_FOUND");
  });
  it("rejects development bypass", async () => {
    m.bypass.mockReturnValue(true); await expect(page()).rejects.toThrow("NOT_FOUND");
  });
  it("rejects a signed-in business user without a platform grant", async () => {
    m.auth.mockResolvedValue({ userId: "business-owner" }); await expect(page()).rejects.toThrow("NOT_FOUND");
  });
  it("sends an explicitly granted platform admin directly to the console", async () => {
    m.auth.mockResolvedValue({ userId: "platform-admin" }); m.query.mockResolvedValue([]);
    await expect(page()).rejects.toThrow(`REDIRECT:/control/${key}`);
  });
  it("fails closed when the platform grant store cannot be read", async () => {
    m.auth.mockResolvedValue({ userId: "platform-admin" }); m.query.mockRejectedValue(new Error("provider-private-detail"));
    await expect(page()).rejects.toThrow("NOT_FOUND");
  });
});
