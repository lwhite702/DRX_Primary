import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const { Client } = pg;

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root
dotenv.config({ path: path.join(__dirname, ".env") });

const connectionString = process.env.DATABASE_URL;

const config = connectionString
  ? {
      connectionString,
      ssl: { rejectUnauthorized: false },
    }
  : {
      user: "postgres",
      password: "4xalTLbiuPJ7rd7r",
      host: "db.momkmatyoisoynyfbvta.supabase.co",
      port: 5432,
      database: "postgres",
      ssl: {
        rejectUnauthorized: false,
      },
    };

const MIGRATIONS = [
  "00_supabase_shim.sql",
  "01_business_profile.sql",
  "02_inventory.sql",
  "03_customers.sql",
  "04_credit.sql",
  "05_sales.sql",
  "06_ai_insights.sql",
  "07_admin.sql",
  "08_rls_policies.sql",
  "09_rpc_functions.sql",
  "10_ai_credit_rpcs.sql",
  "10_delivery_management.sql",
  "11_pos_enhanced_rpc.sql",
  "12_pos_weight_shrinkage_loyalty.sql",
  "13_pos_weight_shrinkage_loyalty_rpc.sql",
  "14_pos_weight_checkout_rpc.sql",
  "17_add_payment_ref.sql",
];

// Path to schema files relative to root
const schemaDir = path.join(__dirname, "apps/app/db/schema");

async function runMigrations() {
  const client = new Client(config);
  try {
    const targetHost = config.connectionString
      ? new URL(config.connectionString).hostname
      : config.host;

    console.log(`🚀 Connecting to: ${targetHost}`);
    await client.connect();
    console.log("✅ Connected");

    for (const migration of MIGRATIONS) {
      console.log(`▶️  Running: ${migration}`);
      const filePath = path.join(schemaDir, migration);

      if (!fs.existsSync(filePath)) {
        console.warn(`   ⚠️  File not found: ${filePath}`);
        continue;
      }

      const sql = fs.readFileSync(filePath, "utf8");

      try {
        await client.query(sql);
        console.log("   ✅ Success");
      } catch (err) {
        if (
          err.message.includes("already exists") ||
          err.message.includes("already a member") ||
          err.message.includes("already exists")
        ) {
          console.log("   ✅ Already applied (skipped)");
        } else {
          console.error(`   ❌ Error: ${err.message}`);
        }
      }
    }

    console.log("\n✅ All migrations completed!");
  } catch (err) {
    if (err.message.includes("password authentication failed")) {
      console.error("\n❌ Error: Database password authentication failed.");
      console.error(
        "   Please ensure the password in .env or migrate.mjs is correct.",
      );
    } else {
      console.error("\n❌ Migration failed:", err.message);
    }
  } finally {
    await client.end();
  }
}

runMigrations();
