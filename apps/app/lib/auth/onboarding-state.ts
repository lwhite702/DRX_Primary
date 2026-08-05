import { db } from "@/lib/db";
import { hasCompletedOnboardingSettings } from "./onboarding-completion";

export async function getCompletedOnboardingBusinessId(userId: string) {
  const [ownedBusiness, assignedRole] = await Promise.all([
    db.businessProfile.findFirst({
      where: { ownerId: userId, isActive: true },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    }),
    db.userRole.findFirst({
      where: { userId, business: { isActive: true } },
      select: { businessId: true },
    }),
  ]);

  const businessId = ownedBusiness?.id ?? assignedRole?.businessId;
  if (!businessId) return null;

  const settings = await db.businessSettings.findUnique({
    where: { businessId },
    select: { settingsData: true },
  });

  return hasCompletedOnboardingSettings(settings?.settingsData) ? businessId : null;
}
