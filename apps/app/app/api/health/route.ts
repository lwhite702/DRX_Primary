import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export const dynamic = "force-dynamic";

function isAuthorizedProbe(request?: Request): boolean {
  const secret = process.env.HEALTHCHECK_SECRET?.trim();
  const vercelBypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();

  // When no machine-auth secret is configured, allow the probe under the minimal non-sensitive public health policy.
  if (!secret && !vercelBypassSecret) {
    return true;
  }

  if (!request) {
    return false;
  }

  // Check Bearer token in Authorization header
  const authHeader = request.headers.get("authorization")?.trim();
  if (secret && (authHeader === `Bearer ${secret}` || authHeader === secret)) {
    return true;
  }

  // Check x-readiness-token or x-healthcheck-token header
  const tokenHeader =
    request.headers.get("x-readiness-token")?.trim() ||
    request.headers.get("x-healthcheck-token")?.trim();
  if (secret && tokenHeader === secret) {
    return true;
  }

  // Check Vercel protection bypass header
  const bypassHeader = request.headers.get("x-vercel-protection-bypass")?.trim();
  if (vercelBypassSecret && bypassHeader === vercelBypassSecret) {
    return true;
  }

  return false;
}

function getValidConvexUrl(): string {
  const rawUrl = (process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL)?.trim();
  if (!rawUrl) {
    throw new Error("Convex unavailable");
  }

  const parsed = new URL(rawUrl);
  const isLocalDev =
    process.env.NODE_ENV !== "production" &&
    (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost");

  if (!isLocalDev && parsed.protocol !== "https:") {
    throw new Error("Convex URL must use HTTPS in production");
  }

  if (!isLocalDev && !parsed.hostname.includes(".")) {
    throw new Error("Invalid Convex hostname");
  }

  return parsed.toString();
}

function createTimeoutSignal(ms: number): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer),
  };
}

export async function GET(request?: Request) {
  if (!isAuthorizedProbe(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const checks = {
    database: false,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
  try {
    const url = getValidConvexUrl();
    const { signal, cleanup } = createTimeoutSignal(10000);
    try {
      const client = new ConvexHttpClient(url, {
        logger: false,
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            signal,
            cache: "no-store",
          }),
      });
      checks.database = (await client.query(api.health.readiness, {})) === true;
    } finally {
      cleanup();
    }
  } catch {
    // Readiness responses must not disclose backend URLs, errors or tenant data.
    checks.database = false;
  }
  return NextResponse.json(
    { status: checks.database ? "healthy" : "unhealthy", checks },
    {
      status: checks.database ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

