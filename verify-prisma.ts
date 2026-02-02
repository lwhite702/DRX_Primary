import { db } from "./lib/db";

async function main() {
  try {
    // Just type-check access, don't actually run against DB if URL is invalid
    console.log("Checking Prisma Client instantiation...");

    // Check if models exist on the client instance (runtime check)
    if (db.businessProfile && db.inventory) {
      console.log("Prisma Models verified.");
    } else {
      console.error("Prisma Models MISSING.");
      process.exit(1);
    }

    console.log("Prisma Client is ready.");
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
