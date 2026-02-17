import { type NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const supabase = await createServerClient();
  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (!user || authError) return NextResponse.json({}, { status: 401 });

  const { data, error } = await supabase
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
