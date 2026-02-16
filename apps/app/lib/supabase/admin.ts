/**
 * Database Admin Client Adapter
 *
 * This module provides admin database access through local Prisma.
 * It is intentionally typed as a supabase-compat shim during migration.
 */

import { db } from "@/lib/db";

export const supabaseAdmin = db as any;

export const supabaseAdminClient = db as any;
