import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), admin: vi.fn(), role: vi.fn(), bypass: vi.fn(), token: vi.fn(), query: vi.fn(),
}));
vi.mock("@/lib/auth/convex-token", () => ({ getConvexAuthToken: mocks.token }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { setAuth() {} query = mocks.query; } }));
vi.mock("@/lib/adapters/auth/server", () => ({
  auth: mocks.auth, isAuthBypassEnabled: mocks.bypass,
}));
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NOT_FOUND"); },
}));
vi.mock("@/lib/db", () => ({
  db: { adminUser: { findFirst: mocks.admin }, userRole: { findFirst: mocks.role } },
}));
vi.mock("@/components/platform/platform-shell", () => ({
  PlatformShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
import PlatformLayout from "@/app/(platform)/control/[consoleKey]/(console)/layout";
import RetiredAdminPage from "@/app/(retired)/admin/[[...path]]/page";
import { getPlatformAdmin } from "@/lib/auth/platform-admin";
import { requirePlatformConsole } from "@/lib/auth/platform-console";

const key = "a".repeat(32);
describe("hard platform authorization boundary", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("PLATFORM_CONSOLE_SLUG", key);
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://synthetic.convex.cloud");
    mocks.auth.mockResolvedValue({ userId: "synthetic-user" });
    mocks.token.mockResolvedValue("synthetic-token");
    mocks.query.mockRejectedValue(new Error("FORBIDDEN"));
    mocks.admin.mockResolvedValue(null);
    mocks.role.mockResolvedValue(null);
    mocks.bypass.mockReturnValue(false);
  });
  afterEach(() => { vi.unstubAllEnvs(); });
  const render = async (consoleKey = key) => renderToStaticMarkup(
    await PlatformLayout({ children: <p>Protected platform content</p>, params: Promise.resolve({ consoleKey }) }),
  );

  it("uses the real platform grant model", () => {
    const schema = readFileSync("convex/schema.ts", "utf8");
    expect(schema).toMatch(/platformAdminGrants: defineTable\(/);
  });
  it("renders for explicit platform admin without business membership", async () => {
    mocks.query.mockResolvedValue([]);
    expect(await render()).toContain("Protected platform content");
    expect(mocks.query).toHaveBeenCalledOnce();
    expect(mocks.role).not.toHaveBeenCalled();
  });
  it.each(["owner", "admin", "staff", "manager", "super_admin"])("denies tenant %s even with forged platform permissions", async role => {
    mocks.role.mockResolvedValue({ role, permissions: { "users.manage_all": true, all: true } });
    await expect(render()).rejects.toThrow("NOT_FOUND");
    expect(mocks.role).not.toHaveBeenCalled();
  });
  it("rejects a route without a verified Convex token", async () => {
    mocks.token.mockResolvedValue(null);
    mocks.query.mockResolvedValue([]);
    await expect(render()).rejects.toThrow("NOT_FOUND");
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it("denies anonymous requests before database access", async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    await expect(render()).rejects.toThrow("NOT_FOUND");
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it("does not allow development bypass into platform scope", async () => {
    mocks.bypass.mockReturnValue(true);
    mocks.query.mockResolvedValue([]);
    await expect(render()).rejects.toThrow("NOT_FOUND");
    expect(mocks.auth).not.toHaveBeenCalled();
  });
  it("fails closed on storage failure without exposing provider details", async () => {
    mocks.query.mockRejectedValue(new Error("synthetic provider detail"));
    await expect(render()).rejects.toThrow("NOT_FOUND");
  });
  it("checks grant again after revocation", async () => {
    mocks.query.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("FORBIDDEN"));
    expect(await getPlatformAdmin()).toEqual({ userId: "synthetic-user" });
    expect(await getPlatformAdmin()).toBeNull();
  });
  it("does not reveal the console for guessed or unset routes", async () => {
    await expect(render("admin")).rejects.toThrow("NOT_FOUND");
    vi.stubEnv("PLATFORM_CONSOLE_SLUG", "");
    await expect(requirePlatformConsole(key)).rejects.toThrow("NOT_FOUND");
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("retires /admin without a redirect or data access", () => {
    expect(() => RetiredAdminPage()).toThrow("NOT_FOUND");
    expect(mocks.admin).not.toHaveBeenCalled();
  });
});
