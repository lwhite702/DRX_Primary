import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const failures = [];

const requiredTokens = [
  ["background", "#0A0A0A", "10 / 255, green: 10 / 255, blue: 10 / 255"],
  ["surface", "#121212", "18 / 255, green: 18 / 255, blue: 18 / 255"],
  ["surfaceElevated", "#1A1A1A", "26 / 255, green: 26 / 255, blue: 26 / 255"],
  ["foreground", "#F5F5F5", "245 / 255, green: 245 / 255, blue: 245 / 255"],
  ["accent", "#CCFF00", "204 / 255, green: 255 / 255, blue: 0 / 255"],
  ["success", "#10B981", "16 / 255, green: 185 / 255, blue: 129 / 255"],
  ["warning", "#F59E0B", "245 / 255, green: 158 / 255, blue: 11 / 255"],
  ["destructive", "#EF4444", "239 / 255, green: 68 / 255, blue: 68 / 255"],
  ["info", "#3B82F6", "59 / 255, green: 130 / 255, blue: 246 / 255"],
];

const canonical = read("packages/brand/src/index.ts");
const brandCss = read("packages/brand/tokens.css").toUpperCase();
const marketingCss = read("apps/marketing/app/globals.css").toUpperCase();
const appCss = read("apps/app/app/globals.css").toUpperCase();
const swift = read("apps/ios/DRXApp/DesignSystem/Tokens/DRXPalette.swift");

for (const [name, hex, swiftTuple] of requiredTokens) {
  if (!canonical.includes(`${name}: \"${hex}\"`)) failures.push(`canonical token missing: ${name} ${hex}`);
  if (!brandCss.includes(hex)) failures.push(`generated CSS token drift: ${hex}`);
  if (!swift.includes(swiftTuple)) failures.push(`native token drift: ${name}`);
}

for (const [surface, css] of [["marketing", marketingCss], ["web", appCss]]) {
  if (!css.includes('@IMPORT "@DEELRX/BRAND/TOKENS.CSS"')) {
    failures.push(`${surface} does not consume @deelrx/brand/tokens.css`);
  }
}

const brandSvgs = [
  "apps/marketing/public/brand/drx-mark.svg",
  "apps/marketing/public/brand/drx-wordmark.svg",
  "apps/app/public/brand/drx-mark.svg",
  "apps/app/public/brand/drx-wordmark.svg",
  "apps/ios/DRXApp/Assets.xcassets/DRXWordmark.imageset/drx-wordmark.svg",
];

for (const path of brandSvgs) {
  const svg = read(path);
  if (!svg.includes("#F5F5F5") || !svg.includes("#CCFF00")) failures.push(`brand color variant invalid: ${path}`);
  if (/filter=|feGaussianBlur|checkerboard/i.test(svg)) failures.push(`master asset contains a forbidden effect: ${path}`);
}

const icon = readFileSync(resolve(root, "apps/ios/DRXApp/Assets.xcassets/AppIcon.appiconset/AppIcon.png"));
if (icon.toString("ascii", 1, 4) !== "PNG") failures.push("iOS app icon is not PNG");
const width = icon.readUInt32BE(16);
const height = icon.readUInt32BE(20);
const colorType = icon[25];
if (width !== 1024 || height !== 1024) failures.push(`iOS app icon must be 1024x1024, got ${width}x${height}`);
if (colorType === 4 || colorType === 6) failures.push("iOS app icon must be opaque");

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("DRX brand contract, exports, and native icon passed.");
