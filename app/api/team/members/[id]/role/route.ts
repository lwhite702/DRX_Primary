import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user || authError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify Caller Role
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: callerRole } = await adminSupabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!callerRole || !["manager", "owner", "admin"].includes(callerRole.role)) {
    return NextResponse.json(
      { error: "Forbidden: Insufficient permissions" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const { role } = body;

  const { error } = await adminSupabase
    .from("user_roles")
    .update({ role: role })
    .eq("user_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit Log
  await adminSupabase.from("system_audit_log").insert({
    action: "role_update",
    entity_id: id,
    actor_id: user.id,
    details: { new_role: role },
    resource_type: "team_member",
    resource_id: id,
  });

  return NextResponse.json({ id, role }, { status: 200 });
}
