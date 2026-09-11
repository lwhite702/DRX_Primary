import { ConvexHttpClient } from "convex/browser";
import { NextRequest, NextResponse } from "next/server";
import { getConvexAuthToken } from "@/lib/auth/convex-token";

export class IntakeRequestError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}
export async function intakeClient(request: NextRequest) {
  const token = await getConvexAuthToken();
  if (!token) throw new IntakeRequestError("Sign in to manage stock", 401);
  const businessId = request.headers.get("x-business-id") || request.nextUrl.searchParams.get("business_id");
  if (!businessId) throw new IntakeRequestError("Select a business before managing stock");
  const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!url) throw new IntakeRequestError("Stock service is temporarily unavailable", 503);
  const client = new ConvexHttpClient(url);
  client.setAuth(token);
  return { client, businessId };
}
export function moneyCents(value: unknown, field: string, allowZero = false) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new IntakeRequestError(`Check ${field}`);
  const cents = Math.round(value * 100);
  if (!Number.isSafeInteger(cents) || Math.abs(cents - value * 100) > 0.000001 || cents < (allowZero ? 0 : 1)) throw new IntakeRequestError(`Check ${field}; use amounts with up to two decimal places`);
  return cents;
}
export function intakeFailure(error: unknown) {
  if (error instanceof IntakeRequestError) return NextResponse.json({ error: error.message }, { status: error.status });
  const message = error instanceof Error ? error.message : "";
  const codes: [string, number, string][] = [
    ["UNAUTHENTICATED:", 401, "Sign in to manage stock"],
    ["UNAUTHORIZED:", 403, "Your stock workspace is not available"],
    ["FORBIDDEN:", 403, "You do not have permission to manage stock in this business"],
    ["NOT_FOUND:", 404, "The selected product or intake is unavailable; refresh and try again"],
    ["INVALID_STATE:", 409, "Stock records need reconciliation before this change can be saved"],
    ["ALREADY_EXISTS:", 409, "This SKU already exists in this business"],
    ["CONFLICT:", 409, "This request was already submitted or decided. Refresh before trying again"],
    ["INVALID_ARGUMENT:", 400, "Check the intake values and try again"],
    ["ArgumentValidationError", 400, "The selected product or intake is invalid; refresh and try again"],
  ];
  for (const [code, status, safeMessage] of codes) {
    if (message.includes(code)) return NextResponse.json({ error: safeMessage }, { status });
  }
  // Provider errors may contain identifiers and payloads. Do not log or return them.
  return NextResponse.json({ error: "Stock service is temporarily unavailable. Your entry has been kept; retry the same submission." }, { status: 503 });
}
