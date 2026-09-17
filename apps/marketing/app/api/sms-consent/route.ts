import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, phoneNumber, consent } = body;

    if (!phoneNumber || !consent) {
      return NextResponse.json(
        { error: "Phone number and explicit consent are required." },
        { status: 400 }
      );
    }

    // Return successful response. In production, this can forward to a messaging provider or CRM table.
    return NextResponse.json({
      ok: true,
      message: "SMS consent successfully registered for relevant communications.",
      data: {
        fullName: fullName || "Anonymous",
        phoneNumberMasked: phoneNumber.slice(-4),
        registeredAt: new Date().toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 }
    );
  }
}
