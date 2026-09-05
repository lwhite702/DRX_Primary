import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ auth: vi.fn(), bypass: vi.fn(), grant: vi.fn(), role: vi.fn(), metrics: vi.fn(), audit: vi.fn(), failures: vi.fn() }));
vi.mock("@/lib/adapters/auth/server", () => ({ auth: m.auth, isAuthBypassEnabled: m.bypass }));
vi.mock("@/lib/db", () => ({ db: { adminUser: { findFirst: m.grant }, userRole: { findFirst: m.role } } }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/lib/platform/queries", () => ({ getPlatformMetrics: m.metrics, getPlatformAudit: m.audit, getPlatformAiFailures: m.failures }));
vi.mock("@/components/platform/users-client", () => ({ UsersClient: () => <p>Platform user controls</p> }));
vi.mock("@/components/platform/businesses-client", () => ({ BusinessesClient: () => <p>Platform business controls</p> }));

import Overview from "@/app/(platform)/control/[consoleKey]/(console)/page";
import Businesses from "@/app/(platform)/control/[consoleKey]/(console)/businesses/page";
import Users from "@/app/(platform)/control/[consoleKey]/(console)/users/page";
import Audit from "@/app/(platform)/control/[consoleKey]/(console)/audit/page";
import Ai from "@/app/(platform)/control/[consoleKey]/(console)/ai/page";
import Features from "@/app/(platform)/control/[consoleKey]/(console)/features/page";
import { FLAG_MANIFEST } from "@/lib/posthog/flags-manifest";

const key = "c".repeat(48);
const pages = [
  ["overview", Overview, "Platform overview"],
  ["businesses", Businesses, "Platform business controls"],
  ["users", Users, "Platform user controls"],
  ["audit", Audit, "Platform audit"],
  ["ai", Ai, "AI operations"],
  ["features", Features, "PostHog rollout flags"],
] as const;

describe.each(pages)("independent %s page authorization", (_name, Page, content) => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("PLATFORM_CONSOLE_SLUG", key);
    m.auth.mockResolvedValue({ userId: "actor" });
    m.bypass.mockReturnValue(false);
    m.grant.mockResolvedValue(null);
    m.metrics.mockResolvedValue({ businesses: 1, activeBusinesses: 1, memberships: 2, aiFailures: 0 });
    m.audit.mockResolvedValue([]);
    m.failures.mockResolvedValue([]);
  });
  afterEach(() => { vi.unstubAllEnvs(); });
  const render = async (consoleKey = key) => renderToStaticMarkup(await Page({ params: Promise.resolve({ consoleKey }) }));
  const expectDenied = async (consoleKey = key) => {
    await expect(render(consoleKey)).rejects.toThrow("NOT_FOUND");
    expect(m.metrics).not.toHaveBeenCalled();
    expect(m.audit).not.toHaveBeenCalled();
    expect(m.failures).not.toHaveBeenCalled();
  };

  it.each(["owner", "admin", "manager", "staff", "super_admin"])("denies tenant %s with forged global permission", async role => {
    m.role.mockResolvedValue({ role, permissions: { all: true, "users.manage_all": true } });
    await expectDenied();
    expect(m.role).not.toHaveBeenCalled();
  });
  it("denies anonymous requests before grant lookup", async () => {
    m.auth.mockResolvedValue({ userId: null });
    await expectDenied();
    expect(m.grant).not.toHaveBeenCalled();
  });
  it("denies bypass even with a platform grant", async () => {
    m.bypass.mockReturnValue(true);
    m.grant.mockResolvedValue({ role: "super_admin" });
    await expectDenied();
    expect(m.grant).not.toHaveBeenCalled();
  });
  it("denies guessed entry keys before identity lookup", async () => {
    await expectDenied("admin");
    expect(m.auth).not.toHaveBeenCalled();
  });
  it("fails closed if the grant store fails", async () => {
    m.grant.mockRejectedValue(new Error("Synthetic private provider detail"));
    await expectDenied();
  });
  it("renders for an explicit grant without tenant membership", async () => {
    m.grant.mockResolvedValue({ role: "super_admin" });
    expect(await render()).toContain(content);
    expect(m.grant).toHaveBeenCalledWith({ where: { userId: "actor", role: "super_admin" }, select: { role: true } });
    expect(m.role).not.toHaveBeenCalled();
  });
  it("checks the grant again after revocation", async () => {
    m.grant.mockResolvedValueOnce({ role: "super_admin" }).mockResolvedValueOnce(null);
    expect(await render()).toContain(content);
    m.metrics.mockClear(); m.audit.mockClear(); m.failures.mockClear();
    await expectDenied();
    expect(m.grant).toHaveBeenCalledTimes(2);
  });
});

it("renders the canonical feature manifest as read-only", async () => {
  vi.stubEnv("PLATFORM_CONSOLE_SLUG", key);
  try {
    m.auth.mockResolvedValue({ userId: "actor" });
    m.bypass.mockReturnValue(false);
    m.grant.mockResolvedValue({ role: "super_admin" });
    const html = renderToStaticMarkup(await Features({ params: Promise.resolve({ consoleKey: key }) }));
    for (const flag of FLAG_MANIFEST) expect(html).toContain(flag.key);
    expect(html.match(/<tr\b/g)).toHaveLength(FLAG_MANIFEST.length + 1);
    expect(html).toContain("sole runtime authority");
    expect(html).not.toMatch(/<(?:button|input|form)\b/);
  } finally { vi.unstubAllEnvs(); }
});
