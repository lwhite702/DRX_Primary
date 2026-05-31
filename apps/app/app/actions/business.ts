"use server";

import { auth } from "@/lib/adapters/auth/server";
import { db } from "@/lib/db";

export async function getUserBusinessesAction() {
  try {
    const { userId } = await auth();
    if (!userId) return { businesses: [], error: "Not authenticated" };

    // Fetch roles to find linked businesses
    const roles = await db.userRole.findMany({
      where: { userId },
      select: { businessId: true, role: true },
    });

    const businessIds = roles.map((r: any) => r.businessId);

    // Fetch owned businesses (if structure allows user to own without explicit role, though role usually tracks this)
    const ownedBusinesses = await db.businessProfile.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });

    ownedBusinesses.forEach((b: any) => {
      if (!businessIds.includes(b.id)) businessIds.push(b.id);
    });

    if (businessIds.length === 0) {
      return { businesses: [] };
    }

    const businesses = await db.businessProfile.findMany({
      where: {
        id: { in: businessIds },
      },
    });

    return { businesses };
  } catch (error) {
    console.error("Error fetching user businesses:", error);
    return { businesses: [], error: "Failed to fetch businesses" };
  }
}
