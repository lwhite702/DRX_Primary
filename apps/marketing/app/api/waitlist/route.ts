import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, businessName, role, teamSize, tooling } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }

    if (!businessName || typeof businessName !== "string" || !businessName.trim()) {
      return NextResponse.json(
        { error: "Business name is required." },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString();
    const cleanEmail = email.trim().toLowerCase();
    const [userPart, domainPart] = cleanEmail.split("@");
    const maskedEmail = `${userPart.slice(0, 2)}***@${domainPart || "unknown"}`;

    // Forward waitlist applicant to Loops API if configured
    const loopsApiKey = process.env.LOOPS_API_KEY;
    if (loopsApiKey) {
      try {
        const loopsRes = await fetch("https://app.loops.so/api/v1/contacts/create", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${loopsApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: cleanEmail,
            source: "Beta Waitlist",
            userGroup: "Beta Waitlist",
            businessName: businessName.trim(),
            role: role || "owner_operator",
            teamSize: teamSize || "1-5",
            tooling: tooling || "",
          }),
        });
        if (!loopsRes.ok && loopsRes.status !== 409) {
          console.error(`Loops API returned ${loopsRes.status}`);
        }
      } catch (loopsErr) {
        console.error("Failed to forward waitlist entry to Loops:", loopsErr);
      }
    }

    // Forward to waitlist webhook if configured
    const webhookUrl = process.env.WAITLIST_WEBHOOK_URL || process.env.MARKETING_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        const upstream = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: cleanEmail,
            businessName: businessName.trim(),
            role: role || "owner_operator",
            teamSize: teamSize || "1-5",
            tooling: tooling || "",
            timestamp,
          }),
        });
        if (!upstream.ok) {
          console.error(`Upstream waitlist provider returned ${upstream.status}`);
        }
      } catch (upstreamErr) {
        console.error("Failed to forward waitlist to webhook:", upstreamErr);
      }
    }

    // Structured audit logging for beta enrollment verification without unredacted PII
    console.info(
      JSON.stringify({
        event: "beta_waitlist_registered",
        maskedEmail,
        role: role || "owner_operator",
        teamSize: teamSize || "1-5",
        hasTooling: Boolean(tooling && tooling.trim()),
        timestamp,
      })
    );

    return NextResponse.json(
      { success: true, message: "Waitlist request recorded." },
      { status: 200, headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("Unexpected error in waitlist submission:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again later." },
      { status: 500 }
    );
  }
}
