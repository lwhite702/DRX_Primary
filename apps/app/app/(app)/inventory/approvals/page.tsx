import { ApprovalsClient } from "./_components/ApprovalsClient";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { hasBusinessPermission } from "@/lib/auth/server-guards";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const { userId, businessId } = await resolveAuthContext();
  if (!userId || !businessId || !(await hasBusinessPermission(userId, businessId, "inventory.manage"))) notFound();
  return <ApprovalsClient />;
}
