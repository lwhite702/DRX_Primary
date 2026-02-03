/**
 * Database Client Adapter
 *
 * This module provides database access through @wrelik/db
 * Legacy Supabase client interface maintained for backward compatibility during migration
 */

import { db } from "@wrelik/db";

let dbClient: typeof db | null = null;

export function getSupabaseClient() {
  if (!dbClient) {
    dbClient = db;
  }

  return dbClient;
}

// Keep for backwards compatibility
export const supabase = getSupabaseClient();
