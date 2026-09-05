import { createClient as createSupabaseCompatClient } from "@/lib/supabase/server";

/**
 * Transitional DB client used by existing codepaths still depending on the
 * Supabase-like fluent API while the migration to Prisma-first query patterns
 * is ongoing.
 */
export const createLegacyServerDbClient = createSupabaseCompatClient;

