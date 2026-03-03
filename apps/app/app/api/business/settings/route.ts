import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveAuthContext } from "../../pos/_lib/server";

export async function GET() {
  try {
    const { businessId } = await resolveAuthContext();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await (db.businessSettings as any).findFirst({
      where: { businessId },
    });

    if (!settings) {
      return NextResponse.json({
        collect_tax: true,
        pos_manager_pin: "1234",
      });
    }

    return NextResponse.json({
      collect_tax: settings.collectTax,
      pos_manager_pin: settings.posManagerPin,
    });
  } catch (error) {
    console.error("GET Business Settings Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { businessId } = await resolveAuthContext();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { collect_tax, pos_manager_pin } = body;

    const updated = await (db.businessSettings as any).upsert({
      where: { businessId },
      update: {
        collectTax: collect_tax ?? undefined,
        posManagerPin: pos_manager_pin ?? undefined,
      },
      create: {
        businessId,
        collectTax: collect_tax ?? true,
        posManagerPin: pos_manager_pin ?? "1234",
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH Business Settings Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
