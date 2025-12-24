import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get business_id from query params or user's role context
    // Ideally we pass it in query param to be explicit, but for now let's derive from user_roles
    // assuming single business context for simplicity, or we check permissions.
    const { searchParams } = new URL(request.url);
    let business_id = searchParams.get("business_id");

    if (!business_id) {
      // Fallback: get from user_roles
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("business_id")
        .eq("user_id", user.id)
        .single();

      if (userRole) {
        business_id = userRole.business_id;
      }
    }

    if (!business_id) {
      return NextResponse.json(
        { error: "Business ID required" },
        { status: 400 }
      );
    }

    // 3. Verify permissions (manager/owner)
    // We can rely on RLS policies implicitly if we were doing a direct select,
    // but since we are doing admin work here, we should explicit check.
    const { data: roleCheck } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
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
    const userIds = teamRoles.map((r) => r.user_id);

    // Unfortunately listUsers usually doesn't take a filter by ID list efficiently in all versions,
    // but we can iterate or fetch page by page.
    // Optimization: If listUsers supports filters, good. If not, and list is small, list all?
    // Better: getUserById in parallel? No, rate limits.
    // Assuming small team for now.

    // Actually, createClient (admin) generally doesn't expose a "getUsersByIds" easily.
    // We will assume the team is small (< 50) and just map over them with getUser, or listUsers.
    // Ideally: admin.auth.admin.listUsers() returns all.

    // Let's use Promise.all for getUserById for accurate data, capped at 20 concurrent?
    const userDetailsMap = new Map();

    // Batch fetch (naive)
    const promises = userIds.map(async (uid) => {
      const { data: uData, error: uError } =
        await supabaseAdmin.auth.admin.getUserById(uid);
      if (uData && uData.user) {
        return { id: uid, email: uData.user.email, phone: uData.user.phone };
      }
      return null;
    });

    const userDetails = await Promise.all(promises);

    // 6. Merge Data
    const enrichedTeam = teamRoles.map((member) => {
      const details = userDetails.find((u) => u && u.id === member.user_id);
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
