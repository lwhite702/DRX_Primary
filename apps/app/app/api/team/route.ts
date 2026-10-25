import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { clerkClient } from "@/lib/adapters/auth/server";
import { teamClient, teamFailure } from "./_lib/convex-server";

export async function GET(request: NextRequest) {
  try {
    const { client, ...context } = await teamClient(request);
    const cursor = request.nextUrl.searchParams.get("cursor");
    const result = await client.query(api.teamManagement.listTeamMembers, { ...context, paginationOpts: { cursor, numItems: 100 } });

    let clerk: any = null;
    const enrichedPage = await Promise.all(
      result.page.map(async (member) => {
        let email = member.email;
        let name = member.name;
        if (!email || !email.trim() || !name) {
          try {
            if (!clerk) {
              const clientInstance = await clerkClient();
              clerk = clientInstance?.users ? clientInstance : null;
            }
            if (clerk?.users?.getUser) {
              const clerkUser = await clerk.users.getUser(member.user_id);
              if (clerkUser) {
                const clerkEmail = clerkUser.emailAddresses?.find((e: any) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress || "";
                const clerkName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || clerkUser.username || null;
                if (clerkEmail && (!email || !email.trim())) email = clerkEmail;
                if (clerkName && !name) name = clerkName;

                if (clerkEmail || clerkName) {
                  client.mutation(api.teamManagement.reconcileTeamMemberProfile, {
                    ...context,
                    clerkUserId: member.user_id,
                    email: clerkEmail || undefined,
                    name: clerkName || undefined,
                  }).catch(() => {});
                }
              }
            }
          } catch {
            // Graceful fallback if Clerk lookup fails
          }
        }
        return {
          ...member,
          email,
          name,
          created_at: new Date(member.created_at).toISOString(),
          updated_at: new Date(member.updated_at).toISOString(),
        };
      })
    );

    return NextResponse.json(
      {
        success: true,
        data: enrichedPage,
        nextCursor: result.isDone ? null : result.continueCursor,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) { return teamFailure(error); }
}
