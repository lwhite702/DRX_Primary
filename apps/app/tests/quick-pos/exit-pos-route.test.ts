import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  resolveAuthContext: vi.fn(),
  isAuthBypassEnabledServer: vi.fn(),
  ensureServerFlag: vi.fn(),
  findBusinessSettings: vi.fn(),
}));

vi.mock("@/app/api/pos/_lib/server", () => ({
  resolveAuthContext: mocks.resolveAuthContext,
}));

vi.mock("@/lib/auth/bypass", () => ({
  isAuthBypassEnabledServer: mocks.isAuthBypassEnabledServer,
}));

vi.mock("@/lib/posthog/server-flags", () => ({
  ensureServerFlag: mocks.ensureServerFlag,
}));

vi.mock("@/lib/db", () => ({
  db: {
    businessSettings: {
      findFirst: mocks.findBusinessSettings,
    },
  },
}));

import { GET, POST } from "@/app/api/pos/exit/verify/route";

function makePostRequest(pin = "") {
  return new NextRequest("http://localhost/api/pos/exit/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pin }),
  });
}

describe("GET & POST /api/pos/exit/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAuthBypassEnabledServer.mockReturnValue(false);
    mocks.resolveAuthContext.mockResolvedValue({
      userId: "user_123",
      businessId: "business_123",
    });
    mocks.ensureServerFlag.mockResolvedValue(true);
    mocks.findBusinessSettings.mockResolvedValue({
      posManagerPin: "2468",
      settingsData: null,
    });
  });

  it("GET returns hasPinConfigured false when no PIN is set", async () => {
    mocks.findBusinessSettings.mockResolvedValue({
      posManagerPin: null,
      settingsData: null,
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ allowed: true, hasPinConfigured: false });
  });

  it("GET returns hasPinConfigured true when a manager PIN is configured", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ allowed: false, hasPinConfigured: true });
  });

  it("POST allows an authenticated operator to exit when no PIN is configured", async () => {
    mocks.findBusinessSettings.mockResolvedValue({
      posManagerPin: null,
      settingsData: null,
    });

    const response = await POST(makePostRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ allowed: true, hasPinConfigured: false });
  });

  it("POST continues to reject an incorrect configured PIN", async () => {
    const response = await POST(makePostRequest("0000"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ allowed: false, hasPinConfigured: true });
  });

  it("POST allows the configured manager PIN", async () => {
    const response = await POST(makePostRequest("2468"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ allowed: true, hasPinConfigured: true });
  });

  it("does not query settings when local auth bypass is active", async () => {
    mocks.isAuthBypassEnabledServer.mockReturnValue(true);

    const response = await POST(makePostRequest());

    await expect(response.json()).resolves.toEqual({ allowed: true, hasPinConfigured: false });
    expect(mocks.resolveAuthContext).not.toHaveBeenCalled();
    expect(mocks.findBusinessSettings).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated request", async () => {
    mocks.resolveAuthContext.mockResolvedValue({
      userId: null,
      businessId: null,
    });

    const response = await POST(makePostRequest());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });
});
