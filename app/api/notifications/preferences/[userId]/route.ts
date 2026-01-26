import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const supabase = createServerClient();
  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (!user || authError) return NextResponse.json({}, { status: 401 });

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await adminSupabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    // Return default or 404? Test expects 200 with data.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    userId: data.user_id,
    preferences: data.preferences,
  });
}
