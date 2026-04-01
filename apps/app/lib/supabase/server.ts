/**
 * Database Server Client Adapter
 *
 * This module provides server-side database access through local Prisma.
 * It is intentionally typed as a supabase-compat shim during migration.
 */

import { db } from "@/lib/db";

export async function createClient() {
  return db as any;
}
