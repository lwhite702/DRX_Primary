import { NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { capturePrivacyInventorySnapshot } from "@/lib/privacy/inventory";

export async function POST() {
  const { userId, businessId } = await resolveAuthContext();
  if (!userId || !businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await capturePrivacyInventorySnapshot(businessId);

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
