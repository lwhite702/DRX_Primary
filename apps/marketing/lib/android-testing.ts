export const nativeTestChecks = [
  {
    id: "identity",
    title: "Open the right shop",
    prompt: "Sign in and make sure you see the right test shop and job role.",
  },
  {
    id: "onboarding",
    title: "Finish setup",
    prompt: "Finish the welcome steps, or make sure your test shop opens the way you expect.",
  },
  {
    id: "inventory",
    title: "Add a product",
    prompt: "Add a made-up product, close and reopen DRX, then check its price and amount.",
  },
  {
    id: "customer",
    title: "Add a customer",
    prompt: "Add a made-up customer, then make sure their details and credit limit are still there.",
  },
  {
    id: "online-checkout",
    title: "Make two sales",
    prompt: "While online, make one cash sale and one credit sale. Check the totals, stock, balance, and sales list.",
  },
  {
    id: "offline-cash",
    title: "Try cash without internet",
    prompt: "Turn off the internet, make an allowed cash sale, reconnect, and make sure the sale shows up once.",
  },
  {
    id: "offline-credit",
    title: "Try credit without internet",
    prompt: "If your test account allows it, make a small credit sale offline. Reconnect and make sure it shows up once.",
  },
  {
    id: "notifications",
    title: "Delivery reminders",
    prompt: "Allow reminders and make sure the lock screen never shows a customer's private details.",
  },
  {
    id: "signout",
    title: "Sign out and come back",
    prompt: "Sign out, close DRX, and reopen it. The last shop's customer and sales details should be gone.",
  },
  {
    id: "isolation",
    title: "Switch test shops",
    prompt: "Sign in to a second test shop and make sure nothing from the first shop appears.",
  },
  {
    id: "support",
    title: "Get help",
    prompt: "Open Help & Support and try both the guide and email buttons.",
  },
] as const;

export const mobileWebTestChecks = [
  {
    id: "web-identity",
    title: "Open the same shop on the web",
    prompt: "Open DRX in your phone's browser, sign in, and make sure you see the same test shop and role.",
  },
  {
    id: "web-native-readback",
    title: "Check your phone-app changes",
    prompt: "Find the made-up product and customer you added in the phone app. Their details should match.",
  },
  {
    id: "web-checkout",
    title: "Make a sale in the browser",
    prompt: "Make a made-up cash sale. Check the total, stock, and sales list, then find it once in the phone app.",
  },
  {
    id: "web-usability",
    title: "Use it on a small screen",
    prompt: "Move around, fill out a form, open the keyboard, and scroll. Nothing important should be hidden or hard to tap.",
  },
  {
    id: "web-isolation",
    title: "Sign out and switch shops",
    prompt: "Sign out, refresh the page, and open a second test shop. Nothing from the first shop should appear.",
  },
  {
    id: "web-support",
    title: "Open the helpful links",
    prompt: "Open Resources, Privacy, and Terms. Tell us if anything is missing or does not open.",
  },
] as const;

export type AndroidTestStatus = "not_tested" | "pass" | "fail" | "blocked";
export type MobileTestPlatform = "android" | "ios";

export type AndroidTestResult = {
  status: AndroidTestStatus;
  notes: string;
};

export type AndroidTestReportInput = {
  platform: MobileTestPlatform;
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
  not_tested: "NOT YET",
  pass: "WORKED",
  fail: "DIDN'T WORK",
  blocked: "COULDN'T TEST",
};

export const deviceSuggestions: Record<MobileTestPlatform, readonly string[]> = {
  android: [
    "Google Pixel 10",
    "Google Pixel 9",
    "Google Pixel 8",
    "Samsung Galaxy S25",
    "Samsung Galaxy S24",
    "Samsung Galaxy Z Fold 7",
    "Samsung Galaxy Z Flip 7",
    "OnePlus 13",
    "Motorola Razr",
  ],
  ios: [
    "iPhone 17 Pro Max",
    "iPhone 17 Pro",
    "iPhone 17",
    "iPhone Air",
    "iPhone 16 Pro Max",
    "iPhone 16 Pro",
    "iPhone 16",
    "iPad Air 13-inch",
    "iPad Pro 13-inch",
  ],
};

export const osSuggestions: Record<MobileTestPlatform, readonly string[]> = {
  android: ["Android 16", "Android 15", "Android 14"],
  ios: ["iOS 19", "iOS 18", "iPadOS 19", "iPadOS 18"],
};

export const browserSuggestions: Record<MobileTestPlatform, readonly string[]> = {
  android: ["Chrome", "Samsung Internet", "Firefox", "Microsoft Edge", "Other"],
  ios: ["Safari", "Chrome", "Firefox", "Microsoft Edge", "Other"],
};

function localDateTime(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function suggestTestSetup(userAgent: string, now = new Date()) {
  const ios = /iPad|iPhone|iPod/i.test(userAgent);
  const platform: MobileTestPlatform = ios ? "ios" : "android";
  const androidVersion = userAgent.match(/Android\s([\d.]+)/i)?.[1];
  const appleVersion = userAgent.match(/OS\s(\d+(?:[_\d]+)?)/i)?.[1]?.replaceAll("_", ".");
  const browserName = /SamsungBrowser/i.test(userAgent)
    ? "Samsung Internet"
    : /EdgA|EdgiOS/i.test(userAgent)
      ? "Microsoft Edge"
      : /FxiOS|Firefox/i.test(userAgent)
        ? "Firefox"
        : /CriOS|Chrome/i.test(userAgent)
          ? "Chrome"
          : ios
            ? "Safari"
            : "Other";

  return {
    platform,
    browserName,
    osVersion: androidVersion
      ? `Android ${androidVersion}`
      : appleVersion
        ? `iOS ${appleVersion}`
        : "",
    testedAt: localDateTime(now),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

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
    "DRX phone test report",
    "=====================",
    `Phone app: ${input.platform === "ios" ? "iPhone or iPad" : "Android"}`,
    `Tester nickname: ${printable(input.testerAlias)}`,
    `Phone or tablet: ${printable(input.deviceModel)}`,
    `Software version: ${printable(input.androidVersion)}`,
    `DRX version: ${printable(input.appVersion)}`,
    `Build number: ${printable(input.buildNumber)}`,
    `Browser: ${printable(input.browserName)}`,
    `When tested: ${printable(input.testedAt)}`,
    `Time zone: ${printable(input.timezone)}`,
    `Finished: ${completed}/${allChecks.length}; worked: ${passed}`,
    "",
    `${input.platform === "ios" ? "iPhone and iPad" : "Android"} app checks`,
    "----------------------",
    ...formatChecks(nativeTestChecks),
    "",
    "DRX in the phone browser",
    "------------------------",
    ...formatChecks(mobileWebTestChecks),
    "",
    "Anything else to share",
    "----------------------",
    printable(input.overallNotes),
    "",
    "Privacy note: This test used made-up information only. The report has no passwords or real customer details.",
  ].join("\n");
}
