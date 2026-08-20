import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { emit } from "@/lib/queue";
import {
  requestedBusinessMatches,
  resolveAiBusinessContext,
} from "../_lib/server";

const pricingInventorySchema = z.object({
  business_id: z.string().min(1),
  analysis_type: z.enum(["all", "pricing", "inventory"]).default("all"),
  margin_requirement: z.number().min(0).max(10).default(0.3),
  supplier_lead_time_days: z.number().int().min(0).max(365).default(7),
});

export async function POST(req: NextRequest) {
  const context = await resolveAiBusinessContext(req, "pricing.manage");
  if (!context.ok) {
    return NextResponse.json(
      { error: context.error },
      { status: context.status },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = pricingInventorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid pricing inventory request" },
      { status: 400 },
    );
  }
  if (
    !requestedBusinessMatches(parsed.data.business_id, context.businessId)
  ) {
    return NextResponse.json({ error: "Business access denied" }, { status: 403 });
  }

  try {
    const inngestRes = await emit("ai/pricing-inventory.analyze", {
      business_id: context.businessId,
      analysis_type: parsed.data.analysis_type,
      margin_requirement: parsed.data.margin_requirement,
      supplier_lead_time_days: parsed.data.supplier_lead_time_days,
      requested_by: context.userId,
    });

    return NextResponse.json(
      {
        jobId: inngestRes.ids[0],
        status: "queued",
      },
      { status: 202 },
    );
  } catch (error) {
    console.error("Failed to queue AI pricing inventory analysis", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
