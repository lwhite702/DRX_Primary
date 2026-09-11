"use server";

import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { auth } from "@/lib/adapters/auth/server";
import { getConvexAuthToken } from "@/lib/auth/convex-token";

export async function getCurrentBusinessProfile() {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return null;
    const token = await getConvexAuthToken();
    const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
    if (!token || !url) throw new Error("Business service is unavailable");
    const client = new ConvexHttpClient(url);
    client.setAuth(token);
    const profile = await client.query(api.session.currentBusinessProfile, {
      expectedOrganizationId: orgId ?? undefined,
      expectedUserId: userId,
    });
    return profile ? {
      ...profile,
      createdAt: new Date(profile.createdAt),
      updatedAt: new Date(profile.updatedAt),
    } : null;
  } catch {
    // Failure is not an empty account. Keep the UI out of onboarding on outages
    // and never expose provider payloads, identifiers or configuration in logs.
    throw new Error("We could not load your business. Please try again.");
  }
}
