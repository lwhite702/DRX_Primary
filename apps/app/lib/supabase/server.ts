/**
 * Database Server Client Adapter
 *
 * This module provides server-side database access through @wrelik/db
 * Legacy Supabase server client interface maintained for backward compatibility
 */

import { db } from "@wrelik/db";

export async function createClient() {
  // @wrelik/db handles server-side database access automatically
  return db;
}
