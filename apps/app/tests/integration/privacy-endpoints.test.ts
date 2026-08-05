import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  resolveAuthContext: vi.fn(),
  getVaultRuntimeStatus: vi.fn(),
  computePrivacyInventoryCounts: vi.fn(),
  getLatestPrivacyInventorySnapshot: vi.fn(),
  capturePrivacyInventorySnapshot: vi.fn(),
  auth: vi.fn(),
  clerkClient: vi.fn(),
  isAuthBypassEnabled: vi.fn(),
  db: {
    businessSettings: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));

vi.mock("@/app/api/pos/_lib/server", () => ({
  resolveAuthContext: mocks.resolveAuthContext,
}));

vi.mock("@/lib/privacy/crypto", () => ({
  getVaultRuntimeStatus: mocks.getVaultRuntimeStatus,
}));

vi.mock("@/lib/privacy/inventory", () => ({
  computePrivacyInventoryCounts: mocks.computePrivacyInventoryCounts,
  getLatestPrivacyInventorySnapshot: mocks.getLatestPrivacyInventorySnapshot,
  capturePrivacyInventorySnapshot: mocks.capturePrivacyInventorySnapshot,
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

vi.mock("@/lib/adapters/auth/server", () => ({
  auth: mocks.auth,
  clerkClient: mocks.clerkClient,
  isAuthBypassEnabled: mocks.isAuthBypassEnabled,
}));

import { GET as getVaultStatus } from "@/app/api/privacy/vault-status/route";
import { GET as getInventory } from "@/app/api/privacy/inventory/route";
import { POST as refreshInventory } from "@/app/api/privacy/inventory/refresh/route";
import {
  GET as getProteXionPreference,
  POST as postProteXionPreference,
} from "@/app/api/privacy/protexion/preferences/route";

describe("Privacy endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.$queryRaw.mockRejectedValue(new Error('relation "privacy_preferences" does not exist'));
    mocks.db.$executeRaw.mockRejectedValue(new Error('relation "privacy_preferences" does not exist'));
  });

  it("returns vault status for authorized user", async () => {
    mocks.resolveAuthContext.mockResolvedValue({
      userId: "user_1",
      businessId: "biz_1",
    });
    mocks.getVaultRuntimeStatus.mockResolvedValue({
      vault_mode_active: true,
      current_key_loaded: true,
      previous_key_loaded: false,
      hash_key_loaded: true,
      last_error_at: null,
    });

    const res = await getVaultStatus();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.vault_mode_active).toBe(true);
  });

  it("returns inventory counts and latest snapshot", async () => {
    mocks.resolveAuthContext.mockResolvedValue({
      userId: "user_1",
      businessId: "biz_1",
    });
    mocks.computePrivacyInventoryCounts.mockResolvedValue({
      alias_count: 10,
      phone_count: 5,
      email_count: 4,
      address_count: 2,
      notes_count: 1,
    });
    mocks.getLatestPrivacyInventorySnapshot.mockResolvedValue({
      alias_count: 10,
      phone_count: 5,
      email_count: 4,
      address_count: 2,
      notes_count: 1,
      alias_delta: 1,
      phone_delta: 0,
      email_delta: 0,
      address_delta: 0,
      notes_delta: -1,
      captured_at: new Date().toISOString(),
    });

    const res = await getInventory();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.counts.alias_count).toBe(10);
    expect(json.latest_snapshot.alias_delta).toBe(1);
  });

  it("refreshes inventory snapshot and updates settings metadata", async () => {
    mocks.resolveAuthContext.mockResolvedValue({
      userId: "user_1",
      businessId: "biz_1",
    });
    mocks.capturePrivacyInventorySnapshot.mockResolvedValue({
      id: "snap_1",
      business_id: "biz_1",
      alias_count: 10,
      phone_count: 5,
      email_count: 4,
      address_count: 2,
      notes_count: 1,
      alias_delta: 1,
      phone_delta: 0,
      email_delta: 0,
      address_delta: 0,
      notes_delta: -1,
      captured_at: "2026-03-04T00:00:00.000Z",
    });
    mocks.db.businessSettings.findFirst.mockResolvedValue({
      id: "settings_1",
      settingsData: {},
    });
    mocks.db.businessSettings.update.mockResolvedValue({});

    const res = await refreshInventory();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(mocks.db.businessSettings.update).toHaveBeenCalled();
  });

  it("supports ProteXion preference GET in auth bypass mode", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      sessionClaims: {
        publicMetadata: {
          operatorProfile: {
            screenPrivacy: {
              manual_enabled: true,
            },
          },
        },
      },
    });
    mocks.isAuthBypassEnabled.mockReturnValue(true);

    const res = await getProteXionPreference();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.manual_enabled).toBe(true);
  });

  it("updates ProteXion preference for authenticated user", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      sessionClaims: {},
    });
    mocks.isAuthBypassEnabled.mockReturnValue(false);
    const updateUser = vi.fn().mockResolvedValue({});
    const getUser = vi.fn().mockResolvedValue({
      publicMetadata: {},
    });
    mocks.clerkClient.mockResolvedValue({
      users: {
        getUser,
        updateUser,
      },
    });

    const req = new NextRequest(
      "http://localhost:3000/api/privacy/protexion/preferences",
      {
        method: "POST",
        body: JSON.stringify({ manual_enabled: true }),
        headers: { "content-type": "application/json" },
      },
    );

    const res = await postProteXionPreference(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.manual_enabled).toBe(true);
    expect(updateUser).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({
        publicMetadata: expect.any(Object),
      }),
    );
  });
});
