import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export type ClerkSignedWebhook = { body: string; svixId: string; svixTimestamp: string; svixSignature: string };
/** Convex independently verifies the signed envelope before its internal membership mutation. */
export async function syncClerkWebhook(envelope: ClerkSignedWebhook): Promise<string> {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!url) throw new Error("Clerk synchronization is temporarily unavailable");
  const client = new ConvexHttpClient(url);
  return client.action(api.clerkWebhooks.handle, envelope);
}

export const syncCreatedClerkUser = syncClerkWebhook;
