import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { createOrAttachCreditCustomer } from "@/lib/customers/core/customer-identity";
import { toNumberSafe } from "@/lib/customers/core/customer-normalizer";

function parseCreditLine(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

export async function POST(request: NextRequest) {
  try {
    const { businessId } = await resolveAuthContext();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const customerCreditName = String(body.customerCreditName || body.customer_name || "").trim();
    const initialCreditLine = parseCreditLine(
      body.initialCreditLine ?? body.initial_credit_line ?? 0,
    );

    if (!customerCreditName) {
      return NextResponse.json(
        { error: "customerCreditName is required" },
        { status: 400 },
      );
    }

    const customer = await createOrAttachCreditCustomer({
      businessId,
      customerName: customerCreditName,
    });

    let credit = await db.creditLimit.findFirst({
      where: {
        businessId,
        customerId: customer.id,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!credit) {
      credit = await db.creditLimit.create({
        data: {
          businessId,
          customerId: customer.id,
          maxCreditLimit: initialCreditLine,
          currentBalance: 0,
        },
      });
    }

    return NextResponse.json(
      {
        id: credit.id,
        customerId: customer.id,
        creditLine: toNumberSafe(credit.maxCreditLimit),
        balance: toNumberSafe(credit.currentBalance),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[credit/customers][POST]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { businessId } = await resolveAuthContext();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customer_id") || searchParams.get("customerId");

    const where = {
      businessId,
      ...(customerId ? { customerId } : {}),
    };

    const rows = await db.creditLimit.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      data: rows.map((row: any) => ({
        id: row.id,
        customerId: row.customerId,
        creditLine: toNumberSafe(row.maxCreditLimit),
        balance: toNumberSafe(row.currentBalance),
      })),
    });
  } catch (error) {
    console.error("[credit/customers][GET]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
