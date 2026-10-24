import { NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import {
  computePrivacyInventoryCounts,
  getLatestPrivacyInventorySnapshot,
} from "@/lib/privacy/inventory";

export async function GET(request?: Request) {
  const { userId, businessId } = await resolveAuthContext(request);
  if (!userId || !businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [counts, latest] = await Promise.all([
      computePrivacyInventoryCounts(businessId),
      getLatestPrivacyInventorySnapshot(businessId),
    ]);

    return NextResponse.json({
      counts,
      latest_snapshot: latest,
      last_snapshot_at: latest?.captured_at ?? null,
    });
  } catch (error) {
    console.error("[privacy/inventory]", error);
    return NextResponse.json(
      { error: "Failed to load inventory counts" },
      { status: 500 },
    );
  }
}
