import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/adapters/auth/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Determine business_id logic (shared)
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

    if (!businessId) {
      return NextResponse.json(
        { error: "Business not found for user" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: Prisma.CustomersWhereInput = {
      businessId: businessId,
      isActive: true,
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { phoneNumber: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const customers = await db.customers.findMany({
      where,
      take: isNaN(limit) ? 50 : limit,
      skip: isNaN(offset) ? 0 : offset,
      orderBy: { createdAt: "desc" },
    });

    console.log(
      `[Customers API] Found ${customers.length} customers for business ${businessId}`,
    );

    // Map to snake_case for mobile
    const mappedCustomers = customers.map((c) => ({
      id: c.id,
      business_id: c.businessId,
      first_name: c.firstName || "",
      last_name: c.lastName || "",
      phone_number: c.phoneNumber || "",
      email: c.email || "",
      address: c.address || "",
      city: c.city || "",
      state: c.state || "",
      zip_code: c.zipCode || "",
      customer_type: c.customerType || "retail",
      loyalty_tier: "bronze",
      loyalty_points: 0,
      total_purchases: Number(c.totalPurchases || 0),
      total_credit_used: Number(c.totalCreditUsed || 0),
      fixed_price_per_gram: (c as any).fixedPricePerGram
        ? Number((c as any).fixedPricePerGram)
        : null,
      credit_limit: 0,
    }));

    return NextResponse.json({ data: mappedCustomers });
  } catch (error) {
    console.error("Customers API Error Details:", error);
    if (error instanceof Error) {
      console.error("Error Message:", error.message);
      console.error("Error Stack:", error.stack);
    }
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    const body = await request.json();
    const {
      first_name,
      last_name,
      phone, // Mobile uses 'phone' or 'phone_number'?
      email,
      address,
      city,
      state,
      zip_code,
      customer_type,
      fixed_price_per_gram,
    } = body;

    if (!first_name || !last_name) {
      return NextResponse.json(
        { error: "First and Last Name required" },
        { status: 400 },
      );
    }

    const newCustomer = await db.customers.create({
      data: {
        businessId,
        firstName: first_name,
        lastName: last_name,
        phoneNumber: phone, // Assuming mobile sends 'phone'
        email,
        address,
        city,
        state,
        zipCode: zip_code,
        customerType: customer_type || "retail",
        fixedPricePerGram: fixed_price_per_gram,
        isActive: true,
      },
    });

    return NextResponse.json(newCustomer, { status: 201 });
  } catch (error) {
    console.error("Create Customer Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
