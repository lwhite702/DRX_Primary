import React from "react";
import { Prisma } from "@prisma/client";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), admin: vi.fn(), role: vi.fn(), bypass: vi.fn(),
}));
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
import PlatformLayout from "@/app/(platform)/control/[consoleKey]/layout";
import RetiredAdminPage from "@/app/(retired)/admin/[[...path]]/page";
import { getPlatformAdmin } from "@/lib/auth/platform-admin";
import { requirePlatformConsole } from "@/lib/auth/platform-console";

const key = "a".repeat(32);
describe("hard platform authorization boundary", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("PLATFORM_CONSOLE_SLUG", key);
    mocks.auth.mockResolvedValue({ userId: "synthetic-user" });
    mocks.admin.mockResolvedValue(null);
    mocks.role.mockResolvedValue(null);
    mocks.bypass.mockReturnValue(false);
  });
  afterEach(() => { vi.unstubAllEnvs(); });
  const render = async (consoleKey = key) => renderToStaticMarkup(
    await PlatformLayout({ children: <p>Protected platform content</p>, params: Promise.resolve({ consoleKey }) }),
  );

  it("uses the real platform grant model", () => {
    expect(Prisma.dmmf.datamodel.models.map(({ name }) => name)).toContain("AdminUser");
  });
  it("renders for explicit platform admin without business membership", async () => {
    mocks.admin.mockResolvedValue({ role: "super_admin" });
    expect(await render()).toContain("Protected platform content");
    expect(mocks.admin).toHaveBeenCalledWith({ where: { userId: "synthetic-user", role: "super_admin" }, select: { role: true } });
    expect(mocks.role).not.toHaveBeenCalled();
  });
  it.each(["owner", "admin", "staff", "manager", "super_admin"])("denies tenant %s even with forged platform permissions", async role => {
    mocks.role.mockResolvedValue({ role, permissions: { "users.manage_all": true, all: true } });
    await expect(render()).rejects.toThrow("NOT_FOUND");
    expect(mocks.role).not.toHaveBeenCalled();
  });
  it.each(["owner", "admin", "", "unknown"])("rejects unrecognized platform grant %s", async role => {
    mocks.admin.mockResolvedValue({ role });
    await expect(render()).rejects.toThrow("NOT_FOUND");
  });
  it("denies anonymous requests before database access", async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    await expect(render()).rejects.toThrow("NOT_FOUND");
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("does not allow development bypass into platform scope", async () => {
    mocks.bypass.mockReturnValue(true);
    mocks.admin.mockResolvedValue({ role: "super_admin" });
    await expect(render()).rejects.toThrow("NOT_FOUND");
    expect(mocks.auth).not.toHaveBeenCalled();
  });
  it("fails closed on storage failure without exposing provider details", async () => {
    mocks.admin.mockRejectedValue(new Error("synthetic provider detail"));
    await expect(render()).rejects.toThrow("NOT_FOUND");
  });
  it("checks grant again after revocation", async () => {
    mocks.admin.mockResolvedValueOnce({ role: "super_admin" }).mockResolvedValueOnce(null);
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
