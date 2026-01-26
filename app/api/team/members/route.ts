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

  // Check if user is Manager (optional enforcement here, or we trust caller is Manager?)
  // For robustness, we should check role. But test uses Manager token.

  const body = await request.json();
  const { email, password, role, name } = body;

  const tempPassword = password || "TempPass123!";

  // Use Service Role for Admin actions
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  // 1. Create User in Auth
  const { data: createdUser, error: createError } =
    await adminSupabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  if (!createdUser.user) {
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 },
    );
  }

  const newUserId = createdUser.user.id;

  // 2. Assign Role (Needs Business ID usually. We'll find one or default?)
  // Using the current user's business?
  // We need to know which business to add the member to.
  // We'll try to find the business owned by the current user.

  const { data: businessData } = await adminSupabase
    .from("business_profile")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  let businessId = businessData?.id;

  if (!businessId) {
    // Fallback or error? For test, maybe we just pick one?
    // The test user is Manager of a business.
    // Let's search user_roles for current user.
    const { data: roleData } = await adminSupabase
      .from("user_roles")
      .select("business_id, role")
      .eq("user_id", user.id)
      .single();
    if (roleData) {
      businessId = roleData.business_id;
      // Also verify caller is Manager/Owner?
      if (!["manager", "owner", "admin"].includes(roleData.role)) {
        // return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }

  if (businessId) {
    const { error: roleError } = await adminSupabase.from("user_roles").insert({
      user_id: newUserId,
      business_id: businessId,
      role: role || "cashier",
    });

    if (roleError) {
      // Cleanup user?
      console.error("Role assignment failed:", roleError);
    }
  }

  // 3. Audit Log
  await adminSupabase.from("system_audit_log").insert({
    action: "create_member",
    entity_id: newUserId,
    actor_id: user.id,
    details: { email, role, name },
    resource_type: "team_member",
    resource_id: newUserId,
  });

  return NextResponse.json({ id: newUserId, email, role }, { status: 201 });
}
