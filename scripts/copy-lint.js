const fs = require("fs");
const path = require("path");

const FORBIDDEN_TERMS = [
  "authenticate",
  "enterprise",
  "immutable",
  "infrastructure",
  "leverage",
  "methodology",
  "omnichannel",
  "optimize",
  "robust",
  "scalable",
  "synergy",
];

const FORBIDDEN_PHRASES = [
  "DRX CRM",
  "streamline your operations",
  "unlock growth",
  "all-in-one platform",
  "secure terminal access",
  "system entry",
  "enterprise energy",
];

const CORE_COPY_FILES = [
  "apps/app/lib/copy/drx.ts",
  "apps/app/components/onboarding/steps/PrivacyStep.tsx",
  "apps/marketing/lib/marketing-content.ts",
  "apps/marketing/app/product/page.tsx",
  "apps/marketing/components/marketing/features.tsx",
  "apps/mobile/app/login.tsx",
  "apps/ios/DRXApp/Features/Reports/ReportsView.swift",
];

let violationsCount = 0;

function checkFile(relativePath) {
  const filePath = path.join(__dirname, "..", relativePath);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Copy source missing: ${relativePath}`);
    violationsCount += 1;
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    if (line.includes("copy-lint-disable")) return;

    for (const term of FORBIDDEN_TERMS) {
      const regex = new RegExp(`\\b${term}\\b`, "i");
      if (regex.test(line)) {
        console.error(`❌ Corporate term "${term}" in ${relativePath}:${index + 1}`);
        console.error(`   > ${line.trim()}`);
        violationsCount += 1;
      }
    }

    for (const phrase of FORBIDDEN_PHRASES) {
      if (line.toLowerCase().includes(phrase.toLowerCase())) {
        console.error(`❌ Off-brand phrase "${phrase}" in ${relativePath}:${index + 1}`);
        console.error(`   > ${line.trim()}`);
        violationsCount += 1;
      }
    }
  });
}

console.log("🔍 Checking DRX core copy across marketing, web, Expo, and iOS...");
CORE_COPY_FILES.forEach(checkFile);

if (violationsCount > 0) {
  console.error(`\n❌ Copy lint failed with ${violationsCount} violation(s).`);
  process.exit(1);
}

console.log("✅ Core DRX copy matches the cross-surface voice guardrails.");
process.exit(0);
