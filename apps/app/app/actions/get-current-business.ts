"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function getCurrentBusinessProfile() {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return null;
    }

    const business = await db.businessProfile.findUnique({
      where: { clerkOrgId: orgId },
    });

    return business;
  } catch (error) {
    console.error("Error fetching current business profile:", error);
    return null;
  }
}
