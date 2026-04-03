import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { db } from "@/lib/db";
import { capturePrivacyInventorySnapshot } from "@/lib/privacy/inventory";
import { extractPrivacyProtocol, withPrivacyProtocol } from "@/lib/privacy/settings";

export async function POST() {
  const { userId, businessId } = await resolveAuthContext();
  if (!userId || !businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await capturePrivacyInventorySnapshot(businessId);

    const settings = await db.businessSettings.findFirst({
      where: { businessId },
      select: { id: true, settingsData: true },
    });

    if (settings?.id) {
      const privacyProtocol = extractPrivacyProtocol(settings.settingsData);
      await db.businessSettings.update({
        where: { id: settings.id },
        data: {
          settingsData: withPrivacyProtocol(settings.settingsData, {
            ...privacyProtocol,
            inventory_monitoring: {
              ...privacyProtocol.inventory_monitoring,
              last_snapshot_at: snapshot.captured_at,
            },
          }) as Prisma.InputJsonValue,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      snapshot,
      last_snapshot_at: snapshot.captured_at,
    });
  } catch (error) {
    console.error("[privacy/inventory/refresh]", error);
    return NextResponse.json(
      { error: "Failed to refresh inventory snapshot" },
      { status: 500 },
    );
  }
}
