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
    const { customerCreditId, type, amount, description } = body;

    // Get Credit Limit to derive context
    const { data: credit, error: creditFetchError } = await supabase
      .from("credit_limits")
      .select("*")
      .eq("id", customerCreditId)
      .single();

    if (creditFetchError || !credit) {
      return NextResponse.json(
        { error: "Credit Limit not found" },
        { status: 404 },
      );
    }

    // Insert Transaction
    const { data: transaction, error: transError } = await supabase
      .from("credit_transactions")
      .insert({
        business_id: credit.business_id,
        customer_id: credit.customer_id,
        created_by: user.id,
        transaction_type: type,
        amount: amount,
        description: description,
        status: "completed",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (transError) {
      return NextResponse.json(
        { error: "Failed to create transaction", details: transError },
        { status: 500 },
      );
    }

    // Update Balance (Simplistic: Add amount. Adjust logic if 'debit' subtracts)
    let newBalance = Number(credit.current_balance);
    if (type === "credit") {
      newBalance += Number(amount);
    } else {
      newBalance -= Number(amount);
    }

    const { error: updateError } = await supabase
      .from("credit_limits")
      .update({
        current_balance: newBalance,
      })
      .eq("id", customerCreditId);

    if (updateError) {
      console.error("Balance update failed", updateError);
    }

    return NextResponse.json(
      {
        ...transaction,
        type: transaction.transaction_type, // Map for test compatibility
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const customerCreditId = searchParams.get("customerCreditId");

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!customerCreditId) {
      return NextResponse.json(
        { error: "Missing customerCreditId" },
        { status: 400 },
      );
    }

    // Resolve credit info to get customer_id
    const { data: credit, error: creditError } = await supabase
      .from("credit_limits")
      .select("customer_id")
      .eq("id", customerCreditId)
      .single();

    if (creditError || !credit) {
      return NextResponse.json(
        { error: "Credit Limit not found" },
        { status: 404 },
      );
    }

    const { data: transactions, error } = await supabase
      .from("credit_transactions")
      .select("*")
      .eq("customer_id", credit.customer_id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch transactions", details: error },
        { status: 500 },
      );
    }

    // Map response
    const mapped = transactions.map((t) => ({
      ...t,
      type: t.transaction_type,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
