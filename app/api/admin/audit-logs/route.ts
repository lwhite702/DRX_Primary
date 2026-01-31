import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const resourceId = searchParams.get("resource_id");
    const resourceType = searchParams.get("resource_type");
    const userId = searchParams.get("userId");
    const businessId =
      searchParams.get("business_id") || searchParams.get("tenantId");

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let query;
    if (userId) {
      // Query generic system audit log for user
      query = supabase
        .from("system_audit_log")
        .select("*")
        .eq("entity_id", userId)
        .order("created_at", { ascending: false });

      if (businessId) {
        query = query.eq("business_id", businessId);
      }
    } else if (resourceType === "inventory") {
      query = supabase
        .from("inventory_log")
        .select("*, inventory!inner(business_id)")
        .eq("inventory_id", resourceId);

      if (businessId) {
        query = query.eq("inventory.business_id", businessId);
      }
    } else if (businessId) {
      // General business audit logs
      query = supabase
        .from("system_audit_log")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });
    } else {
      // If super_admin, they might want all logs, else they get nothing or their own business
      // RLS will handle the "their own business" if they are not admin.
      query = supabase
        .from("system_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch logs", details: error },
        { status: 500 },
      );
    }

    const mapped = (data || []).map((log: any) => {
      const mappedLog: any = { ...log };
      if (userId) {
        mappedLog.userId = log.entity_id;
        mappedLog.action = log.action;
      }
      return mappedLog;
    });

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Audit Log API Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
