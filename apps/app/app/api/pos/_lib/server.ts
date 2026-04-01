import { auth } from "@/lib/adapters/auth/server";
import { db } from "@/lib/db";

export async function resolveAuthContext() {
  const { userId } = await auth();
  if (!userId) {
    return { userId: null, businessId: null };
  }

  const ownedBusiness = await db.businessProfile.findFirst({
    where: { ownerId: userId },
    select: { id: true },
  });

  let businessId = ownedBusiness?.id ?? null;

  if (!businessId) {
    const role = await db.userRole.findFirst({
      where: { userId },
      select: { businessId: true },
    });
    businessId = role?.businessId ?? null;
  }

  return { userId, businessId };
}

export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "toNumber" in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function cleanPhone(value: string) {
  return value.replace(/[^0-9]/g, "");
}
