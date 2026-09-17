import "server-only";

import { ConvexHttpClient } from "convex/browser";

import { api } from "@/convex/_generated/api";
import { getConvexAuthToken } from "@/lib/auth/convex-token";

export type ConvexOnboardingSetup = {
  locationName?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  ownerPhone?: string;
  tracksInventory?: boolean;
  dashboardPreset?: "operations" | "checkout" | "inventory";
  defaultUnit?: string;
  privacyPreset?: string;
  privacyProtocolJson?: string;
  quickQuantities?: Array<{ label: string; value: number; unit: string }>;
  inventoryReasons?: Array<{ label: string; type: string }>;
  nicknames?: Array<{ slang: string; quantity: number; unit: string }>;
  managerPin?: string;
};

export type ConvexOnboardingInput = {
  expectedUserId?: string;
  expectedOrganizationId?: string | null;
  name?: string;
  businessName: string;
  businessType?: string;
  clerkOrgId?: string;
  currency?: string;
  timezone?: string;
  collectTax?: boolean;
  taxRateBps?: number;
  setupJson?: string;
  setup?: ConvexOnboardingSetup;
};

async function authenticatedConvexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!url) {
    throw new Error("Workspace setup is temporarily unavailable.");
  }

  const token = await getConvexAuthToken();
  if (!token) {
    throw new Error("Please sign in again to finish setting up your workspace.");
  }

  const client = new ConvexHttpClient(url);
  client.setAuth(token);
  return client;
}

export async function provisionBusinessInConvex(input: ConvexOnboardingInput) {
  const client = await authenticatedConvexClient();
  const { setup, setupJson, ...rest } = input;
  let resolvedSetupJson = setupJson;

  if (!resolvedSetupJson && setup) {
    resolvedSetupJson = JSON.stringify({
      businessName: input.businessName.trim(),
      businessType: input.businessType?.trim() || "Retail POS",
      address: setup.address?.trim() || "",
      city: setup.city?.trim() || "",
      state: (setup.region ?? "").trim(),
      zipCode: (setup.postalCode ?? "").trim(),
      ownerPhone: setup.ownerPhone?.trim() || "",
      ownerName: input.name?.trim() || "DRX Operator",
      defaultUnit: setup.defaultUnit || "g",
      quickQuantities: (setup.quickQuantities || []).map((q) => ({
        label: q.label,
        value: q.value,
        unit: q.unit,
        enabled: true,
      })),
      privacyPreset: setup.privacyPreset || "standard_mode",
      inventoryReasons: (setup.inventoryReasons || []).map((r) => ({
        label: r.label,
        type: r.type,
        enabled: true,
      })),
      nicknames: (setup.nicknames || []).map((n) => ({
        slang: n.slang,
        quantity: n.quantity,
        unit: n.unit,
        enabled: true,
      })),
      managerPin: setup.managerPin?.trim() || undefined,
    });
  }

  const mutationArgs = {
    ...rest,
    ...(resolvedSetupJson ? { setupJson: resolvedSetupJson } : {}),
  };

  return client.mutation(api.onboarding.createBusinessOnboarding, mutationArgs);
}


