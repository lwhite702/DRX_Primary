import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Endpoint GET Unauthorized" },
        { status: 401 },
      );
    }

    // Determine business_id
    // 1. Check if user is an owner
    const { data: ownedBusiness } = await supabase
      .from("business_profile")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    let businessId = ownedBusiness?.id;

    // 2. If not owner, check roles
    if (!businessId) {
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("business_id")
        .eq("user_id", user.id)
        .single();
      businessId = userRole?.business_id;
    }

    if (!businessId) {
      return NextResponse.json(
        { error: "Business not found for user" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const search = searchParams.get("search");

    let query = supabase
      .from("inventory")
      .select("*")
      .eq("business_id", businessId)
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (search) {
      query = query.or(`product_name.ilike.%${search}%,sku.ilike.%${search}%`);
    }

    const { data: inventory, error } = await query;

    if (error) {
      console.error("Error fetching inventory:", error);
      return NextResponse.json(
        { error: "Failed to fetch inventory" },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: inventory });
  } catch (error) {
    console.error("Inventory API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Endpoint POST Auth Error:", userError, user);
      return NextResponse.json(
        { error: "Endpoint POST Unauthorized", details: userError, user: user },
        { status: 401 },
      );
    }

    // Determine business_id
    // 1. Check if user is an owner
    const { data: ownedBusiness } = await supabase
      .from("business_profile")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    let businessId = ownedBusiness?.id;

    // 2. If not owner, check roles
    if (!businessId) {
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("business_id")
        .eq("user_id", user.id)
        .single();
      businessId = userRole?.business_id;
    }

    if (!businessId) {
      return NextResponse.json(
        { error: "Business not found for user" },
        { status: 404 },
      );
    }

    // DEBUG RLS check
    console.log("Debug Create Inventory:", { userId: user.id, businessId });
    const { data: accessCheck, error: rpcError } = await supabase.rpc(
      "has_business_access",
      {
        user_id: user.id,
        business_id: businessId,
      },
    );
    console.log("RPC Check:", { accessCheck, rpcError });

    const body = await request.json();
    const {
      sku,
      product_name,
      description,
      category,
      quantity_on_hand,
      reorder_level,
      unit_cost,
      selling_price,
      supplier_id,
    } = body;

    // Validation
    if (!sku || !product_name) {
      return NextResponse.json(
        { error: "SKU and Product Name are required" },
        { status: 400 },
      );
    }

    const { data: newItem, error } = await supabase
      .from("inventory")
      .insert({
        business_id: businessId,
        sku,
        product_name,
        description,
        category,
        quantity_on_hand: quantity_on_hand || 0,
        reorder_level: reorder_level || 10,
        unit_cost,
        selling_price,
        supplier_id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating inventory item:", error);
      if (error.code === "23505") {
        // Unique violation
        return NextResponse.json(
          { error: "SKU already exists for this business" },
          { status: 409 },
        );
      }
      return NextResponse.json(
        {
          error: "Failed to create inventory item",
          details: error,
          rpcCheck: { accessCheck, rpcError },
        },
        { status: 500 },
      );
    }

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error("Inventory API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
