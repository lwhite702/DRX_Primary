import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getCurrentUser } from "@/lib/adapters/auth";
import { clerkClient } from "@/lib/adapters/auth/server";
import { getConvexAuthToken } from "@/lib/auth/convex-token";
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
    const secret = process.env.FEATUREBASE_JWT_SECRET;
    const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
    const authToken = await getConvexAuthToken();
    if (!secret || !url || !authToken) throw new Error("UNAVAILABLE:");
    const client = new ConvexHttpClient(url); client.setAuth(authToken);
    const profile = await client.query(api.featurebase.currentProfile, { expectedUserId: user.id });
    const clerk = await clerkClient();
    const identity = await clerk.users.getUser(user.id);
    const email = identity.primaryEmailAddress?.emailAddress?.trim();
    if (identity.id !== user.id || !email || identity.primaryEmailAddress?.verification?.status !== "verified") throw new Error("FORBIDDEN:");
    if (profile?.email && profile.email.trim().toLowerCase() !== email.toLowerCase()) throw new Error("PROFILE_MISMATCH:");
    const name = profile?.name?.trim() || [identity.firstName, identity.lastName].filter(Boolean).join(" ").trim() || identity.username || email.split("@")[0] || "User";
    const token = jwt.sign({ userId: user.id, email, name }, secret, { expiresIn: "1h", algorithm: "HS256" });
    return NextResponse.json({ token }, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message.includes("UNAUTHORIZED:") ? 401 : message.includes("FORBIDDEN:") ? 403 : 503;
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : status === 403 ? "A verified email and active account are required" : message.includes("PROFILE_MISMATCH:") ? "Your profile email requires reconciliation before signing in" : "Help center sign-in is temporarily unavailable" }, { status, headers });
  }
}
