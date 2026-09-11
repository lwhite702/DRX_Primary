import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import { failure, headers, intelligenceClient } from "../_lib/convex";

const input = z.object({ business_id: z.string().trim().min(1).max(200), request_id: z.string().trim().min(1).max(200).optional() }).strict();
export async function POST(req: NextRequest) {
  try {
    const parsed = input.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid inventory health request" }, { status: 400, headers });
    const { client, businessId, expectedUserId } = await intelligenceClient(parsed.data.business_id);
    const result = await client.action(api.inventoryHealthActions.generate, { businessId, expectedUserId, requestId: parsed.data.request_id ?? crypto.randomUUID() });
    return NextResponse.json(JSON.parse(result), { headers });
  } catch (error) { return failure(error); }
}
