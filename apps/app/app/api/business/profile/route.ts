import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveAuthContext } from "../../pos/_lib/server";

export async function GET(request: NextRequest) {
  try {
    const { businessId } = await resolveAuthContext();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await db.businessProfile.findUnique({
      where: { id: businessId },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("GET Business Profile Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { businessId } = await resolveAuthContext();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const updated = await db.businessProfile.update({
      where: { id: businessId },
      data: {
        businessName: body.businessName || body.business_name,
        businessType: body.businessType || body.business_type,
        phoneNumber: body.phoneNumber || body.phone_number,
        email: body.email,
        address: body.address,
        city: body.city,
        state: body.state,
        zipCode: body.zipCode || body.zip_code,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH Business Profile Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
