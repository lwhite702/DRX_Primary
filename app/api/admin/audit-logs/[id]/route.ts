import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return NextResponse.json(
    { error: "Audit logs are immutable" },
    { status: 405 },
  );
}
