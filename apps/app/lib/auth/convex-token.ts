import { auth } from "@/lib/adapters/auth/server";

/** Match the Clerk/Convex client integration without depending on a legacy template. */
export async function getConvexAuthToken(): Promise<string | null> {
  try {
    const { userId, sessionClaims, getToken } = await auth();
    if (!userId) return null;

    // These claims come from Clerk's verified server session, not request input.
    // Convex still validates the token's signature, issuer and audience.
    const audience = sessionClaims?.aud;
    const usesIntegration =
      audience === "convex" ||
      (Array.isArray(audience) && audience.includes("convex"));
    return usesIntegration
      ? await getToken()
      : await getToken({ template: "convex" });
  } catch {
    // Provider errors can carry session identifiers and must not reach callers/logs.
    throw new Error("Convex authentication is temporarily unavailable");
  }
}
