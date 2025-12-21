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
  console.log(
    `⚠️  This will DELETE ALL DATA and re-seed admin: ${ADMIN_EMAIL}`
  );
  console.log("━".repeat(60));

  try {
    // Step 1: Get or Create admin user
    console.log("\n📋 Step 1: Locating admin user...");

    // List users to find by email (using admin API)
    const {
      data: { users },
      error: listError,
    } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error("❌ Failed to list users:", listError.message);
      process.exit(1);
    }

    let adminUser = users.find((u) => u.email === ADMIN_EMAIL);
    let adminId = "";

    if (!adminUser) {
      console.log(`   Admin user not found. Creating ${ADMIN_EMAIL}...`);
      const { data: newUser, error: createError } =
        await supabase.auth.admin.createUser({
          email: ADMIN_EMAIL,
          password: "password123", // Default password for local dev/reset
          email_confirm: true,
        });

      if (createError) {
        console.error("❌ Failed to create admin user:", createError.message);
        process.exit(1);
      }

      if (!newUser.user) {
        console.error("❌ User created but no user object returned.");
        process.exit(1);
      }

      adminUser = newUser.user;
      adminId = adminUser.id;
      console.log(`   ✅ Created admin user: ${adminId}`);
    } else {
      adminId = adminUser.id;
      console.log(`   ✅ Found existing admin user: ${adminId}`);
    }

    // Step 2: Truncate all application tables
    console.log("\n🗑️  Step 2: Truncating application tables...");

    // Topological order (children first)
    const tablesToTruncate = [
      "sales_line_items",
      "sales",
      "credit_transactions",
      "credit_limits",
      "inventory_log",
      "inventory",
      "customers",
      "customer_notes",
      "business_settings",
      "user_roles",
      "admin_users",
      "delivery_management",
      "ai_pricing_recommendations",
      "ai_insights_failures",
      "ai_insights",
      "system_audit_log",
      "business_profile",
    ];

    for (const table of tablesToTruncate) {
      console.log(`   Truncating ${table}...`);

      // Try direct delete since we have service role access (bypasses RLS)
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .neq("created_at", "1970-01-01"); // Hack to delete all rows (better than checking ID if ID types vary)

      if (deleteError) {
        // If 404 or similar, ignore if table doesn't exist (though we expect them to exist)
        console.warn(`   ⚠️  Check ${table}: ${deleteError.message}`);
        // Fallback to RPC if available or just continue
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

    // Create admin role in business
    const { error: roleError } = await supabase.from("user_roles").insert({
      business_id: business.id,
      user_id: adminId,
      role: "manager", // Using 'manager' as it maps to owner privileges in app_role enum logic generally, or 'super_admin' if enum supports it
      // defined in migration: app_role IS 'cashier', 'supervisor', 'manager', 'super_admin'
      permissions: {}, // Permissions handled by role
    });

    if (roleError) {
      console.error("❌ Failed to create user role:", roleError.message);
      process.exit(1);
    }
    console.log("✅ Created business role (manager)");

    // Restore Admin User entry (Super Admin)
    const { error: adminUserError } = await supabase
      .from("admin_users")
      .insert({
        user_id: adminId,
        role: "super_admin",
        permission_level: 100,
      });

    if (adminUserError) {
      console.error("❌ Failed to seed admin_users:", adminUserError.message);
      process.exit(1);
    }

    console.log("✅ Restored super_admin status");

    // Create business settings
    const { error: settingsError } = await supabase
      .from("business_settings")
      .insert({
        business_id: business.id,
        default_tax_rate: 0.08,
        currency: "USD",
        timezone: "America/New_York",
        settings_data: {},
        pos_manager_pin: "1234", // Default PIN
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
    console.log(`   • Business Role: Manager`);
    console.log(`   • System Role: Super Admin`);
    console.log(`   • Tax Rate: 8%`);
    console.log(`   • Manager PIN: 1234`);
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
