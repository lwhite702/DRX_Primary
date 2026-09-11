import { syncClerkWebhook } from "@/lib/auth/clerk-user-sync";

export async function POST(req: Request) {
  const svixId = req.headers.get("svix-id"), svixTimestamp = req.headers.get("svix-timestamp"), svixSignature = req.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) return new Response("Missing webhook signature", { status: 400 });
  const body = await req.text();
  if (body.length > 256_000) return new Response("Webhook too large", { status: 413 });
  try {
    await syncClerkWebhook({ body, svixId, svixTimestamp, svixSignature });
    return new Response("", { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNAUTHORIZED:")) return new Response("Invalid webhook signature", { status: 400 });
    // Never acknowledge an unpersisted event or log the signed payload.
    return new Response("Webhook processing unavailable", { status: 503 });
  }
}
