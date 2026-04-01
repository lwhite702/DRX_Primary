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

async function inspect() {
  await client.connect();
  console.log("Connected to DB");

  try {
    const res = await client.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('business_profile', 'drawer_events', 'inventory', 'customers', 'sales')
      ORDER BY table_name, column_name;
    `);
    console.table(res.rows);

    const constraints = await client.query(`
      SELECT conname, contype, confrelid::regclass as ref_table
      FROM pg_constraint
      WHERE conname LIKE 'drawer_events%';
    `);
    console.log("Constraints on drawer_events:");
    console.table(constraints.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

inspect();
