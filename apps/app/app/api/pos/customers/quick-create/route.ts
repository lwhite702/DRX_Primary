import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cleanPhone, resolveAuthContext } from "@/app/api/pos/_lib/server";

export async function POST(request: NextRequest) {
  const { businessId } = await resolveAuthContext();

  if (!businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { phone?: string; alias?: string };
  const phone = cleanPhone(body.phone || "");
  const alias = (body.alias || "").trim();

  if (!phone) {
    return NextResponse.json({ error: "Phone is required" }, { status: 400 });
  }

  const existing = await db.customers.findFirst({
    where: {
      businessId,
      phoneNumber: phone,
      isActive: true,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
    },
  });

  if (existing) {
    return NextResponse.json({
      id: existing.id,
      phone: existing.phoneNumber || phone,
      alias: `${existing.firstName} ${existing.lastName}`.trim(),
      remainingCredit: 0,
    });
  }

  const name = alias || `Customer ${phone.slice(-4)}`;
  const [firstName, ...rest] = name.split(" ");

  const created = await db.customers.create({
    data: {
      businessId,
      firstName: firstName || "Customer",
      lastName: rest.join(" ") || "POS",
      phoneNumber: phone,
      customerType: "retail",
      isActive: true,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
    },
  });

  return NextResponse.json(
    {
      id: created.id,
      phone: created.phoneNumber || phone,
      alias: `${created.firstName} ${created.lastName}`.trim(),
      remainingCredit: 0,
    },
    { status: 201 },
  );
}
