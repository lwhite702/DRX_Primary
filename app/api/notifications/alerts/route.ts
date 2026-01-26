import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { userId, type, message, metadata } = body;

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await adminSupabase
    .from("notifications")
    .insert({ user_id: userId, type, message, metadata })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit Log
  await adminSupabase.from("system_audit_log").insert({
    action: "create_alert",
    actor_id: user.id,
    resource_type: "notification",
    resource_id: data.id,
    details: { userId, type, notificationId: data.id },
  });

  return NextResponse.json(
    { notificationId: data.id, userId, message: data.message },
    { status: 201 },
  );
}
