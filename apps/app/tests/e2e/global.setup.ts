import { clerkSetup } from "@clerk/testing/playwright";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local or .env
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export default async function globalSetup() {
  if (!process.env.CLERK_PUBLISHABLE_KEY) {
    console.warn("CLERK_PUBLISHABLE_KEY not set; skipping Clerk Playwright setup.");
    return;
  }
  await clerkSetup();
}
