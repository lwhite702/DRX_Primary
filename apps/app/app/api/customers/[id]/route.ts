import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Business check omitted for brevity but should be there for security.
    // Assuming if they can update a customer by ID, checking businessId matching the customer's businessId is enough (handled by where clause? No, need to check ownership).

    let businessId: string | undefined;
    const ownedBusiness = await db.businessProfile.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });
    businessId = ownedBusiness?.id;
    if (!businessId) {
      const userRole = await db.userRole.findFirst({
        where: { userId: userId },
        select: { businessId: true },
      });
      businessId = userRole?.businessId;
    }
    if (!businessId)
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 },
      );

    const customerId = params.id;
    const body = await request.json();
    const {
      first_name,
      last_name,
      phone,
      email,
      address,
      city,
      state,
      zip_code,
      customer_type,
    } = body;

    // Verify customer belongs to business
    const existing = await db.customers.findFirst({
      where: { id: customerId, businessId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );
    }

    const updated = await db.customers.update({
      where: { id: customerId },
      data: {
        firstName: first_name,
        lastName: last_name,
        phoneNumber: phone,
        email,
        address,
        city,
        state,
        zipCode: zip_code,
        customerType: customer_type,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update Customer Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
