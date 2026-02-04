import { createClient } from "@wrelik.db";

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function check() {
  console.log("Checking database state...");

  const tables = [
    "sales",
    "inventory",
    "customers",
    "business_profile",
    "admin_users",
    "user_roles",
  ];

  for (const t of tables) {
    const { count, error } = await supabase
      .from(t)
      .select("*", { count: "exact", head: true });
    if (error) console.log(`${t}: Error ${error.message}`);
    else console.log(`${t}: ${count} rows`);
  }

  const { data: users, error: userError } =
    await supabase.auth.admin.listUsers();
  if (userError) console.log("Auth users error:", userError.message);
  else {
    const admin = users.users.find((u) => u.email === "lee@wrelik.com");
    console.log(
      `Admin user found: ${!!admin} (Total users: ${users.users.length})`
    );
  }
}

check();
