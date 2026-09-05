import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@/lib/adapters/auth/server";
import {
  syncCreatedClerkUser,
  type ClerkCreatedUserPayload,
} from "@/lib/auth/clerk-user-sync";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  // You can find this in the Clerk Dashboard -> Webhooks -> choose the webhook
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local",
    );
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured", {
      status: 400,
    });
  }

  // Handle the event
  const eventType = evt.type;

  try {
    if (eventType === "user.created") {
      await syncCreatedClerkUser(
        evt.data as unknown as ClerkCreatedUserPayload,
      );
    }

    if (eventType === "organization.created") {
      const { id, name, created_by } = evt.data;

      // When a user creates a real Org in Clerk, we create/sync a BusinessProfile
      // Ensure created_by is a string (it should be for user-created orgs)
      if (created_by) {
        await prisma.businessProfile.create({
          data: {
            clerkOrgId: id,
            businessName: name,
            ownerId: created_by, // Clerk User ID
          },
        });
      }

      // Note: We might need to move the User to this new Tenant or allow multiple tenants (via mapping table).
      // Since our Schema strictly links User -> Tenant (1:1), this implies "One User per Tenant".
      // If Clerk allows multiple Orgs, our strict 1:1 schema might be too limiting.
      // User requested "Multi-Tenant", often implies Users can be in multiple tenants.
      // But for now, we follow the schema: User belongs to Tenant.
    }

    if (
      eventType === "session.created" ||
      eventType === "session.ended" ||
      eventType === "session.removed" ||
      eventType === "session.revoked"
    ) {
      const sessionData = evt.data as unknown as Record<string, unknown>;
      const latestActivity =
        sessionData.latest_activity &&
        typeof sessionData.latest_activity === "object"
          ? (sessionData.latest_activity as Record<string, unknown>)
          : {};
      const userId = sessionData.user_id || sessionData.userId;
      const sessionId = sessionData.id || sessionData.session_id;

      if (userId && sessionId) {
        await prisma.authSessionEvent.create({
          data: {
            userId,
            sessionId,
            eventType,
            ipAddress: latestActivity.ip_address || sessionData.ip_address || null,
            userAgent:
              latestActivity.user_agent ||
              sessionData.user_agent ||
              null,
            deviceType:
              latestActivity.device_type ||
              sessionData.device_type ||
              null,
            city: latestActivity.city || sessionData.city || null,
            country: latestActivity.country || sessionData.country || null,
            metadata: sessionData,
          },
        });
      }
    }

    // Additional events: organizationMembership.created to sync roles/invites.
  } catch (error) {
    console.error("Clerk webhook handler failed", {
      eventType,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return new Response("Webhook handler failed", { status: 500 });
  }

  return new Response("", { status: 200 });
}
