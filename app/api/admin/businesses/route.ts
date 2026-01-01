import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessName, businessType, ownerEmail } = body;

    // 1. Verify Authentication & Admin Permissions
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: isAdmin, error: adminError } = await supabase.rpc(
      "is_admin",
      { user_id: user.id }
    );

    if (adminError || !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Initialize Service Role Client (for Privileged Operations)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 3. Find Owner by Email
    const {
      data: { users },
      error: listUsersError,
    } = await supabaseAdmin.auth.admin.listUsers();

    if (listUsersError) {
      console.error("List users error:", listUsersError);
      return NextResponse.json(
        { error: "Failed to verify owner email" },
        { status: 500 }
      );
    }

    const owner = users.find((u) => u.email === ownerEmail);

    if (!owner) {
      return NextResponse.json(
        {
          error:
            "User with this email not found. Please ensure they have signed up first.",
        },
        { status: 404 }
      );
    }

    // 4. Create Business Profile
    const { data: business, error: createError } = await supabaseAdmin
      .from("business_profile")
      .insert({
        business_name: businessName,
        business_type: businessType || null,
        owner_id: owner.id,
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      console.error("Create business error:", createError);
      return NextResponse.json(
        { error: "Failed to create business profile: " + createError.message },
        { status: 500 }
      );
    }

    // 5. Assign 'Owner' Role
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      business_id: business.id,
      user_id: owner.id,
      role: "owner",
      permissions: {},
    });

    if (roleError) {
      // Attempt cleanup? For now just log, manual cleanup might be needed or cascading deletes
      console.error("Failed to assign owner role:", roleError);
      return NextResponse.json(
        { error: "Business created but failed to assign owner role" },
        { status: 500 }
      );
    }

    // 6. Create Default Settings
    const { error: settingsError } = await supabaseAdmin
      .from("business_settings")
      .insert({
        business_id: business.id,
        default_tax_rate: 0.08,
        currency: "USD",
        timezone: "America/New_York",
      });

    if (settingsError) {
      console.warn("Failed to create default settings:", settingsError);
    }

    return NextResponse.json({ success: true, business });
  } catch (error) {
    console.error("Create business API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
