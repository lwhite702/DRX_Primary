import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { customerCreditName, initialCreditLine } = body;

    // Get Business ID (Owner context)
    const { data: businesses } = await supabase
      .from("business_profile")
      .select("id")
      .eq("owner_id", user.id)
      .limit(1);

    const businessId = businesses?.[0]?.id;
    if (!businessId) {
      return NextResponse.json({ error: "No business found" }, { status: 400 });
    }

    // Create Customer
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .insert({
        business_id: businessId,
        first_name: customerCreditName,
        last_name: "CreditTest",
        email: `test-${Date.now()}-${Math.random()}@example.com`,
        is_active: true,
      })
      .select()
      .single();

    if (customerError) {
      return NextResponse.json(
        { error: "Failed to create customer", details: customerError },
        { status: 500 },
      );
    }

    // Create Credit Limit
    const { data: credit, error: creditError } = await supabase
      .from("credit_limits")
      .insert({
        business_id: businessId,
        customer_id: customer.id,
        max_credit_limit: initialCreditLine,
        current_balance: 0,
      })
      .select()
      .single();

    if (creditError) {
      return NextResponse.json(
        { error: "Failed to create credit limit", details: creditError },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        id: credit.id,
        creditLine: credit.max_credit_limit,
        balance: credit.current_balance,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
