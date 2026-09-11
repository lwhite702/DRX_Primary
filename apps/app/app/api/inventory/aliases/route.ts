import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { businessClient } from "@/lib/business/convex-server";
const headers = { "Cache-Control": "private, no-store" };
function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const entries: Array<[string, number, string]> = [["UNAUTHORIZED:", 401, "Unauthorized"], ["FORBIDDEN:", 403, "Alias changes require inventory permission"], ["NOT_FOUND:", 404, "Alias not found"], ["ALREADY_EXISTS:", 409, "Alias name already exists"], ["INVALID_ARGUMENT:", 400, "Invalid alias request"]];
  const entry = entries.find(([code]) => message.includes(code));
  return NextResponse.json({ error: entry?.[2] ?? "Aliases are temporarily unavailable" }, { status: entry?.[1] ?? 503, headers });
}
export async function GET(request: NextRequest) {
  try {
    const { client, ...context } = await businessClient(request);
    const result = await client.query(api.unitAliases.list, { ...context, paginationOpts: { cursor: request.nextUrl.searchParams.get("cursor"), numItems: 100 } });
    return NextResponse.json({ data: result.page, nextCursor: result.isDone ? null : result.continueCursor }, { headers });
  } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  try {
    const { client, ...context } = await businessClient(request);
    const payload: unknown = await request.json().catch(() => null);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("INVALID_ARGUMENT:");
    const body = payload as Record<string, unknown>;
    if (body.action === "create") {
      if (typeof body.name !== "string" || typeof body.quantity !== "number" || (body.standardUnit !== "g" && body.standardUnit !== "oz")) throw new Error("INVALID_ARGUMENT:");
      return NextResponse.json({ id: await client.mutation(api.unitAliases.create, { ...context, name: body.name, quantity: body.quantity, standardUnit: body.standardUnit }) }, { status: 201, headers });
    }
    if (body.action === "restore") {
      if (body.cursor !== null && body.cursor !== undefined && typeof body.cursor !== "string") throw new Error("INVALID_ARGUMENT:");
      return NextResponse.json(await client.mutation(api.unitAliases.restoreSavedDefaults, { ...context, paginationOpts: { cursor: typeof body.cursor === "string" ? body.cursor : null, numItems: 100 } }), { headers });
    }
    if (body.action !== "toggle" && body.action !== "remove") throw new Error("INVALID_ARGUMENT:");
    if (typeof body.id !== "string" || !/^[a-z0-9]{20,64}$/.test(body.id) || (body.action === "toggle" && typeof body.enabled !== "boolean")) throw new Error("INVALID_ARGUMENT:");
    await client.mutation(api.unitAliases.update, { ...context, id: body.id as Id<"productUnitAliases">, ...(body.action === "remove" ? { remove: true } : { enabled: body.enabled as boolean }) });
    return NextResponse.json({ success: true }, { headers });
  } catch (error) { return failure(error); }
}
