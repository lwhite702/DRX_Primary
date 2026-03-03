import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";

export async function GET(request: NextRequest) {
  try {
    const { businessId } = await resolveAuthContext();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Since there is no specific RPC for delivery options yet (it was a direct table select),
    // we use Prisma to fetch from the table.
    const options = await db.delivery_management.findMany({
      where: {
        businessId,
        isActive: true,
      },
    });

    return NextResponse.json(options);
  } catch (error: any) {
    console.error("Delivery Options Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
