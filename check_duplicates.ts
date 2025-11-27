import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicates() {
  // Get all business profiles
  const { data: businesses, error } = await supabase
    .from("business_profile")
    .select("*");

  if (error) {
    console.error("Error fetching businesses:", error);
    return;
  }

  console.log(`Found ${businesses.length} businesses.`);

  // Group by owner_id
  const byOwner = {};
  businesses.forEach((b) => {
    if (!byOwner[b.owner_id]) byOwner[b.owner_id] = [];
    byOwner[b.owner_id].push(b);
  });

  Object.keys(byOwner).forEach((ownerId) => {
    const owned = byOwner[ownerId];
    if (owned.length > 1) {
      console.log(`Owner ${ownerId} has ${owned.length} businesses:`);
      owned.forEach((b) =>
        console.log(` - ${b.id}: ${b.business_name} (Active: ${b.is_active})`)
      );
    }
  });
}

checkDuplicates();
