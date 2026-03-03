import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function fix() {
  await client.connect();
  console.log("Connected to DB");

  try {
    console.log("Attempting to convert business_profile.id to UUID...");
    await client.query(
      "ALTER TABLE business_profile ALTER COLUMN id TYPE UUID USING id::uuid",
    );
    console.log("Success!");
  } catch (err) {
    console.error("FAILED to convert business_profile.id:");
    console.error(err.message);
    console.error(err.detail);

    // Find what is referencing it
    console.log("\nChecking for dependent constraints...");
    const res = await client.query(`
        SELECT
            conname AS constraint_name,
            conrelid::regclass AS table_name,
            confrelid::regclass AS referenced_table
        FROM
            pg_constraint
        WHERE
            confrelid = 'business_profile'::regclass;
    `);
    console.table(res.rows);
  } finally {
    await client.end();
  }
}

fix();
