#!/usr/bin/env node

import assert from "node:assert/strict";

import { validateReleaseEvidence } from "./verify.mjs";

const version = "0.6.0";
const sha = "a".repeat(40);
const now = new Date("2026-08-21T20:00:00.000Z");
const valid = {
  schemaVersion: 1,
  version,
  sha,
  credentialedCheckoutVerifiedAt: "2026-08-21T18:00:00.000Z",
  tenantIsolationVerifiedAt: "2026-08-21T18:10:00.000Z",
  destinations: [
    {
      id: "web-production",
      evidenceUrl: "https://example.test/evidence/web",
      verifiedAt: "2026-08-21T18:20:00.000Z",
      sourceSha: sha,
      deploymentSha: sha,
    },
    {
      id: "ios-app-store",
      evidenceUrl: "https://example.test/evidence/ios",
      verifiedAt: "2026-08-21T18:30:00.000Z",
      sourceSha: sha,
      buildNumber: 32,
      signedBuild: true,
      physicalDeviceNotificationVerifiedAt: "2026-08-21T18:40:00.000Z",
    },
    {
      id: "android-play",
      evidenceUrl: "https://example.test/evidence/android",
      verifiedAt: "2026-08-21T18:50:00.000Z",
      sourceSha: sha,
      versionCode: 42,
      signedBuild: true,
      physicalDeviceNotificationVerifiedAt: "2026-08-21T19:00:00.000Z",
    },
  ],
};

assert.deepEqual(validateReleaseEvidence(valid, { version, sha, now }), []);

const oneArbitraryDestination = {
  ...valid,
  destinations: [valid.destinations[0]],
};
const missingErrors = validateReleaseEvidence(oneArbitraryDestination, {
  version,
  sha,
  now,
});
assert(missingErrors.some((error) => error.includes("ios-app-store")));
assert(missingErrors.some((error) => error.includes("android-play")));

const unsigned = structuredClone(valid);
unsigned.destinations[1].signedBuild = false;
delete unsigned.destinations[2].physicalDeviceNotificationVerifiedAt;
const nativeErrors = validateReleaseEvidence(unsigned, { version, sha, now });
assert(nativeErrors.some((error) => error.includes("signed build")));
assert(
  nativeErrors.some((error) => error.includes("physicalDeviceNotificationVerifiedAt")),
);

console.log("Release evidence schema fixtures passed.");
