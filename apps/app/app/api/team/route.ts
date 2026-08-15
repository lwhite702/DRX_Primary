import { NextRequest, NextResponse } from "next/server";
import { createLegacyServerDbClient as createServerDbClient } from "@/lib/data-access/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";

export async function GET(request: NextRequest) {
  try {
    const { userId, businessId } = await resolveAuthContext(request);
    if (!userId || !businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createServerDbClient();
    // 2. Use resolved business context and validate caller is a team member.
    const business_id = businessId;

    // 3. Verify permissions (manager/owner)
    // We can rely on RLS policies implicitly if we were doing a direct select,
    // but since we are doing admin work here, we should explicit check.
    const { data: roleCheck } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("business_id", business_id)
      .single();

    // Allow managers, admins, owners, supervisors to view list?
    // "staff.manage" permission usually needed.
    // For now, let's allow any member to view the list (read-only), but only managers see actions in UI.
    if (!roleCheck) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // 4. Fetch User Roles for the business
    const { data: teamRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("*")
      .eq("business_id", business_id)
      .order("created_at", { ascending: false });

    if (rolesError) {
      throw rolesError;
    }

    // 5. Fetch User Details (Emails) from Auth via Admin Client
    const userIds = teamRoles.map((r: { user_id: string }) => r.user_id);

    // Unfortunately listUsers usually doesn't take a filter by ID list efficiently in all versions,
    // but we can iterate or fetch page by page.
    // Optimization: If listUsers supports filters, good. If not, and list is small, list all?
    // Better: getUserById in parallel? No, rate limits.
    // Assuming small team for now.

    // Actually, createClient (admin) generally doesn't expose a "getUsersByIds" easily.
    // We will assume the team is small (< 50) and just map over them with getUser, or listUsers.
    // Ideally: admin.auth.admin.listUsers() returns all.

    // Let's use Promise.all for getUserById for accurate data, capped at 20 concurrent?
    // Batch fetch (naive)
    const promises = userIds.map(async (uid: string) => {
      const { data: uData } =
        await supabaseAdmin.auth.admin.getUserById(uid);
      if (uData && uData.user) {
        return { id: uid, email: uData.user.email, phone: uData.user.phone };
      }
      return null;
    });

    const userDetails = await Promise.all(promises);

    // 6. Merge Data
    const enrichedTeam = teamRoles.map((member: { user_id: string }) => {
      const details = userDetails.find((u: { id: string } | null) => u && u.id === member.user_id);
      return {
        ...member,
        email: details?.email || "Unknown",
        phone: details?.phone || "",
      };
    });

    return NextResponse.json({ success: true, data: enrichedTeam });
  } catch (error) {
    console.error("Team API Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
