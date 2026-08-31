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
  "apps/app/lib/privacy/profiles.ts",
  "apps/app/components/onboarding/steps/PrivacyStep.tsx",
  "apps/marketing/lib/marketing-content.ts",
  "apps/marketing/app/product/page.tsx",
  "apps/marketing/components/marketing/features.tsx",
  "apps/mobile/app/login.tsx",
  "apps/ios/DRXApp/Features/Reports/ReportsView.swift",
];

const REQUIRED_FRAGMENTS = [
  {
    file: ".github/workflows/copy-voice.yml",
    fragments: ["push:", "branches: [main, development, staging]"],
  },
  {
    file: "apps/app/lib/copy/drx.ts",
    fragments: [
      'title: "Inventory"',
      'label: "FULL CUSTOMER MODE"',
      "permanently deleted after 30 days",
      "permanently deleted after 180 days",
      "permanently deleted after 365 days",
    ],
  },
  {
    file: "apps/app/lib/privacy/profiles.ts",
    fragments: [
      'import { drxCopy } from "@/lib/copy/drx";',
      "const privacyPresetCopy = drxCopy.onboarding.privacy.presets;",
    ],
  },
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

function checkRequiredFragments() {
  for (const requirement of REQUIRED_FRAGMENTS) {
    const filePath = path.join(__dirname, "..", requirement.file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Required source missing: ${requirement.file}`);
      violationsCount += 1;
      continue;
    }

    const content = fs.readFileSync(filePath, "utf8");
    for (const fragment of requirement.fragments) {
      if (!content.includes(fragment)) {
        console.error(`❌ Required copy contract missing in ${requirement.file}: ${fragment}`);
        violationsCount += 1;
      }
    }
  }
}

console.log("🔍 Checking DRX core copy across marketing, web, Expo, and iOS...");
CORE_COPY_FILES.forEach(checkFile);
checkRequiredFragments();

if (violationsCount > 0) {
  console.error(`\n❌ Copy lint failed with ${violationsCount} violation(s).`);
  process.exit(1);
}

console.log("✅ Core DRX copy matches the cross-surface voice guardrails.");
process.exit(0);
