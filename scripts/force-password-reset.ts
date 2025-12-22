import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function reset() {
  console.log("Forcing password reset for lee@wrelik.com...");

  const {
    data: { users },
    error: listError,
  } = await supabase.auth.admin.listUsers();
  const user = users.find((u) => u.email === "lee@wrelik.com");

  if (!user) {
    console.error("User not found");
    process.exit(1);
  }

  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    password: "password123",
  });

  if (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }

  console.log("✅ Password updated to: password123");
}

reset();
