import "server-only";
import { getPlatformAdmin } from "./platform-admin";
import { hasBusinessPermission } from "./server-guards";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { db } from "@/lib/db";

export async function canManageNotificationRecipient(request: Request, actorId: string, targetId: string) {
  if (actorId === targetId) return true;
  if (await getPlatformAdmin()) return true;
  const { businessId } = await resolveAuthContext(request);
  if (!businessId || !(await hasBusinessPermission(actorId, businessId, "staff.manage"))) return false;
  return Boolean(await db.userRole.findFirst({ where: { businessId, userId: targetId }, select: { id: true } }));
}
