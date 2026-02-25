import { type NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { userId, preferences } = body;

  const adminSupabase = createServiceRoleClient();

  // Check if userId matches caller or if caller is admin/manager?
  // Using Admin Supabase to upsert
  const { error } = await adminSupabase
    .from("notification_preferences")
    .upsert({ user_id: userId, preferences: preferences });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ userId, preferences }, { status: 201 });
}
