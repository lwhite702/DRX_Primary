import "dotenv/config";
import { db } from "../lib/db";

async function main() {
  try {
    console.log("Verifying database connection...");

    // Check key tables
    const businessCount = await db.businessProfile.count();
    console.log(`Business Profiles: ${businessCount}`);

    const auditCount = await db.systemAuditLog.count();
    console.log(`Audit Logs: ${auditCount}`);

    const userRoles = await db.userRole.count();
    console.log(`User Roles: ${userRoles}`);

    console.log("Database integrity check passed.");
    process.exit(0);
  } catch (error) {
    console.error("Database verification failed:", error);
    process.exit(1);
  }
}

main();
