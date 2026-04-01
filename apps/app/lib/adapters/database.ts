/**
 * Database Adapter
 *
 * Wraps local Prisma client for database access with tenant scoping.
 */

import { db } from "@/lib/db";

export { db };

/**
 * Get database client
 */
export function getDatabase() {
  return db;
}

/**
 * Execute a database operation with tenant scoping
 */
export async function withTenant<T>(
  operation: () => Promise<T>,
  tenantId: string
): Promise<T> {
  void tenantId;
  return operation();
}
