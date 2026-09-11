import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import { getConvexAuthToken } from "@/lib/auth/convex-token";

const rawItems = z.array(z.record(z.string(), z.unknown())).max(200);
export function normalizeCheckItems(value: unknown) {
  return rawItems.parse(value).flatMap(item => {
    // Manual lines do not reserve catalog stock. All other lines need a record ID.
    if (item.source === "manual") return [];
    const productId = z.string().min(1).max(128).parse(item.productId ?? item.inventoryId ?? item.inventory_id ?? item.id);
    const quantity = Number(item.weightGrams ?? item.weight_grams ?? item.qty ?? item.quantity ?? 1);
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("INVALID_ARGUMENT: Invalid quantity");
    return [{ productId, quantity }];
  });
}
export function checkAmount(value: unknown) {
  const amount = Number(value ?? 0);
  const cents = Math.round(amount * 100);
  if (!Number.isFinite(amount) || amount < 0 || !Number.isSafeInteger(cents) || Math.abs(amount * 100 - cents) > 0.000001) throw new Error("INVALID_ARGUMENT: Invalid amount");
  return cents;
}
export async function checkCanonicalCart(args: { businessId: string; items: Array<{ productId: string; quantity: number }>; customerId?: string; amountCents: number }) {
  const token = await getConvexAuthToken();
  if (!token) throw new Error("UNAUTHENTICATED: Sign in");
  const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!url) throw new Error("UNAVAILABLE: Checkout service is unavailable");
  const client = new ConvexHttpClient(url);
  client.setAuth(token);
  return client.query(api.commerceIdentity.checkCart, args);
}
export function checkFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (error instanceof z.ZodError || error instanceof SyntaxError || message.includes("INVALID_ARGUMENT:") || message.includes("ArgumentValidationError")) return NextResponse.json({ error: "Check the cart quantities and amount" }, { status: 400 });
  if (message.includes("UNAUTHENTICATED:")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (message.includes("FORBIDDEN:") || message.includes("UNAUTHORIZED:")) return NextResponse.json({ error: "This checkout workspace is unavailable" }, { status: 403 });
  if (message.includes("NOT_FOUND:")) return NextResponse.json({ error: "The selected customer is unavailable" }, { status: 404 });
  return NextResponse.json({ error: "Checkout validation is temporarily unavailable" }, { status: 503 });
}
