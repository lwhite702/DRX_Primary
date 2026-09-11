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
  "DRX Privacy ProteXion",
  "ProteXion Mode",
  "Vault Mode",
  "Minimal Data Engine",
  "Something went wrong",
  "An error occurred",
  "successfully completed",
  "streamline your operations",
  "unlock growth",
  "all-in-one platform",
  "secure terminal access",
  "system entry",
  "enterprise energy",
];

const REPOSITORY_WIDE_PHRASES = [
  "DRX CRM",
  "DRX Privacy ProteXion",
  "ProteXion Mode",
  "DRX Vault Mode",
  "Minimal Data Engine",
  "Quick Sale",
  "Operator Dashboard",
  "Credit Management",
  "Store Credit",
  "Privacy Profile",
  "Something went wrong",
  "An error occurred",
  "successfully completed",
  "completely anonymous",
  "impossible to trace",
  "law-enforcement proof",
  "unhackable",
  "guaranteed private",
];

const CUSTOMER_COPY_ROOTS = [
  "apps/app/app",
  "apps/app/components",
  "apps/app/lib/help",
  "apps/marketing/app",
  "apps/marketing/components",
  "apps/marketing/lib",
  "apps/mobile/app",
  "apps/ios/DRXApp",
  "mintlify",
];

const COPY_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".swift",
  ".md",
  ".mdx",
  ".json",
]);
const IGNORED_PATH_PARTS = new Set([
  "api",
  "__tests__",
  "tests",
  "db",
  "migrations",
  "archive",
]);

const CORE_COPY_FILES = [
  "packages/content/src/index.ts",
  "apps/app/lib/copy/drx.ts",
  "apps/app/lib/privacy/profiles.ts",
  "apps/app/components/onboarding/steps/PrivacyStep.tsx",
  "apps/app/components/layout/nav-items.ts",
  "apps/app/components/layout/bottom-nav.tsx",
  "apps/app/components/ui/error-state.tsx",
  "apps/app/app/onboarding/_components/OnboardingForm.tsx",
  "apps/app/lib/help/support-center.ts",
  "apps/marketing/lib/marketing-content.ts",
  "apps/marketing/lib/app-store-metadata.ts",
  "apps/marketing/components/marketing/privacy-protexion.tsx",
  "apps/mobile/app/login.tsx",
  "apps/mobile/app/(tabs)/_layout.tsx",
  "apps/mobile/app/(tabs)/inventory/index.tsx",
  "apps/mobile/app/inventory-check.tsx",
  "apps/ios/DRXApp/App/AppRootView.swift",
  "apps/ios/DRXApp/Features/Dashboard/DashboardView.swift",
  "apps/ios/DRXApp/Features/Inventory/InventoryView.swift",
  "apps/ios/DRXApp/Features/Credit/CreditView.swift",
  "apps/ios/DRXApp/Features/Onboarding/NativeOnboardingView.swift",
  "apps/ios/DRXApp/Features/Reports/ReportsView.swift",
  "mintlify/drx-privacy-protexion-protocol.mdx",
  "mintlify/glossary.mdx",
];

