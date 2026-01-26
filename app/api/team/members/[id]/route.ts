import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();
  // We need Admin client to fetch user details if RLS hides them
  // Or use service role if needed.
  // For GET member, usually Manager checks.

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await adminSupabase.auth.admin.getUserById(id);

  if (error || !data.user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Fetch role
  const { data: roleData } = await adminSupabase
    .from("user_roles")
    .select("role")
    .eq("user_id", id)
    .single();

  return NextResponse.json({
    id: data.user.id,
    email: data.user.email,
    role: roleData?.role,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Audit Log
  await adminSupabase.from("system_audit_log").insert({
    action: "delete_member",
    entity_id: id,
    actor_id: user.id,
    resource_type: "team_member",
    resource_id: id,
  });

  // Delete User (Cascade usually deletes roles, but verify)
  const { error } = await adminSupabase.auth.admin.deleteUser(id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({}, { status: 204 });
}
