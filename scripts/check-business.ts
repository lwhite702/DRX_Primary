import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function check() {
  const { data, error } = await supabase
    .from("business_profile")
    .select("business_name")
    .single();
  if (error) console.log(error.message);
  else console.log(`Business Name: ${data.business_name}`);
}

check();
