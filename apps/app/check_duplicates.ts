import { db } from "@wrelik/db";

async function checkDuplicates() {
  // Get all business profiles
  const businesses = await db.businessProfile.findMany({
    select: { id: true, business_name: true, owner_id: true, is_active: true },
  });

  console.log(`Found ${businesses.length} businesses.`);

  // Group by owner_id
  const byOwner: Record<string, any[]> = {};
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
