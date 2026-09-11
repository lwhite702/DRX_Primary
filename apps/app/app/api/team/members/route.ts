import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@/lib/adapters/auth/server";
import { api } from "@/convex/_generated/api";
import { normalizeTeamRole } from "@/lib/team/roles";
import { teamClient, teamFailure } from "../_lib/convex-server";

export async function POST(request: NextRequest) {
  try {
    const { client, ...context } = await teamClient(request);
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("INVALID_ARGUMENT: Invalid request");
    const payload = body as Record<string, unknown>;
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    const role = normalizeTeamRole(payload.role ?? "cashier");
    if (!role || name.length > 255) throw new Error("INVALID_ARGUMENT: Invalid invitation");
    // Persist authorization, duplicate protection and the token before contacting Clerk.
    const prepared = await client.mutation(api.teamManagement.prepareTeamInvitation, { ...context, email, role });
    let providerInvitationId: string | undefined;
    try {
      const clerk = await clerkClient();
      const invitation = await clerk.invitations.createInvitation({
        emailAddress: prepared.email, expiresInDays: 7, ignoreExisting: false, notify: true,
        publicMetadata: { drxBusinessId: context.businessId, drxInviteToken: prepared.token, drxRole: prepared.role, drxInvitedBy: context.expectedUserId, ...(name ? { drxInvitedName: name } : {}) },
      });
      providerInvitationId = invitation.id;
      await client.mutation(api.teamManagement.recordTeamInvitationDelivery, { ...context, inviteId: prepared.inviteId, providerInvitationId });
    } catch {
      // A timeout may occur after Clerk has sent the invitation. Retain the canonical
      // record and block another send until delivery is reconciled, even if recording fails.
      let receiptRecovered = false;
      try {
        await client.mutation(api.teamManagement.recordTeamInvitationDelivery, { ...context, inviteId: prepared.inviteId, ...(providerInvitationId ? { providerInvitationId } : {}) });
        receiptRecovered = Boolean(providerInvitationId);
      } catch { /* PREPARED remains a durable reconciliation marker. */ }
      if (!receiptRecovered) return NextResponse.json({ error: "Invitation delivery needs verification before retrying" }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
    }
    return NextResponse.json({ id: providerInvitationId, email: prepared.email, role: prepared.role, status: "pending", expiresAt: new Date(prepared.expiresAt).toISOString() }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return teamFailure(error); }
}
