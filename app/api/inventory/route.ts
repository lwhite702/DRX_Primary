import { NextRequest, NextResponse } from "next/server";
import { auth } from "@wrelik/auth/next";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Endpoint GET Unauthorized" },
        { status: 401 },
      );
    }

    // Determine business_id
    // 1. Check if user is an owner
    const ownedBusiness = await db.businessProfile.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });

    let businessId = ownedBusiness?.id;

    // 2. If not owner, check roles
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
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const search = searchParams.get("search");

    const where: Prisma.InventoryWhereInput = {
      businessId: businessId,
    };

    if (search) {
      where.OR = [
        { productName: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }

    const inventory = await db.inventory.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: inventory });
  } catch (error) {
    console.error("Inventory API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Endpoint POST Unauthorized" },
        { status: 401 },
      );
    }

    // Determine business_id
    // 1. Check if user is an owner
    const ownedBusiness = await db.businessProfile.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });

    let businessId = ownedBusiness?.id;

    // 2. If not owner, check roles
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

    const body = await request.json();
    const {
      sku,
      product_name,
      description,
      category,
      quantity_on_hand,
      reorder_level,
      unit_cost,
      selling_price,
      supplier_id,
    } = body;

    // Validation
    if (!sku || !product_name) {
      return NextResponse.json(
        { error: "SKU and Product Name are required" },
        { status: 400 },
      );
    }

    try {
      const newItem = await db.inventory.create({
        data: {
          businessId,
          sku,
          productName: product_name,
          description,
          category,
          quantityOnHand: quantity_on_hand || 0,
          reorderLevel: reorder_level || 10,
          unitCost: unit_cost,
          sellingPrice: selling_price,
          supplierId: supplier_id,
        },
      });

      return NextResponse.json(newItem, { status: 201 });
    } catch (error: any) {
      if (error.code === "P2002") {
        // Unique constraint violation (likely SKU)
        return NextResponse.json(
          { error: "SKU already exists for this business" },
          { status: 409 },
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Inventory API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
