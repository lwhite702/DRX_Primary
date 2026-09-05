#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";

export const RELEASE_EVIDENCE_SCHEMA_VERSION = 1;
export const REQUIRED_DESTINATIONS = [
  "web-production",
  "ios-app-store",
  "android-play",
];

function validHttpsUrl(value) {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function validPastTimestamp(value, now) {
  if (typeof value !== "string") return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && parsed <= now.valueOf();
}

export function validateReleaseEvidence(
  evidence,
  { version, sha, now = new Date() },
) {
  const errors = [];
  if (evidence?.schemaVersion !== RELEASE_EVIDENCE_SCHEMA_VERSION) {
    errors.push(
      `Evidence schemaVersion must be ${RELEASE_EVIDENCE_SCHEMA_VERSION}.`,
    );
  }
  if (evidence?.version !== version || evidence?.sha !== sha) {
    errors.push("Evidence version/SHA does not match the release identity.");
  }
  for (const field of [
    "credentialedCheckoutVerifiedAt",
    "tenantIsolationVerifiedAt",
  ]) {
    if (!validPastTimestamp(evidence?.[field], now)) {
      errors.push(`${field} must be a valid, non-future verification timestamp.`);
    }
  }

  const destinations = Array.isArray(evidence?.destinations)
    ? evidence.destinations
    : [];
  const byId = new Map();
  for (const destination of destinations) {
    if (!destination || typeof destination.id !== "string") {
      errors.push("Every evidence destination requires a stable id.");
      continue;
    }
    if (byId.has(destination.id)) {
      errors.push(`Evidence destination '${destination.id}' is duplicated.`);
      continue;
    }
    byId.set(destination.id, destination);
    if (!validHttpsUrl(destination.evidenceUrl)) {
      errors.push(
        `Evidence destination '${destination.id}' requires an HTTPS evidenceUrl.`,
      );
    }
    if (!validPastTimestamp(destination.verifiedAt, now)) {
      errors.push(
        `Evidence destination '${destination.id}' requires a valid, non-future verifiedAt.`,
      );
    }
    if (destination.sourceSha !== sha) {
      errors.push(
        `Evidence destination '${destination.id}' sourceSha must match ${sha}.`,
      );
    }
  }

  for (const id of REQUIRED_DESTINATIONS) {
    if (!byId.has(id)) errors.push(`Missing required release destination '${id}'.`);
  }

  const web = byId.get("web-production");
  if (web && web.deploymentSha !== sha) {
    errors.push("web-production deploymentSha must match the release SHA.");
  }

  for (const [id, buildField] of [
    ["ios-app-store", "buildNumber"],
    ["android-play", "versionCode"],
  ]) {
    const native = byId.get(id);
    if (!native) continue;
    if (!Number.isSafeInteger(native[buildField]) || native[buildField] <= 0) {
      errors.push(`${id} ${buildField} must be a positive integer.`);
    }
    if (native.signedBuild !== true) {
      errors.push(`${id} must verify a signed build.`);
    }
    if (!validPastTimestamp(native.physicalDeviceNotificationVerifiedAt, now)) {
      errors.push(
        `${id} requires a valid, non-future physicalDeviceNotificationVerifiedAt.`,
      );
    }
  }
  return errors;
}

function run() {
  const root = process.cwd();
  const version =
    process.argv.slice(2).find((value) => /^\d+\.\d+\.\d+$/.test(value)) ??
    readFileSync(join(root, "VERSION"), "utf8").trim();
  const evidenceIndex = process.argv.indexOf("--evidence");
  const evidencePath =
    evidenceIndex >= 0 && process.argv[evidenceIndex + 1]
      ? resolve(process.argv[evidenceIndex + 1])
      : null;
  const tag = `v${version}`;
  const errors = [];

  const integrity = spawnSync("pnpm", ["release:integrity"], {
    cwd: root,
    stdio: "inherit",
  });
  if (integrity.status !== 0) {
    errors.push("Canonical release integrity gate failed.");
  }

  function git(args) {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  }

  const changelog = readFileSync(join(root, "CHANGELOG.md"), "utf8");
  if (
    !new RegExp(
      `^## \\[${version.replaceAll(".", "\\.")}\\] - \\d{4}-\\d{2}-\\d{2}$`,
      "m",
    ).test(changelog)
  ) {
    errors.push(`CHANGELOG.md has no dated ${version} release section.`);
  }

  let head = "";
  try {
    head = git(["rev-parse", "HEAD"]);
    const tagSha = git(["rev-list", "-n", "1", tag]);
    if (tagSha !== head) errors.push(`${tag} points to ${tagSha}, not HEAD ${head}.`);
    const mainSha = git(["rev-parse", "origin/main"]);
    if (mainSha !== head) errors.push(`HEAD ${head} is not origin/main ${mainSha}.`);
    for (const [older, newer] of [
      ["origin/development", "origin/staging"],
      ["origin/staging", "origin/main"],
    ]) {
      const check = spawnSync("git", ["merge-base", "--is-ancestor", older, newer], {
        cwd: root,
      });
      if (check.status !== 0) errors.push(`${older} is not an ancestor of ${newer}.`);
    }
  } catch (error) {
    errors.push(`Git release identity is incomplete: ${error.message}`);
  }

  const release = spawnSync(
    "gh",
    ["release", "view", tag, "--json", "tagName,isDraft,isPrerelease"],
    { cwd: root, encoding: "utf8" },
  );
  if (release.status !== 0) {
    errors.push(`GitHub release ${tag} was not verified.`);
  } else {
    const value = JSON.parse(release.stdout);
    if (value.isDraft || value.isPrerelease || value.tagName !== tag) {
      errors.push(`GitHub release ${tag} is not a final matching release.`);
    }
  }

  if (!evidencePath) {
    errors.push(
      "Provide --evidence PATH to sanitized web, signed native, physical-device, checkout, and tenant-isolation evidence JSON.",
    );
  } else {
    try {
      const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
      errors.push(...validateReleaseEvidence(evidence, { version, sha: head }));
    } catch (error) {
      errors.push(`Release evidence is unreadable: ${error.message}`);
    }
  }

  if (errors.length) {
    console.error("Release verification failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`Release ${tag} verified at ${head}.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run();
}
