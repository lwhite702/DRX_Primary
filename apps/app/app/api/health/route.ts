import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    database: false,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
  try {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
    if (!url) throw new Error("Convex unavailable");
    const client = new ConvexHttpClient(url, {
      logger: false,
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000), cache: "no-store" }),
    });
    checks.database = await client.query(api.health.readiness, {}) === true;
  } catch {
    // Readiness responses must not disclose backend URLs, errors or tenant data.
    checks.database = false;
  }
  return NextResponse.json({ status: checks.database ? "healthy" : "unhealthy", checks }, {
    status: checks.database ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
