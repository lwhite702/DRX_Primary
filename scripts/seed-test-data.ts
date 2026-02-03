import { createClient } from "@wrelik.db";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function seed() {
  // 1. Get the admin user (should exist from reset)
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("user_id")
    .limit(1)
    .single();

  if (!adminUser) {
    // Fallback to user_profiles if admin_users is empty (it shouldn't be if reset worked properly but let's be safe)
    // Actually, production-reset uses email lookup.
    console.log("Looking up admin via email...");
  }

  // 1. Try to find ANY business
  const { data: businesses, error: businessError } = await supabase
    .from("business_profile")
    .select("id")
    .limit(1);

  if (businessError || !businesses || businesses.length === 0) {
    console.error("No business found in database. Cannot seed inventory.");
    // Log the error to help debug
    if (businessError) console.error("Supabase Error:", businessError);
    process.exit(1);
  }

  const business = businesses[0];
  console.log("Found business:", business.id);

  console.log("Seeding inventory for business:", business.id);

  // 2. Insert an inventory item
  const { data: item, error } = await supabase
    .from("inventory")
    .insert({
      business_id: business.id,
      product_name: "Test Widget",
      sku: "TEST-001",
      description: "A test item for verification",
      quantity_on_hand: 50,
      unit_price: 20.0,
      unit_cost: 10.0, // Important: Cost is $10
      reorder_point: 5,
      category: "Test",
    })
    .select()
    .single();

  if (error) {
    console.error("Error seeding inventory:", error);
    process.exit(1);
  }

  console.log("Seeded item:", item);
}

seed();
