export const nativeTestChecks = [
  {
    id: "identity",
    title: "Identity and access",
    prompt: "Sign in and confirm the expected synthetic business and role appear.",
  },
  {
    id: "onboarding",
    title: "Onboarding",
    prompt: "Complete onboarding or confirm the existing synthetic business setup loads correctly.",
  },
  {
    id: "inventory",
    title: "Inventory persistence",
    prompt: "Add a synthetic product, relaunch the app, and confirm its quantity and price persist.",
  },
  {
    id: "customer",
    title: "Customer persistence",
    prompt: "Add a synthetic customer and confirm its optional contact fields and credit limit persist.",
  },
  {
    id: "online-checkout",
    title: "Online checkout",
    prompt: "Complete synthetic cash and credit sales; verify totals, inventory, balances, and history.",
  },
  {
    id: "offline-cash",
    title: "Offline cash",
    prompt: "Complete an authorized cash sale offline, reconnect, and verify it synchronizes exactly once.",
  },
  {
    id: "offline-credit",
    title: "Offline credit",
    prompt: "If authorized, repeat offline with credit inside configured limits and verify one reconciliation.",
  },
  {
    id: "notifications",
    title: "Delivery reminders",
    prompt: "Grant notification access and confirm synthetic reminders expose no customer data on the lock screen.",
  },
  {
    id: "signout",
    title: "Sign-out reset",
    prompt: "Sign out and relaunch; confirm the previous tenant's cached data is no longer visible.",
  },
  {
    id: "isolation",
    title: "Second-tenant isolation",
    prompt: "Sign in to a second synthetic tenant and confirm no data from the first tenant appears.",
  },
  {
    id: "support",
    title: "Help and support",
    prompt: "Open Help & Support and record whether the documentation and email actions work.",
  },
] as const;

export const mobileWebTestChecks = [
  {
    id: "web-identity",
    title: "Mobile-web identity",
    prompt: "Open the DRX web app in the phone browser, sign in, and confirm the same synthetic business and role.",
  },
  {
    id: "web-native-readback",
    title: "Native-to-web readback",
    prompt: "Confirm the synthetic product and customer created in the native app appear correctly on mobile web.",
  },
  {
    id: "web-checkout",
    title: "Mobile-web checkout",
    prompt: "Complete a synthetic cash sale on mobile web and verify totals, inventory, history, and native readback.",
  },
  {
    id: "web-usability",
    title: "Small-screen usability",
    prompt: "Check navigation, forms, the on-screen keyboard, scrolling, and portrait orientation for blocked controls.",
  },
  {
    id: "web-isolation",
    title: "Mobile-web sign-out and isolation",
    prompt: "Sign out, reload, and use a second synthetic tenant; confirm no first-tenant data is visible.",
  },
  {
    id: "web-support",
    title: "Public help and legal links",
    prompt: "Open Resources, Privacy, and Terms from the phone browser and record any missing or broken destination.",
  },
] as const;

export type AndroidTestStatus = "not_tested" | "pass" | "fail" | "blocked";

export type AndroidTestResult = {
  status: AndroidTestStatus;
  notes: string;
};

export type AndroidTestReportInput = {
  platform: "android" | "ios";
  testerAlias: string;
  deviceModel: string;
  androidVersion: string;
  appVersion: string;
  buildNumber: string;
  browserName: string;
  testedAt: string;
  timezone: string;
  overallNotes: string;
  results: Record<string, AndroidTestResult>;
};

const statusLabels: Record<AndroidTestStatus, string> = {
  not_tested: "NOT TESTED",
  pass: "PASS",
  fail: "FAIL",
  blocked: "BLOCKED",
};

function printable(value: string) {
  return value.trim() || "Not provided";
}

export function createAndroidTestReport(input: AndroidTestReportInput) {
  const allChecks = [...nativeTestChecks, ...mobileWebTestChecks];
  const completed = allChecks.filter(
    (check) => input.results[check.id]?.status !== "not_tested",
  ).length;
  const passed = allChecks.filter(
    (check) => input.results[check.id]?.status === "pass",
  ).length;

  const formatChecks = (checks: readonly { id: string; title: string }[]) => checks.flatMap((check, index) => {
    const result = input.results[check.id] ?? { status: "not_tested", notes: "" };
    const lines = [`${index + 1}. [${statusLabels[result.status]}] ${check.title}`];
    if (result.notes.trim()) lines.push(`   Notes: ${result.notes.trim()}`);
    return lines;
  });

  return [
    "DRX mobile internal test report",
    "===============================",
    `Native platform: ${input.platform === "ios" ? "iOS" : "Android"}`,
    `Tester alias: ${printable(input.testerAlias)}`,
    `Device: ${printable(input.deviceModel)}`,
    `OS version: ${printable(input.androidVersion)}`,
    `DRX version: ${printable(input.appVersion)}`,
    `Native build: ${printable(input.buildNumber)}`,
    `Mobile browser: ${printable(input.browserName)}`,
    `Tested at: ${printable(input.testedAt)}`,
    `Timezone: ${printable(input.timezone)}`,
    `Progress: ${completed}/${allChecks.length} checked; ${passed} passed`,
    "",
    `${input.platform === "ios" ? "iOS" : "Android"} native checks`,
    "---------------------",
    ...formatChecks(nativeTestChecks),
    "",
    "Required mobile-web checks",
    "--------------------------",
    ...formatChecks(mobileWebTestChecks),
    "",
    "Overall notes",
    "-------------",
    printable(input.overallNotes),
    "",
    "Data statement: This report used synthetic test data only and contains no credentials or customer records.",
  ].join("\n");
}
