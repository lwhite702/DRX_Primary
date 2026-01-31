import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user || authError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use Service Role for Admin actions
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Get Caller Role and Business Context
  const { data: roleData } = await adminSupabase
    .from("user_roles")
    .select("role, business_id")
    .eq("user_id", user.id)
    .single();

  if (
    !roleData ||
    !["manager", "owner", "super_admin"].includes(roleData.role.toLowerCase())
  ) {
    return NextResponse.json(
      { error: "Forbidden: Insufficient permissions" },
      { status: 403 },
    );
  }

  const businessId = roleData.business_id;
  const body = await request.json();
  const { role } = body;

  // Enforce Role Hierarchy
  const callerRole = roleData.role.toLowerCase();
  const targetRole = role.toLowerCase();

  if (
    callerRole === "manager" &&
    ["owner", "super_admin"].includes(targetRole)
  ) {
    return NextResponse.json(
      { error: "Managers cannot assign Owner or Super Admin roles" },
      { status: 403 },
    );
  }

  const { error } = await adminSupabase
    .from("user_roles")
    .update({ role: role })
    .eq("user_id", id)
    .eq("business_id", businessId); // Ensure scoped update

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit Log (Updated for isolation and consistency)
  await adminSupabase.from("system_audit_log").insert({
    action: "role_update",
    entity_id: id,
    user_id: user.id,
    new_values: { new_role: role },
    entity_type: "team_member",
    business_id: businessId,
  });

  return NextResponse.json({ id, role }, { status: 200 });
}
