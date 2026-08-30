import React from "react";
import { Prisma } from "@prisma/client";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  admin: vi.fn(),
  role: vi.fn(),
  owner: vi.fn(),
}));
vi.mock("@/lib/adapters/auth/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/auth/bypass", () => ({
  isAuthBypassEnabledServer: () => false,
}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("next/navigation", () => ({
  redirect: () => {
    throw new Error("REDIRECT_LOGIN");
  },
}));
vi.mock("@/lib/db", () => ({
  db: {
    adminUser: { findFirst: mocks.admin },
    userRole: { findFirst: mocks.role },
    businessProfile: { findFirst: mocks.owner },
  },
}));
vi.mock("@/app/(app)/admin/_components/AdminNavShell", () => ({
  AdminNavShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
import AdminLayout from "@/app/(app)/admin/layout";

describe("admin layout authorization", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ userId: "synthetic-user" });
    mocks.admin.mockResolvedValue(null);
    mocks.role.mockResolvedValue(null);
    mocks.owner.mockResolvedValue(null);
  });
  const render = async () =>
    renderToStaticMarkup(
      await AdminLayout({ children: <p>Protected admin content</p> }),
    );

  it("uses only real Prisma authorization models", () => {
    const models = Prisma.dmmf.datamodel.models.map(({ name }) => name);
    expect(models).toEqual(
      expect.arrayContaining(["AdminUser", "UserRole", "BusinessProfile"]),
    );
    expect(models).not.toContain("BusinessUser");
  });
  it("renders for an existing platform administrator without a business lookup", async () => {
    mocks.admin.mockResolvedValue({ role: "super_admin" });
    expect(await render()).toContain("Protected admin content");
    expect(mocks.role).not.toHaveBeenCalled();
  });
  it("renders for an existing business admin using the supported role model", async () => {
    mocks.role.mockResolvedValue({ role: "admin" });
    expect(await render()).toContain("Protected admin content");
    expect(mocks.role).toHaveBeenCalledWith({
      where: { userId: "synthetic-user", role: { in: ["owner", "admin"] } },
      select: { role: true },
    });
  });
  it("does not expose admin content when no administrative role exists", async () => {
    expect(await render()).toContain("Administrator Access Required");
    expect(await render()).not.toContain("Protected admin content");
  });
  it("redirects anonymous requests before database access", async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    await expect(render()).rejects.toThrow("REDIRECT_LOGIN");
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("does not grant access when authorization storage fails", async () => {
    mocks.admin.mockRejectedValue(new Error("Synthetic database unavailable"));
    await expect(render()).rejects.toThrow("Synthetic database unavailable");
  });
});
