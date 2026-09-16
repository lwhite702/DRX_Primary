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
};

export type ConvexOnboardingInput = {
  name?: string;
  businessName: string;
  businessType?: string;
  clerkOrgId?: string;
  currency?: string;
  timezone?: string;
  collectTax?: boolean;
  taxRateBps?: number;
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
  return client.mutation(api.onboarding.createBusinessOnboarding, input);
}


