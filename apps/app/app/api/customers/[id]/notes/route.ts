import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { businessClient } from "@/lib/business/convex-server";
import { customerFailure } from "@/lib/customers/convex-operational";
import type { Id } from "@/convex/_generated/dataModel";

const headers = { "Cache-Control": "private, no-store" };
type RouteParams = { params: Promise<{ id: string }> | { id: string } };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await Promise.resolve(params);
    const { client, businessId, expectedUserId } = await businessClient(request);
    const result = await client.query(api.customers.getCustomerNotesAndAlerts, {
      businessId,
      expectedUserId,
      customerId: id,
    });
    return NextResponse.json(result, { headers });
  } catch (error) {
    return customerFailure(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await Promise.resolve(params);
    const { client, businessId, expectedUserId } = await businessClient(request);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      throw new Error("INVALID_ARGUMENT: Invalid request body");
    }

    const classification = body.classification === "note" ? "note" : "alert";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      throw new Error("INVALID_ARGUMENT: Note message is required");
    }

    const severity =
      body.severity === "critical" || body.severity === "warning" || body.severity === "info"
        ? body.severity
        : undefined;

    const createdFrom =
      body.createdFrom === "sale_screen" || body.createdFrom === "customer_screen"
        ? body.createdFrom
        : "customer_screen";

    const noteId = await client.mutation(api.customers.addCustomerNoteOrAlert, {
      businessId,
      expectedUserId,
      customerId: id,
      classification,
      message,
      severity,
      authorName: typeof body.authorName === "string" ? body.authorName.trim() : undefined,
      createdFrom,
    });

    return NextResponse.json({ success: true, noteId }, { status: 201, headers });
  } catch (error) {
    return customerFailure(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: _customerId } = await Promise.resolve(params);
    const { client, businessId, expectedUserId } = await businessClient(request);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || !body.noteId) {
      throw new Error("INVALID_ARGUMENT: noteId is required");
    }

    await client.mutation(api.customers.dismissCustomerAlert, {
      businessId,
      expectedUserId,
      noteId: body.noteId as Id<"customerNotes">,
    });

    return NextResponse.json({ success: true }, { headers });
  } catch (error) {
    return customerFailure(error);
  }
}
