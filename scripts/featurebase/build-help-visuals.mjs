import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const assetRoot = path.join(root, "app-docs/_assets/help-center");
const colors = {
  bg: "#0A0A0A",
  surface: "#121212",
  elevated: "#1A1A1A",
  fg: "#F5F5F5",
  muted: "#A3A3A3",
  accent: "#CCFF00",
  border: "#343434",
  warning: "#F59E0B",
  info: "#3B82F6",
};

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function text(
  x,
  y,
  value,
  size = 28,
  color = colors.fg,
  weight = 500,
  anchor = "start",
) {
  return `<text x="${x}" y="${y}" fill="${color}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">${escapeXml(value)}</text>`;
}

function mono(x, y, value, size = 18, color = colors.muted, anchor = "start") {
  return `<text x="${x}" y="${y}" fill="${color}" font-family="Menlo, Consolas, monospace" font-size="${size}" letter-spacing="1.2" text-anchor="${anchor}">${escapeXml(value)}</text>`;
}

function card(x, y, width, height, title, lines = [], tone = "neutral") {
  const stroke =
    tone === "accent"
      ? colors.accent
      : tone === "warning"
        ? colors.warning
        : colors.border;
  const lineNodes = lines
    .map((line, index) =>
      text(x + 30, y + 88 + index * 38, line, 22, colors.muted, 400),
    )
    .join("");
  return `<g><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="14" fill="${colors.surface}" stroke="${stroke}" stroke-width="2"/>${text(x + 30, y + 48, title, 26, colors.fg, 700)}${lineNodes}</g>`;
}

function arrow(x1, y1, x2, y2, color = colors.accent) {
  return `<path d="M ${x1} ${y1} L ${x2} ${y2}" stroke="${color}" stroke-width="4" fill="none" marker-end="url(#arrow)"/>`;
}

