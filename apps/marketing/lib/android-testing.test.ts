import { describe, expect, it } from "vitest";

import {
  createAndroidTestReport,
  mobileWebTestChecks,
  nativeTestChecks,
  type AndroidTestReportInput,
} from "./android-testing";

function report(overrides: Partial<AndroidTestReportInput> = {}): AndroidTestReportInput {
  return {
    platform: "ios",
    testerAlias: "Tester-A1",
    deviceModel: "Synthetic Pixel",
    androidVersion: "16",
    appVersion: "0.7.3",
    buildNumber: "6",
    browserName: "Safari",
    testedAt: "2026-09-03T20:30",
    timezone: "America/New_York",
    overallNotes: "Smooth run.",
    results: Object.fromEntries(
      [...nativeTestChecks, ...mobileWebTestChecks].map((check) => [check.id, { status: "not_tested", notes: "" }]),
    ),
    ...overrides,
  };
}

describe("createAndroidTestReport", () => {
  it("formats progress and sanitized test outcomes for sharing", () => {
    const input = report();
    input.results.identity = { status: "pass", notes: "Correct synthetic tenant." };
    input.results.inventory = { status: "blocked", notes: "Catalog did not load." };

    const output = createAndroidTestReport(input);

    expect(output).toContain("Tester alias: Tester-A1");
    expect(output).toContain(`Progress: 2/${nativeTestChecks.length + mobileWebTestChecks.length} checked; 1 passed`);
    expect(output).toContain("Native platform: iOS");
    expect(output).toContain("Required mobile-web checks");
    expect(output).toContain("[PASS] Identity and access");
    expect(output).toContain("[BLOCKED] Inventory persistence");
    expect(output).toContain("synthetic test data only");
  });

  it("uses safe placeholders for blank fields", () => {
    const output = createAndroidTestReport(
      report({ testerAlias: " ", deviceModel: "", overallNotes: "" }),
    );

    expect(output).toContain("Tester alias: Not provided");
    expect(output).toContain("Device: Not provided");
    expect(output).toContain("Overall notes\n-------------\nNot provided");
  });
});
