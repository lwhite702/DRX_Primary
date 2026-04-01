import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveAuthContext, toNumber } from "@/app/api/pos/_lib/server";
import { decodeCustomerPii, getCustomerDisplayName } from "@/lib/privacy/customer-pii";
import { hashLookupValue } from "@/lib/privacy/crypto";

function cleanPhone(value: string) {
  return value.replace(/[^0-9]/g, "");
}

export async function GET(request: NextRequest) {
  const { businessId } = await resolveAuthContext();

  if (!businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const phoneRaw = new URL(request.url).searchParams.get("phone") || "";
  const phone = cleanPhone(phoneRaw);

  if (!phone) {
    return NextResponse.json({ items: [] });
  }

  let phoneHash: string | null = null;
  try {
    phoneHash = await hashLookupValue(phone);
  } catch (error) {
    console.warn("[privacy] phone hash lookup unavailable", error);
  }

  const customers = await db.customers.findMany({
    where: {
      businessId,
      isActive: true,
      OR: [
        ...(phoneHash ? [{ phoneHash }] : []),
        { phoneNumber: { contains: phone } },
      ],
    },
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      alias: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
      aliasEncrypted: true,
      firstNameEncrypted: true,
      phoneEncrypted: true,
      emailEncrypted: true,
      addressEncrypted: true,
      notesEncrypted: true,
      email: true,
      address: true,
      notes: true,
      creditLimits: {
        where: { businessId },
        take: 1,
        select: {
          maxCreditLimit: true,
          currentBalance: true,
        },
      },
    },
  });

  const items = await Promise.all(
    customers.map(async (customer) => {
      const pii = await decodeCustomerPii(customer as unknown as Record<string, unknown>);
      const limit = customer.creditLimits[0];
      const remainingCredit = limit
        ? Math.max(0, toNumber(limit.maxCreditLimit) - toNumber(limit.currentBalance))
        : 0;

      return {
        id: customer.id,
        phone: pii.phone || "",
        alias: getCustomerDisplayName(pii),
        remainingCredit,
      };
    }),
  );

  return NextResponse.json({ items });
}
