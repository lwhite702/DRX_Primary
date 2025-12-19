#!/usr/bin/env tsx
/**
 * Production Reset Script
 *
 * WARNING: This script will DESTRUCTIVELY wipe all application data
 * except the admin user account (lee@wrelik.com).
 *
 * Usage: tsx scripts/production-reset.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = "lee@wrelik.com";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing required environment variables:");
  console.error("   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function resetDatabase() {
  console.log("🚨 PRODUCTION RESET INITIATED");
  console.log("━".repeat(60));
  console.log(`⚠️  This will DELETE ALL DATA except admin: ${ADMIN_EMAIL}`);
  console.log("━".repeat(60));

  try {
    // Step 1: Get admin user ID
    console.log("\n📋 Step 1: Locating admin user...");
    const { data: adminUser, error: adminError } = await supabase
      .from("user_profiles")
      .select("id, email")
      .eq("email", ADMIN_EMAIL)
      .single();

    if (adminError || !adminUser) {
      console.error("❌ Admin user not found. Cannot proceed.");
      process.exit(1);
    }

    console.log(`✅ Found admin: ${adminUser.email} (${adminUser.id})`);
    const adminId = adminUser.id;

    // Step 2: Truncate all application tables (preserving admin)
    console.log("\n🗑️  Step 2: Truncating application tables...");

    const tablesToTruncate = [
      "sales_line_items",
      "sales",
      "credit_transactions",
      "credit_limits",
      "inventory_log",
      "cost_history",
      "inventory_intakes",
      "inventory",
      "customers",
      "business_settings",
      "user_roles",
      "business_profile",
    ];

    for (const table of tablesToTruncate) {
      console.log(`   Truncating ${table}...`);
      const { error } = await supabase.rpc("exec_sql", {
        sql: `TRUNCATE TABLE ${table} CASCADE;`,
      });

      if (error) {
        // Try direct delete if RPC not available
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

        if (deleteError) {
          console.warn(
            `   ⚠️  Could not truncate ${table}: ${deleteError.message}`
          );
        }
      }
    }

    console.log("✅ Tables truncated");

    // Step 3: Seed essential data
    console.log("\n🌱 Step 3: Seeding essential data...");

    // Create default business for admin
    const { data: business, error: businessError } = await supabase
      .from("business_profile")
      .insert({
        business_name: "DRX Demo Business",
        business_type: "Retail",
        owner_id: adminId,
        is_active: true,
      })
      .select()
      .single();

    if (businessError) {
      console.error("❌ Failed to create business:", businessError.message);
      process.exit(1);
    }

    console.log(`✅ Created business: ${business.business_name}`);

    // Create admin role
    const { error: roleError } = await supabase.from("user_roles").insert({
      business_id: business.id,
      user_id: adminId,
      role: "owner",
      permissions: {},
    });

    if (roleError) {
      console.error("❌ Failed to create admin role:", roleError.message);
      process.exit(1);
    }

    console.log("✅ Created admin role (owner)");

    // Create business settings
    const { error: settingsError } = await supabase
      .from("business_settings")
      .insert({
        business_id: business.id,
        default_tax_rate: 0.08,
        currency: "USD",
        timezone: "America/New_York",
      });

    if (settingsError) {
      console.error(
        "❌ Failed to create business settings:",
        settingsError.message
      );
      process.exit(1);
    }

    console.log("✅ Created business settings");

    // Step 4: Summary
    console.log("\n━".repeat(60));
    console.log("✅ PRODUCTION RESET COMPLETE");
    console.log("━".repeat(60));
    console.log("\n📊 Summary:");
    console.log(`   • Admin User: ${ADMIN_EMAIL}`);
    console.log(`   • Business: ${business.business_name}`);
    console.log(`   • Role: Owner`);
    console.log(`   • Tax Rate: 8%`);
    console.log("\n🚀 The application is ready for production beta testing.");
    console.log("\n");
  } catch (error) {
    console.error("\n❌ FATAL ERROR:", error);
    process.exit(1);
  }
}

// Confirmation prompt
const args = process.argv.slice(2);
if (!args.includes("--confirm")) {
  console.log("⚠️  DESTRUCTIVE OPERATION");
  console.log("This will DELETE ALL DATA except the admin account.");
  console.log("\nTo proceed, run:");
  console.log("  tsx scripts/production-reset.ts --confirm");
  process.exit(0);
}

resetDatabase();
