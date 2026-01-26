import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { username, email, role } = body;

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Create User
    const { data: newUser, error: createError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password: "TempPassword123!",
        email_confirm: true,
        user_metadata: { username, full_name: username },
      });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    if (!newUser.user) {
      return NextResponse.json(
        { error: "Creation failed (no user returned)" },
        { status: 500 },
      );
    }

    // Assign Role (via user_roles)
    const { data: businesses } = await adminSupabase
      .from("business_profile")
      .select("id")
      .eq("owner_id", user.id)
      .limit(1);

    const businessId = businesses?.[0]?.id;

    if (businessId) {
      await adminSupabase.from("user_roles").insert({
        user_id: newUser.user.id,
        business_id: businessId,
        role: role || "employee",
      });
    }

    // Log to system_audit_log
    await adminSupabase.from("system_audit_log").insert({
      entity_id: newUser.user.id,
      entity_type: "user",
      action: "create_user",
      user_id: user.id,
      new_values: { username, email, role },
    });

    return NextResponse.json({ id: newUser.user.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
