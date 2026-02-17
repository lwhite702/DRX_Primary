import { type NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (!user || authError) return NextResponse.json({}, { status: 401 });

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit Log
  await supabase.from("system_audit_log").insert({
    action: "delete_alert",
    actor_id: user.id,
    resource_type: "notification",
    resource_id: id,
    details: { notificationId: id },
  });

  return NextResponse.json({}, { status: 200 });
}
