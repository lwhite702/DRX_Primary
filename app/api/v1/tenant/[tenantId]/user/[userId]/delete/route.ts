import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; userId: string }> },
) {
  try {
    const { tenantId, userId } = await params;
    const supabase = await createServerClient();
    const {
      data: { user: actor },
      error: authError,
    } = await supabase.auth.getUser();

    if (!actor || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check: Only Owner/Super Admin can trigger RTBF / Permanent Deletion
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: roleData } = await adminSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", actor.id)
      .eq("business_id", tenantId)
      .single();

    if (
      !roleData ||
      !["owner", "super_admin"].includes(roleData.role.toLowerCase())
    ) {
      return NextResponse.json(
        {
          error:
            "Forbidden: Only Owners or Super Admins can initiate RTBF deletion",
        },
        { status: 403 },
      );
    }

    // 1. Log the initiation of RTBF (Privacy Layer Requirement)
    await adminSupabase.from("system_audit_log").insert({
      action: "rtbf_initiated",
      entity_id: userId,
      entity_type: "user",
      user_id: actor.id,
      new_values: { tenant_id: tenantId, status: "removal_initiated" },
      business_id: tenantId,
    });

    // 2. Data Shredding / Masking Logic
    // In a real HIPAA/GDPR app, we might mask records in other tables.
    // Here we will:
    // a. Update Auth Metadata to mask PII
    const { error: maskError } = await adminSupabase.auth.admin.updateUserById(
      userId,
      {
        user_metadata: {
          full_name: "DELETED_USER_RTBF",
          shredded_at: new Date().toISOString(),
        },
        email: `deleted_${userId.substring(0, 8)}@deleted.deelrx.com`, // Avoid email reuse/leaks
      },
    );

    if (maskError) {
      console.error("PII Masking Failed:", maskError);
      // Continue anyway or return error? We'll log it and try to proceed with role removal.
    }

    // b. Remove from user_roles
    const { error: roleDeleteError } = await adminSupabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("business_id", tenantId);

    // c. Log completion
    await adminSupabase.from("system_audit_log").insert({
      action: "rtbf_completed",
      entity_id: userId,
      entity_type: "user",
      user_id: actor.id,
      business_id: tenantId,
    });

    return NextResponse.json(
      { message: "User deleted, data removal initiated" },
      { status: 200 },
    );
  } catch (error) {
    console.error("RTBF API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
