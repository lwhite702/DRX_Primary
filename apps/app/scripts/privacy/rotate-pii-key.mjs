import "dotenv/config";
import { randomBytes } from "node:crypto";

function generateKeyB64() {
  return randomBytes(32).toString("base64");
}

function main() {
  const current = process.env.DRX_PII_KEY_CURRENT_B64?.trim() || "";

  if (!current) {
    console.error(
      "[drx:rotate-pii-key] DRX_PII_KEY_CURRENT_B64 is required in environment.",
    );
    process.exit(1);
  }

  const nextCurrent = generateKeyB64();

  console.log("# DRX PII key rotation output");
  console.log("# 1) Set these in your secret manager/environment.");
  console.log(`# DRX_PII_KEY_CURRENT_B64=${nextCurrent}`);
  console.log(`# DRX_PII_KEY_PREVIOUS_B64=${current}`);
  console.log("# 2) Keep DRX_PII_HASH_KEY_B64 unchanged.");
  console.log(
    "# 3) Deploy app, run encryption verification, then clear PREVIOUS key after migration window.",
  );
  console.log("#");
  console.log("# Example (Doppler)");
  console.log(
    '# doppler secrets set DRX_PII_KEY_CURRENT_B64="<new>" DRX_PII_KEY_PREVIOUS_B64="<old>"',
  );
  console.log("# Example (Vercel)");
  console.log(
    '# vercel env add DRX_PII_KEY_CURRENT_B64 production && vercel env add DRX_PII_KEY_PREVIOUS_B64 production',
  );
}

main();