const REQUIRED_FRAGMENTS = [
  {
    file: ".github/workflows/copy-voice.yml",
    fragments: ["push:", "branches: [main, development, staging]"],
  },
  {
    file: "packages/content/src/index.ts",
    fragments: [
      'home: "Home"',
      'products: "Products"',
      'newSale: "New sale"',
      'payments: "Payments"',
      'hideDetails: "Hide details"',
      'protectDetails: "Protect details"',
      'whatIsSaved: "What’s saved"',
      'deleteOldRecords: "Delete old records"',
    ],
  },
  {
    file: "apps/app/lib/privacy/profiles.ts",
    fragments: [
      'import { drxCopy } from "@/lib/copy/drx";',
      "const privacyPresetCopy = drxCopy.onboarding.privacy.presets;",
    ],
  },
  {
    file: "docs/content/DRX_COPY_AUDIT.md",
    fragments: [
      "## 1. Brand voice findings",
      "## 2. Conflicting terminology",
      "## 3. Marketing alignment findings",
      "## 4. Approved content system",
      "## 5. Rewritten copy",
      "## 6. Cross-surface consistency matrix",
      "## 7. Remaining decisions",
    ],
  },
  {
    file: "apps/ios/DRXApp/Content/DRXContent.swift",
    fragments: [
      'static let home = "Home"',
      'static let products = "Products"',
      'static let newSale = "New sale"',
      'static let payments = "Payments"',
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
        console.error(
          `❌ Corporate term "${term}" in ${relativePath}:${index + 1}`,
        );
        console.error(`   > ${line.trim()}`);
        violationsCount += 1;
      }
    }

    for (const phrase of FORBIDDEN_PHRASES) {
      if (line.toLowerCase().includes(phrase.toLowerCase())) {
        console.error(
          `❌ Off-brand phrase "${phrase}" in ${relativePath}:${index + 1}`,
        );
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
        console.error(
          `❌ Required copy contract missing in ${requirement.file}: ${fragment}`,
        );
        violationsCount += 1;
      }
    }
  }
}

function walkFiles(relativeRoot) {
  const absoluteRoot = path.join(__dirname, "..", relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return [];

  const files = [];
  for (const entry of fs.readdirSync(absoluteRoot, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const relativePath = path.join(relativeRoot, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_PATH_PARTS.has(entry.name))
        files.push(...walkFiles(relativePath));
      continue;
    }
    if (COPY_EXTENSIONS.has(path.extname(entry.name))) files.push(relativePath);
  }
  return files;
}

function checkRepositoryWidePhrases() {
  const checked = new Set();
  for (const relativePath of CUSTOMER_COPY_ROOTS.flatMap(walkFiles)) {
    if (checked.has(relativePath)) continue;
    checked.add(relativePath);
    const lines = fs
      .readFileSync(path.join(__dirname, "..", relativePath), "utf8")
      .split("\n");
    lines.forEach((line, index) => {
      if (line.includes("copy-lint-disable")) return;
      for (const phrase of REPOSITORY_WIDE_PHRASES) {
        if (line.toLowerCase().includes(phrase.toLowerCase())) {
          console.error(
            `❌ Unsafe public phrase "${phrase}" in ${relativePath}:${index + 1}`,
          );
          console.error(`   > ${line.trim()}`);
          violationsCount += 1;
        }
      }
    });
  }
}

function checkCopyInventory() {
  const inventoryPath = path.join(
    __dirname,
    "..",
    "docs/content/copy-inventory.json",
  );
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
  const requiredFields = [
    "id",
    "surface",
    "source",
    "context",
    "currentText",
    "replacementText",
    "feature",
    "severity",
    "platform",
    "plan",
    "evidence",
    "reviewState",
  ];
  const ids = new Set();

  for (const entry of inventory.entries ?? []) {
    for (const field of requiredFields) {
      if (!entry[field]) {
        console.error(
          `❌ Copy inventory entry is missing ${field}: ${entry.id ?? "unknown"}`,
        );
        violationsCount += 1;
      }
    }
    if (ids.has(entry.id)) {
      console.error(`❌ Duplicate copy inventory ID: ${entry.id}`);
      violationsCount += 1;
    }
    ids.add(entry.id);
  }

  if (ids.size < 10) {
    console.error(
      "❌ Copy inventory must cover at least 10 cross-surface decisions.",
    );
    violationsCount += 1;
  }
}

console.log(
  "🔍 Checking DRX core copy across marketing, web, Expo, and iOS...",
);
CORE_COPY_FILES.forEach(checkFile);
checkRepositoryWidePhrases();
checkRequiredFragments();
checkCopyInventory();

if (violationsCount > 0) {
  console.error(`\n❌ Copy lint failed with ${violationsCount} violation(s).`);
  process.exit(1);
}

console.log("✅ Core DRX copy matches the cross-surface voice guardrails.");
process.exit(0);
