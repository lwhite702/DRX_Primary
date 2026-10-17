import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local or .env
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

async function globalSetup() {
  // Clerk testing expects CLERK_PUBLISHABLE_KEY; local app config uses NEXT_PUBLIC_*.
  process.env.CLERK_PUBLISHABLE_KEY ??=
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  const hasClerkTestingKeys =
    Boolean(process.env.CLERK_PUBLISHABLE_KEY) &&
    Boolean(process.env.CLERK_SECRET_KEY);

  if (!hasClerkTestingKeys) {
    console.warn(
      "[playwright globalSetup] Skipping clerkSetup(): missing CLERK_PUBLISHABLE_KEY and/or CLERK_SECRET_KEY",
    );
    return;
  }

  const { clerkSetup } = await import("@clerk/testing/playwright");
  await clerkSetup();
}

export default globalSetup;

if (typeof module !== "undefined" && module.exports) {
  module.exports = globalSetup;
  module.exports.default = globalSetup;
}
