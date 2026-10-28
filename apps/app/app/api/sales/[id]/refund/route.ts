import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { businessClient } from "@/lib/business/convex-server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const { id } = await Promise.resolve(params);
    const body: any = await request.json().catch(() => ({}));
    const { reason, disposition, tenderRefundConfirmed, externalReference } = body;

    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return NextResponse.json(
        { error: "A reason is required to refund an order" },
        { status: 400 },
      );
    }

    if (disposition !== "restock" && disposition !== "scrap") {
      return NextResponse.json(
        { error: "A valid inventory disposition ('restock' or 'scrap') is required" },
        { status: 400 },
      );
    }

    const { client } = await businessClient(request);
    const result = await client.mutation(api.refunds.refundOrder, {
      saleId: id as any,
      reason: reason.trim(),
      disposition,
      tenderRefundConfirmed: Boolean(tenderRefundConfirmed),
      externalReference:
        typeof externalReference === "string" && externalReference.trim()
          ? externalReference.trim()
          : undefined,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNAUTHORIZED:")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message.includes("FORBIDDEN:")) {
      return NextResponse.json(
        { error: "You do not have permission to refund sales" },
        { status: 403 },
      );
    }
    if (message.includes("NOT_FOUND:")) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }
    if (message.includes("INVALID_STATE:")) {
      return NextResponse.json(
        { error: message.replace(/^INVALID_STATE:\s*/, "") },
        { status: 409 },
      );
    }
    if (
      message.includes("SETTLEMENT_REQUIRED:") ||
      message.includes("INVALID_ARGUMENT:") ||
      message.includes("INTEGRITY_ERROR:")
    ) {
      return NextResponse.json(
        {
          error: message
            .replace(/^SETTLEMENT_REQUIRED:\s*/, "")
            .replace(/^INVALID_ARGUMENT:\s*/, "")
            .replace(/^INTEGRITY_ERROR:\s*/, ""),
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Could not refund sale" },
      { status: 500 },
    );
  }
}
