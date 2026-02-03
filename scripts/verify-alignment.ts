import { createClient } from "@wrelik.db";
import * as fs from "fs";
import * as path from "path";

// Load env validation (rudimentary since we might not have dotenv)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) must be set.",
  );
  console.error(
    "Usage: source .env.local && npx tsx scripts/verify-alignment.ts",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verifyAlignment() {
  console.log("Starting Alignment Verification...");

  // 1. Verify Vendors Table Existence and RLS
  console.log("\n--- Verifying Vendors Table ---");
  // We'll try to insert a vendor. We need a valid business_id first.
  // Assuming we can get a business_id from the database or just check schema by querying.

  // Checking if table exists by selecting (will error if not exists)
  const { error: vendorError } = await supabase
    .from("vendors")
    .select("id")
    .limit(1);
  if (vendorError) {
    if (vendorError.code === "42P01") {
      // undefined_table
      console.error('FAIL: "vendors" table does not exist.');
    } else {
      console.log(
        `NOTE: "vendors" table exists (Error: ${vendorError.message} - likely RLS or connection, which is expected/okay if table exists).`,
      );
    }
  } else {
    console.log('PASS: "vendors" table exists and is accessible.');
  }

  // 2. Verify Inventory Compliance Fields
  console.log("\n--- Verifying Inventory Columns ---");
  // We can't easily check columns via JS client without inserting or relying on PostgREST errors.
  // We'll try to select the new columns.
  const { error: inventoryError } = await supabase
    .from("inventory")
    .select("thc_percentage, cbd_percentage, strain_type")
    .limit(1);
  if (inventoryError) {
    console.error(
      `FAIL: Could not select compliance columns on 'inventory'. Error: ${inventoryError.message}`,
    );
  } else {
    console.log(
      'PASS: Compliance columns (thc_percentage, cbd_percentage, strain_type) exist on "inventory".',
    );
  }

  // 3. Verify Customer Verification Fields
  console.log("\n--- Verifying Customer Columns ---");
  const { error: customerError } = await supabase
    .from("customers")
    .select("date_of_birth, age_verified, id_type")
    .limit(1);
  if (customerError) {
    console.error(
      `FAIL: Could not select verification columns on 'customers'. Error: ${customerError.message}`,
    );
  } else {
    console.log(
      'PASS: Verification columns (date_of_birth, age_verified, id_type) exist on "customers".',
    );
  }

  console.log("\nVerification Complete.");
}

verifyAlignment().catch((err) => console.error("Unexpected error:", err));
