import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local or .env
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

setup("global setup", async ({}) => {
  await clerkSetup();
});
