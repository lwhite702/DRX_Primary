/**
 * Database Admin Client Adapter
 *
 * This module provides admin database access through @wrelik/db
 * Legacy Supabase admin client interface maintained for backward compatibility
 */

import { db } from "@wrelik/db";

export const supabaseAdmin = db;

export const supabaseAdminClient = db;
