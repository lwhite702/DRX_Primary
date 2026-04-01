import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveAuthContext } from "../../pos/_lib/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { userId, businessId } = await resolveAuthContext();
    if (!userId || !businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customerId = params.id;

    const customer = await (db.customers as any).findFirst({
      where: { id: customerId, businessId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );
    }

    // Fetch metrics from view
    let metrics = null;
    try {
      const metricsData = await db.$queryRaw`
        SELECT 
          sales_30d, sales_90d, sales_all_time, 
          credit_issued_30d, credit_issued_90d, 
          current_credit_balance, on_time_repayment_ratio, 
          late_payment_count 
        FROM v_credit_analytics 
        WHERE customer_id = ${customerId}::uuid
        LIMIT 1
      `;

      if (Array.isArray(metricsData) && metricsData.length > 0) {
        metrics = metricsData[0];
      }
    } catch (e) {
      console.warn("Could not fetch analytics view:", e);
    }

    return NextResponse.json({
      ...customer,
      total_purchases: Number(customer.totalPurchases || 0),
      total_credit_used: Number(customer.totalCreditUsed || 0),
      metrics,
    });
  } catch (error) {
    console.error("GET Customer Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleUpdate(request, params.id);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleUpdate(request, params.id);
}

async function handleUpdate(request: NextRequest, customerId: string) {
  try {
    const { userId, businessId } = await resolveAuthContext();
    if (!userId || !businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const customer = await (db.customers as any).findFirst({
      where: { id: customerId, businessId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );
    }

    const updated = await (db.customers as any).update({
      where: { id: customerId },
      data: {
        firstName: body.firstName || body.first_name || customer.firstName,
        lastName: body.lastName || body.last_name || customer.lastName,
        email: body.email !== undefined ? body.email : customer.email,
        phoneNumber:
          body.phoneNumber ||
          body.phone_number ||
          body.phone ||
          customer.phoneNumber,
        address: body.address !== undefined ? body.address : customer.address,
        city: body.city !== undefined ? body.city : customer.city,
        state: body.state !== undefined ? body.state : customer.state,
        zipCode: body.zipCode || body.zip_code || customer.zipCode,
        customerType:
          body.customerType || body.customer_type || customer.customerType,
        fixedPricePerGram:
          body.fixedPricePerGram !== undefined
            ? body.fixedPricePerGram
            : body.fixed_price_per_gram !== undefined
              ? body.fixed_price_per_gram
              : customer.fixedPricePerGram,
        notes: body.notes !== undefined ? body.notes : customer.notes,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update Customer Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
