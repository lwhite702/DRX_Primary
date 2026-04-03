import { type NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const NotificationPreferencesSchema = z.object({
  preferences: z.record(z.string(), z.unknown()),
});

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = NotificationPreferencesSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json(
      { error: "Invalid preferences payload", details: payload.error.flatten() },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("notification_preferences")
    .upsert({ user_id: user.id, preferences: payload.data.preferences });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { userId: user.id, preferences: payload.data.preferences },
    { status: 201 },
  );
}
