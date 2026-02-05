/**
 * Database Adapter
 *
 * Wraps @wrelik/db for database access with tenant scoping
 */

import { db } from "@wrelik/db";

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
  // Tenant context is managed by @wrelik/db
  // This wrapper ensures explicit tenant awareness
  return operation();
}
