import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";

export async function POST(request: NextRequest) {
  try {
    const { userId, businessId } = await resolveAuthContext();
    if (!userId || !businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Call the Postgres enhanced function
    // params: p_business_id, p_customer_id, p_order_type, p_payment_method, p_line_items, p_tax_amount, p_fees, p_delivery_management_id, p_delivery_address, p_delivery_price, p_amount_paid
    const result: any[] = await db.$queryRaw`
      SELECT * FROM process_pos_checkout_enhanced(
        ${businessId}::uuid,
        ${body.customerId || null}::uuid,
        ${body.orderType || "retail"},
        ${body.paymentMethod || "cash"},
        ${JSON.stringify(body.lineItems)}::jsonb,
        ${body.taxAmount || 0}::decimal,
        ${JSON.stringify(body.fees || [])}::jsonb,
        ${body.deliveryManagementId || null}::uuid,
        ${body.deliveryAddress || null},
        ${body.deliveryPrice || 0}::decimal,
        ${body.amountPaid || 0}::decimal,
        ${userId}::uuid
      )
    `;

    if (result && result.length > 0 && result[0].success) {
      return NextResponse.json({
        success: true,
        sale_id: result[0].sale_id,
        order_number: result[0].order_number,
        total_amount: result[0].total_amount,
        change_amount: result[0].change_amount,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: result?.[0]?.error_message || "Checkout failed",
      },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("Enhanced Checkout Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
