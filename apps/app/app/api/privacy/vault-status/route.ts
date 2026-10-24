import { NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { getVaultRuntimeStatus } from "@/lib/privacy/crypto";

export async function GET(request?: Request) {
  const { userId } = await resolveAuthContext(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const status = await getVaultRuntimeStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error("[privacy/vault-status]", error);
    return NextResponse.json(
      { error: "Failed to load vault status" },
      { status: 500 },
    );
  }
}
