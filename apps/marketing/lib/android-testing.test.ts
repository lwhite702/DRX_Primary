import { describe, expect, it } from "vitest";

import {
  createAndroidTestReport,
  deviceSuggestions,
  mobileWebTestChecks,
  nativeTestChecks,
  parseMobileTestProgress,
  serializeMobileTestProgress,
  suggestTestSetup,
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
  it("formats progress and clear test outcomes for sharing", () => {
    const input = report();
    input.results.identity = { status: "pass", notes: "Correct synthetic tenant." };
    input.results.inventory = { status: "blocked", notes: "Catalog did not load." };

    const output = createAndroidTestReport(input);

    expect(output).toContain("Tester nickname: Tester-A1");
    expect(output).toContain(`Finished: 2/${nativeTestChecks.length + mobileWebTestChecks.length}; worked: 1`);
    expect(output).toContain("Phone app: iPhone or iPad");
    expect(output).toContain("DRX in the phone browser");
    expect(output).toContain("[WORKED] Open the right shop");
    expect(output).toContain("[COULDN'T TEST] Add a product");
    expect(output).toContain("made-up information only");
  });

  it("uses safe placeholders for blank fields", () => {
    const output = createAndroidTestReport(
      report({ testerAlias: " ", deviceModel: "", overallNotes: "" }),
    );

    expect(output).toContain("Tester nickname: Not provided");
    expect(output).toContain("Phone or tablet: Not provided");
    expect(output).toContain("Anything else to share\n----------------------\nNot provided");
  });
});

describe("suggestTestSetup", () => {
  it("suggests iPhone and Safari details from the phone", () => {
    const suggestion = suggestTestSetup(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Version/18.6 Mobile/15E148 Safari/604.1",
      new Date("2026-09-03T20:30:00-04:00"),
    );

    expect(suggestion.platform).toBe("ios");
    expect(suggestion.browserName).toBe("Safari");
    expect(suggestion.osVersion).toBe("iOS 18.6");
    expect(suggestion.testedAt).toHaveLength(16);
  });

  it("suggests Android and Samsung Internet details from the phone", () => {
    const suggestion = suggestTestSetup(
      "Mozilla/5.0 (Linux; Android 16; SM-S938U) AppleWebKit/537.36 SamsungBrowser/28.0 Chrome/130.0 Mobile Safari/537.36",
    );

    expect(suggestion.platform).toBe("android");
    expect(suggestion.browserName).toBe("Samsung Internet");
    expect(suggestion.osVersion).toBe("Android 16");
  });
});

describe("mobile test progress", () => {
  it("restores saved answers and safely fills any missing checks", () => {
    const savedReport = report();
    savedReport.results.identity = { status: "pass", notes: "Opened the right test shop." };
    delete savedReport.results["web-support"];

    const restored = parseMobileTestProgress(serializeMobileTestProgress({
      report: savedReport,
      syntheticConfirmed: true,
      savedAt: "2026-09-03T21:00:00.000Z",
    }));

    expect(restored?.syntheticConfirmed).toBe(true);
    expect(restored?.report.results.identity).toEqual({ status: "pass", notes: "Opened the right test shop." });
    expect(restored?.report.results["web-support"]).toEqual({ status: "not_tested", notes: "" });
  });

  it("ignores broken or unrecognized saved data", () => {
    expect(parseMobileTestProgress("not-json")).toBeNull();
    expect(parseMobileTestProgress(JSON.stringify({ report: { platform: "desktop" } }))).toBeNull();
  });
});

describe("first-time tester guidance", () => {
  it("includes step-by-step onboarding and transaction help", () => {
    const onboarding = nativeTestChecks.find((check) => check.id === "onboarding");
    const checkout = nativeTestChecks.find((check) => check.id === "online-checkout");
    const webCheckout = mobileWebTestChecks.find((check) => check.id === "web-checkout");

    expect(onboarding?.steps.length).toBeGreaterThanOrEqual(5);
    expect(checkout?.steps.join(" ")).toContain("Cash");
    expect(checkout?.steps.join(" ")).toContain("Credit");
    expect(webCheckout?.steps.join(" ")).toContain("Quick Sale");
  });

  it("only asks Android testers to verify controls the app exposes", () => {
    const identity = nativeTestChecks.find((check) => check.id === "identity");
    const onboarding = nativeTestChecks.find((check) => check.id === "onboarding");
    const customer = nativeTestChecks.find((check) => check.id === "customer");
    const signout = nativeTestChecks.find((check) => check.id === "signout");

    expect(identity?.steps.join(" ")).toContain("Open More");
    expect(onboarding?.steps.join(" ")).toContain("owner name and shop name");
    expect(onboarding?.steps.join(" ")).not.toContain("tax choice");
    expect(customer?.steps.join(" ")).toContain("available credit");
    expect(customer?.steps.join(" ")).not.toContain("reopen the customer");
    expect(signout?.steps.join(" ")).toContain("tap Sign Out");
    expect(signout?.steps.join(" ")).not.toContain("then Settings");
  });

  it("offers broad choices for common phones and tablets", () => {
    expect(deviceSuggestions.android.length).toBeGreaterThanOrEqual(50);
    expect(deviceSuggestions.ios.length).toBeGreaterThanOrEqual(30);
    expect(deviceSuggestions.android).toContain("Other Android phone or tablet");
    expect(deviceSuggestions.ios).toContain("Other iPhone or iPad");
  });
});
