import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { getConvexAuthToken } from "@/lib/auth/convex-token";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";

async function connection(request: NextRequest) {
  const { businessId, userId } = await resolveAuthContext(request);
  const token = await getConvexAuthToken();
  if (!businessId || !token) throw new Error("UNAUTHORIZED:");
  const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!url) throw new Error("UNAVAILABLE:");
  const client = new ConvexHttpClient(url); client.setAuth(token);
  return { client, businessId, userId };
}
function failure(error: unknown) {
  const text = error instanceof Error ? error.message : "";
  const known: Array<[string, number, string]> = [["REQUEST_CANCELLED:", 409, "This credit request was cancelled"], ["UNAUTHORIZED:", 401, "Unauthorized"], ["FORBIDDEN:", 403, "You do not have access to this credit account"], ["NOT_FOUND:", 404, "Customer is unavailable"], ["INVALID_ARGUMENT:", 400, "Invalid credit transaction"], ["IDEMPOTENCY_CONFLICT:", 409, "This request key was already used for a different transaction"], ["CREDIT_LIMIT_EXCEEDED:", 409, "Credit limit exceeded"], ["PAYMENT_ERROR:", 409, "Payment exceeds outstanding credit"], ["INVALID_STATE:", 409, "Credit account requires reconciliation"]];
  const match = known.find(([code]) => text.includes(code));
  return NextResponse.json({ error: match?.[2] ?? "Credit service is temporarily unavailable" }, { status: match?.[1] ?? 503, headers: { "Cache-Control": "private, no-store" } });
}
function parseDueDate(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)?$/.test(value)) throw new Error("INVALID_ARGUMENT:");
  if (value.length > 10 && Number(value.slice(11, 13)) > 23) throw new Error("INVALID_ARGUMENT:");
  const date = value.slice(0, 10);
  const dueAt = Date.parse(date + "T00:00:00.000Z");
  if (!Number.isFinite(dueAt) || date.startsWith("0000-") || new Date(dueAt).toISOString().slice(0, 10) !== date || !Number.isFinite(Date.parse(value))) throw new Error("INVALID_ARGUMENT:");
  return dueAt;
}
export async function POST(request: NextRequest) {
  try {
    const { client, businessId } = await connection(request);
    const body = await request.json().catch(() => { throw new Error("INVALID_ARGUMENT:"); });
    if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.customer_id !== "string" || !body.customer_id) throw new Error("INVALID_ARGUMENT:");
    const rawType = typeof body.transaction_type === "string" ? body.transaction_type.toLowerCase() : "";
    const kind = ["purchase", "credit", "extension"].includes(rawType) ? "issue" : rawType === "payment" ? "payment" : null;
    const amount = typeof body.amount === "number" || (typeof body.amount === "string" && body.amount.trim()) ? Number(body.amount) : NaN;
    if (body.amountCents !== undefined && !Number.isSafeInteger(body.amountCents)) throw new Error("INVALID_ARGUMENT:");
    const dollarCents = Math.round(amount * 100);
    const amountCents = body.amountCents ?? dollarCents;
    if (body.amount !== undefined && (!Number.isSafeInteger(dollarCents) || Math.abs(amount * 100 - dollarCents) > 1e-6 || dollarCents !== amountCents)) throw new Error("INVALID_ARGUMENT:");
    if (!kind || !Number.isSafeInteger(amountCents) || amountCents <= 0 || (body.description !== undefined && typeof body.description !== "string") || (body.business_id !== undefined && typeof body.business_id !== "string")) throw new Error("INVALID_ARGUMENT:");
    const requestKey = request.headers.get("idempotency-key") ?? body.requestKey ?? body.idempotencyKey ?? randomUUID();
    if (typeof requestKey !== "string") throw new Error("INVALID_ARGUMENT:");
    const dueAt = parseDueDate(body.due_date ?? body.dueDate);
    if (body.due_date !== undefined && body.dueDate !== undefined && parseDueDate(body.due_date) !== parseDueDate(body.dueDate)) throw new Error("INVALID_ARGUMENT:");
    const paymentMethod = body.payment_method ?? body.paymentMethod;
    if ((paymentMethod !== undefined && typeof paymentMethod !== "string") || (body.expectedUserId !== undefined && typeof body.expectedUserId !== "string") || (body.payment_method !== undefined && body.paymentMethod !== undefined && body.payment_method !== body.paymentMethod)) throw new Error("INVALID_ARGUMENT:");
    const transaction = await client.mutation(api.creditTransactions.create, { businessId: body.business_id ?? businessId, customerId: body.customer_id, kind, amountCents, requestKey, description: body.description, dueAt, paymentMethod, expectedUserId: body.expectedUserId });
    return NextResponse.json(transaction, { status: 201, headers: { "Cache-Control": "private, no-store", "Idempotency-Key": requestKey } });
  } catch (error) { return failure(error); }
}
export async function GET(request: NextRequest) {
  try {
    const { client, businessId: selectedBusinessId, userId } = await connection(request);
    const params = new URL(request.url).searchParams;
    const businessId = params.get("business_id") ?? selectedBusinessId;
    const expectedUserId = params.get("expectedUserId") ?? undefined;
    if (!businessId || (expectedUserId !== undefined && (!expectedUserId || expectedUserId !== userId))) throw new Error("FORBIDDEN:");
    const customerId = params.get("customerId") || undefined;
    const limit = Number(params.get("limit") ?? 50);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error("INVALID_ARGUMENT:");
    let cursor = params.get("cursor");
    const allCustomerHistory = Boolean(customerId && !params.has("limit") && !cursor);
    const rows: FunctionReturnType<typeof api.creditTransactions.listPage>["page"] = [];
    let isDone = false;
    do {
      const page: FunctionReturnType<typeof api.creditTransactions.listPage> = await client.query(api.creditTransactions.listPage, { businessId, customerId, expectedUserId, paginationOpts: { cursor, numItems: limit } });
      rows.push(...page.page); isDone = page.isDone;
      if (!page.isDone && (!page.continueCursor || page.continueCursor === cursor)) throw new Error("INVALID_STATE:");
      cursor = page.continueCursor;
    } while (allCustomerHistory && !isDone);
    return NextResponse.json(rows, { headers: { "Cache-Control": "private, no-store", "X-Has-More": String(!isDone), ...(!isDone && cursor ? { "X-Next-Cursor": cursor } : {}) } });
  } catch (error) { return failure(error); }
}
