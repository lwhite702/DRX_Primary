"use server";

import { auth } from "@/lib/adapters/auth/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getConvexAuthToken } from "@/lib/auth/convex-token";

export async function getUserBusinessesAction() {
  try {
    const { userId } = await auth();
    if (!userId) return { businesses: [], error: "Not authenticated" };

    const token = await getConvexAuthToken(); const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
    if (!token || !url) return { businesses: [], error: "Business service unavailable" };
    const client = new ConvexHttpClient(url); client.setAuth(token);
    return { businesses: await client.query(api.session.listMyBusinesses, {}) };
  } catch (error) {
    console.error("Error fetching user businesses:", error);
    return { businesses: [], error: "Failed to fetch businesses" };
  }
}
