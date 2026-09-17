import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "Featurebase integration has been retired." },
    { status: 410, headers: { "Cache-Control": "private, no-store" } },
  );
}

