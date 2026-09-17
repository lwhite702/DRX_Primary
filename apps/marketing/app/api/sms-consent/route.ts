import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, phoneNumber, consent, email, businessName, communicationTopic } = body;

    if (!phoneNumber || typeof phoneNumber !== "string" || !consent) {
      return NextResponse.json(
        { error: "A valid phone number and explicit consent are required." },
        { status: 400 }
      );
    }

    const cleanedPhone = phoneNumber.replace(/\D/g, "");
    if (cleanedPhone.length < 10) {
      return NextResponse.json(
        { error: "Please provide a valid 10-digit phone number." },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString();
    const maskedPhone = `***-***-${cleanedPhone.slice(-4)}`;

    // Forward consent record to upstream provider or CRM webhook if configured
    const webhookUrl = process.env.SMS_CONSENT_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        const upstream = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: fullName || "Anonymous",
            phoneNumber: cleanedPhone,
            email: email || null,
            businessName: businessName || null,
            communicationTopic: communicationTopic || "general",
            consent: true,
            timestamp,
          }),
        });
        if (!upstream.ok) {
          throw new Error(`Upstream consent provider returned ${upstream.status}`);
        }
      } catch (upstreamErr) {
        console.error("Failed to forward SMS consent to upstream provider:", upstreamErr);
        return NextResponse.json(
          { error: "Failed to persist SMS consent with provider. Please try again later." },
          { status: 502 }
        );
      }
    }

    // Structured audit logging for 10DLC compliance verification without unredacted PII
    console.info(
      JSON.stringify({
        event: "sms_consent_recorded",
        maskedPhone,
        topic: communicationTopic || "general",
        consentGiven: true,
        timestamp,
      })
    );

    return NextResponse.json({
      ok: true,
      message: "SMS consent successfully registered for relevant communications.",
      data: {
        fullName: fullName || "Anonymous",
        phoneNumberMasked: maskedPhone,
        registeredAt: timestamp,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 }
    );
  }
}