function baseSvg(title, description, body, width = 1400, height = 800) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(title)}</title><desc id="desc">${escapeXml(description)}</desc>
  <defs>
    <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M 32 0 L 0 0 0 32" fill="none" stroke="#202020" stroke-width="1"/></pattern>
    <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 z" fill="${colors.accent}"/></marker>
  </defs>
  <rect width="100%" height="100%" fill="${colors.bg}"/><rect width="100%" height="100%" fill="url(#grid)" opacity="0.35"/>
  ${body}
  </svg>`;
}

const diagramSpecs = [
  {
    file: "safe-support-screenshot",
    title: "Prepare a safe support screenshot",
    description:
      "A four-step flow to replace private data, crop the image, check it, and share only through the approved support channel.",
    body: `${text(64, 76, "Prepare a safe support screenshot", 34, colors.fg, 700)}${mono(64, 112, "REPLACE PRIVATE DATA BEFORE CAPTURE")}${card(64, 210, 260, 230, "1  Replace", ["Use fictional records", "No codes or credentials"], "accent")}${arrow(344, 325, 404, 325)}${card(424, 210, 260, 230, "2  Crop", ["Keep the error", "Remove unrelated records"])}${arrow(704, 325, 764, 325)}${card(784, 210, 260, 230, "3  Check", ["Read every visible field", "Check image metadata"])}${arrow(1064, 325, 1124, 325)}${card(1144, 210, 192, 230, "4  Share", ["Approved private", "support channel"])}${card(64, 520, 1272, 160, "Never include", ["Passwords, verification codes, customer details, payment credentials, or unrestricted business records"], "warning")}`,
  },
  {
    file: "privacy-retention-timeline",
    title: "Privacy preset retention timeline",
    description:
      "Alias Mode defaults to 30 days, Standard Mode to 180 days, and Full Customer Mode to 365 days before qualifying inactive records are permanently deleted when cleanup runs.",
    body: `${text(64, 76, "Default retention windows", 34, colors.fg, 700)}${mono(64, 112, "CLEANUP PERMANENTLY DELETES QUALIFYING INACTIVE RECORDS WHEN IT RUNS")}${card(64, 190, 370, 180, "Alias Mode", ["30 days"], "accent")}${card(515, 190, 370, 180, "Standard Mode", ["180 days"])}${card(966, 190, 370, 180, "Full Customer Mode", ["365 days"])}<line x1="120" y1="480" x2="1250" y2="480" stroke="${colors.border}" stroke-width="8" stroke-linecap="round"/><circle cx="260" cy="480" r="16" fill="${colors.accent}"/><circle cx="700" cy="480" r="16" fill="${colors.accent}"/><circle cx="1140" cy="480" r="16" fill="${colors.accent}"/>${mono(260, 530, "30 DAYS", 20, colors.fg, "middle")}${mono(700, 530, "180 DAYS", 20, colors.fg, "middle")}${mono(1140, 530, "365 DAYS", 20, colors.fg, "middle")}${card(275, 610, 850, 120, "Before changing a preset", ["Check balances, required holds, and the saved cleanup settings."], "warning")}`,
  },
  {
    file: "workspace-access-recovery",
    title: "Workspace and access recovery flow",
    description:
      "Check the invited account, active business, and required permission before asking the owner or private support for help.",
    body: `${text(64, 76, "Access problem", 34, colors.fg, 700)}${mono(64, 112, "KEEP USING YOUR OWN ACCOUNT")}${card(64, 230, 270, 210, "Invited account?", ["Use the account tied", "to the invitation"], "accent")}${arrow(354, 335, 414, 335)}${card(434, 230, 270, 210, "Right business?", ["Confirm the active", "business name"])}${arrow(724, 335, 784, 335)}${card(804, 230, 270, 210, "Permission?", ["Read the access", "message"])}${arrow(1094, 335, 1154, 335)}${card(1174, 230, 162, 210, "Still blocked", ["Ask owner", "or support"], "warning")}${card(180, 540, 1040, 140, "Do not work around access", ["Do not create a duplicate owner account, share a login, or use another business as a substitute."], "warning")}`,
  },
  {
    file: "inventory-save-and-count",
    title: "Inventory save and count troubleshooting",
    description:
      "Check the active business, item, saved movement, and current count before submitting another inventory change.",
    body: `${text(64, 76, "Inventory change did not look right", 34, colors.fg, 700)}${mono(64, 112, "CHECK THE SAVED RECORD BEFORE TRYING AGAIN")}${card(64, 215, 280, 220, "1  Business", ["Confirm the active", "business and location"], "accent")}${arrow(364, 325, 424, 325)}${card(444, 215, 280, 220, "2  Item", ["Match product, SKU,", "lot, and quantity"])}${arrow(744, 325, 804, 325)}${card(824, 215, 280, 220, "3  Movement", ["Look for the saved", "intake or adjustment"])}${arrow(1124, 325, 1184, 325)}${card(1204, 215, 132, 220, "4  Count", ["Refresh", "once"], "warning")}${card(230, 545, 940, 130, "If the result is still uncertain", ["Stop. Keep the original records unchanged and ask an authorized manager to review them."], "warning")}`,
  },
  {
    file: "uncertain-checkout-payment",
    title: "Uncertain checkout or payment result",
    description:
      "Check for the saved order or payment before asking for payment again or submitting another record.",
    body: `${text(64, 76, "The result is uncertain", 34, colors.fg, 700)}${mono(64, 112, "DO NOT ASK FOR PAYMENT AGAIN YET")}${card(64, 210, 350, 220, "Check Orders & Receipts", ["Look for the sale", "and its total"], "accent")}${arrow(434, 320, 514, 320)}${card(534, 210, 350, 220, "Check Store Credit", ["Look for the payment", "and remaining balance"])}${arrow(904, 320, 984, 320)}${card(1004, 210, 332, 220, "Choose one next step", ["Found: do not retry", "Missing: contact support"], "warning")}${card(170, 540, 1060, 135, "Keep the original records unchanged", ["A selected payment method records what happened. It does not prove that money moved."], "warning")}`,
  },
  {
    file: "barcode-keyboard-path",
    title: "Barcode scanner keyboard-input path",
    description:
      "A scanner sends a product code like a keyboard, the active field receives it, and DRX matches the code to a product.",
    body: `${text(64, 76, "How a keyboard-style scanner works", 34, colors.fg, 700)}${mono(64, 112, "TEST WITH A NON-SALE FIELD FIRST")}${card(64, 220, 310, 220, "Scanner", ["Reads the barcode", "and sends characters"], "accent")}${arrow(394, 330, 484, 330)}${card(504, 220, 310, 220, "Active field", ["Receives the code", "like keyboard input"])}${arrow(834, 330, 924, 330)}${card(944, 220, 392, 220, "DRX product match", ["Correct code: item found", "No match: check product code"], "warning")}${card(210, 545, 980, 130, "Before using it during a sale", ["Confirm the full code appears once and the matched product is correct."], "accent")}`,
  },
];

function nav(active) {
  return [
    "Dashboard",
    "Orders & Receipts",
    "Point of Sale",
    "Inventory",
    "Customers",
    "Store Credit",
    "Reports",
    "Settings",
  ]
    .map(
      (label, index) =>
        `<rect x="40" y="${128 + index * 58}" width="220" height="44" rx="8" fill="${label === active ? colors.accent : "transparent"}"/>${text(58, 157 + index * 58, label, 18, label === active ? colors.bg : colors.muted, label === active ? 700 : 500)}`,
    )
    .join("");
}

function fixtureShell(
  title,
  active,
  content,
  eyebrow = "ILLUSTRATIVE SCREEN · FICTIONAL DATA",
) {
  return baseSvg(
    title,
    `${title}, an illustrative DRX screen using fictional data.`,
    `<rect x="0" y="0" width="300" height="800" fill="#0D0D0D"/><circle cx="52" cy="58" r="13" fill="${colors.accent}"/>${text(78, 68, "DRX", 28, colors.fg, 800)}${mono(40, 104, "BETA", 14, colors.warning)}${nav(active)}${mono(330, 58, eyebrow, 14, colors.accent)}${text(330, 108, title, 40, colors.fg, 700)}${content}`,
    1400,
    800,
  );
}

const fixtureSpecs = [
  {
    file: "privacy-settings",
    svg: fixtureShell(
      "Privacy Protocol Dashboard",
      "Settings",
      `${card(330, 145, 320, 165, "Alias Mode", ["Aliases only · 30 days"], "accent")}${card(675, 145, 320, 165, "Standard Mode", ["Optional contact · 180 days"])}${card(1020, 145, 330, 165, "Full Customer Mode", ["Full details · 365 days"])}${card(330, 345, 1020, 345, "Retention cleanup", ["Enable retention cleanup", "Days · 180", "Frequency · Weekly", "Local hour (0-23) · 2", "Hard delete inactive records"], "warning")}<rect x="1020" y="615" width="300" height="56" rx="8" fill="${colors.accent}"/>${text(1170, 650, "Save Settings", 20, colors.bg, 700, "middle")}`,
    ),
  },
  {
    file: "workspace-team",
    svg: fixtureShell(
      "Workspaces and team access",
      "Settings",
      `${card(330, 155, 470, 245, "Select a business", ["My Businesses", "Downtown operation", "Market pop-up"], "accent")}${card(830, 155, 520, 245, "Manage Team", ["Team Members", "Owner · Lee", "Manager · Jordan"])}${card(330, 435, 1020, 250, "Invite a Team Member", ["Email address · teammate@example.com", "Role · Staff", "Each person creates their own password."], "accent")}<rect x="1045" y="610" width="275" height="58" rx="8" fill="${colors.accent}"/>${text(1182, 647, "Send Invitation", 20, colors.bg, 700, "middle")}`,
    ),
  },
  {
    file: "customers-credit",
    svg: fixtureShell(
      "Customers and store credit",
      "Customers",
      `${card(330, 150, 470, 240, "Add customer", ["Alias · North Star", "Phone number · Optional", "Collect only what you need."], "accent")}${card(830, 150, 520, 240, "Customer account", ["Alias · North Star", "Open balance · $240.00", "Previous payments · 1"])}${card(330, 430, 1020, 260, "Record Payment", ["Customer · North Star", "Amount ($) · 80.00", "Payment Method · Cash", "This records money already received."], "warning")}<rect x="1045" y="610" width="275" height="58" rx="8" fill="${colors.accent}"/>${text(1182, 647, "Record Payment", 20, colors.bg, 700, "middle")}`,
    ),
  },
  {
    file: "sales-history",
    svg: fixtureShell(
      "Orders & Receipts",
      "Orders & Receipts",
      `${card(330, 155, 1020, 120, "Recent sales", ["Search saved orders and open Sale Details."], "accent")}${card(330, 305, 1020, 315, "Sale Details", ["Order                 DRX-1048", "Status                 Completed", "Payment method  Cash", "Items                    3", "Total                    $108.25"], "neutral")}${card(330, 650, 1020, 90, "Check the saved record before making a correction", [], "warning")}`,
    ),
  },
  {
    file: "deliveries",
    svg: fixtureShell(
      "Sales and deliveries",
      "Orders & Receipts",
      `${card(330, 150, 470, 250, "Sale", ["Order DRX-1054", "Status · Completed", "Total · $84.00"], "accent")}${card(830, 150, 520, 250, "Delivery details", ["Address · Fictional", "Status · Ready", "Expense · $8.00"])}${arrow(800, 275, 830, 275)}${card(330, 440, 1020, 230, "Update an enabled delivery task", ["Confirm the sale before changing delivery details.", "Do not create another sale for the same delivery."], "warning")}`,
    ),
  },
];

async function loadSharp() {
  try {
    return (await import("sharp")).default;
  } catch {
    const pnpmRoot = path.join(
      fs.realpathSync(path.join(root, "node_modules")),
      ".pnpm",
    );
    const packageDir = fs
      .readdirSync(pnpmRoot)
      .find((entry) => entry.startsWith("sharp@"));
    if (!packageDir)
      throw new Error("sharp is required to build Help Center visuals");
    const modulePath = path.join(
      pnpmRoot,
      packageDir,
      "node_modules/sharp/lib/index.js",
    );
    return (await import(pathToFileURL(modulePath).href)).default;
  }
}

const sharp = await loadSharp();
fs.mkdirSync(path.join(assetRoot, "diagrams"), { recursive: true });
fs.mkdirSync(path.join(assetRoot, "screenshots/source"), { recursive: true });

for (const spec of diagramSpecs) {
  const svgPath = path.join(assetRoot, "diagrams", `${spec.file}.svg`);
  const pngPath = path.join(assetRoot, "diagrams", `${spec.file}.png`);
  const svg = baseSvg(spec.title, spec.description, spec.body);
  fs.writeFileSync(svgPath, svg);
  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(pngPath);
}

for (const spec of fixtureSpecs) {
  const svgPath = path.join(
    assetRoot,
    "screenshots/source",
    `${spec.file}.svg`,
  );
  const pngPath = path.join(assetRoot, "screenshots", `${spec.file}.png`);
  fs.writeFileSync(svgPath, spec.svg);
  await sharp(Buffer.from(spec.svg))
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(pngPath);
}

const visualFixtureRoot = path.join(
  root,
  "apps/app/tests/e2e/visual-regression.spec.ts-snapshots",
);
for (const [source, output] of [
  ["dashboard-desktop-chromium.png", "dashboard-reports.png"],
  ["inventory-desktop-chromium.png", "inventory-intake.png"],
  ["pos-sale-desktop-chromium.png", "quick-sale.png"],
]) {
  await sharp(path.join(visualFixtureRoot, source))
    .extract({ left: 255, top: 20, width: 1160, height: 760 })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(assetRoot, "screenshots", output));
}

for (const input of fs
  .readdirSync(path.join(assetRoot, "headers"))
  .filter((name) => name.endsWith(".png"))) {
  const source = path.join(assetRoot, "headers", input);
  const destination = path.join(
    assetRoot,
    "headers",
    input.replace(/\.png$/, ".webp"),
  );
  await sharp(source)
    .resize(1600, 640, { fit: "cover", position: "centre" })
    .webp({ quality: 82, effort: 6 })
    .toFile(destination);
  fs.rmSync(source);
}

console.log(JSON.stringify({ headers: 6, screenshots: 8, diagrams: 6 }));
