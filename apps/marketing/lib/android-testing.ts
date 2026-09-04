export type AndroidTestStatus = "not_tested" | "pass" | "fail" | "blocked";
export type MobileTestPlatform = "android" | "ios";

type MobileTestCheck = {
  id: string;
  title: string;
  prompt: string;
  steps: readonly string[];
  platforms?: readonly MobileTestPlatform[];
};

export const nativeTestChecks: readonly MobileTestCheck[] = [
  {
    id: "identity",
    title: "Open the right shop",
    prompt: "Sign in and make sure you see the right test shop and job role.",
    steps: [
      "Open the DRX app and sign in with the invite you received.",
      "Open More and check that the shop name matches your test invite.",
      "Make sure the screens you can open fit the job role you were given.",
    ],
  },
  {
    id: "onboarding",
    title: "Walk through your first setup",
    prompt: "Treat the welcome flow as the first test: finish every step and make sure the new workspace opens correctly.",
    steps: [
      "Start with a new invited test account so you see the welcome flow.",
      "Enter a made-up owner name and shop name.",
      "Answer any other questions shown on your phone. It is okay if your app goes straight to the new workspace after the names.",
      "Finish setup and make sure the new workspace opens.",
      "Tell us if any question is confusing, too small, cut off, or hard to answer.",
    ],
  },
  {
    id: "inventory",
    title: "Add a product",
    prompt: "Add a made-up product, close and reopen DRX, then check its price and amount.",
    steps: [
      "Tap Inventory, then Add Product.",
      "Use a made-up name and SKU. Add a cost and selling price.",
      "On Android, add a starting amount now. On iPhone or iPad, save first, open the product, tap Record Intake, and add the starting amount there.",
      "Save the product, close DRX, and open it again.",
      "Find the product and make sure its price and amount still match.",
    ],
  },
  {
    id: "customer",
    title: "Add a customer",
    prompt: "Add a made-up customer, then make sure they stay in the customer list with the right available credit.",
    steps: [
      "Tap Customers, then Add.",
      "Enter a made-up name. Leave the phone and email blank, or use clearly made-up details.",
      "Add a small credit limit so you can try a credit sale later.",
      "Save the customer, close and reopen DRX, then find them in the customer list.",
      "Make sure the available credit matches the limit you entered. You do not need to reopen contact details if your phone app does not offer that yet.",
    ],
  },
  {
    id: "online-checkout",
    title: "Make two sales",
    prompt: "While online, make one cash sale and one credit sale. Check the totals, stock, balance, and sales list.",
    steps: [
      "Open POS and tap the made-up product you added.",
      "Tap Checkout, choose Cash, enter enough cash, and finish the sale.",
      "Check Sales History and Inventory. The sale should appear once and stock should go down.",
      "Start another sale, pick your made-up customer, choose Credit, and finish it.",
      "Check the customer's available credit and Sales History. The numbers should match the sale.",
    ],
  },
  {
    id: "offline-cash",
    platforms: ["android"],
    title: "Try cash without internet",
    prompt: "Turn off the internet, make an allowed cash sale, reconnect, and make sure the sale shows up once.",
    steps: [
      "While online, open the offline status card and make sure this phone is allowed to sell offline.",
      "Turn on airplane mode, return to POS, and make a small cash sale.",
      "Look for the message that says the sale is waiting to sync.",
      "Turn the internet back on and wait for syncing to finish.",
      "Check Sales History. The sale should appear once, not twice.",
    ],
  },
  {
    id: "offline-credit",
    platforms: ["android"],
    title: "Try credit without internet",
    prompt: "If your test account allows it, make a small credit sale offline. Reconnect and make sure it shows up once.",
    steps: [
      "Check that this phone is allowed to take credit sales offline.",
      "Turn on airplane mode and start a small sale for your made-up customer.",
      "Choose Credit and finish the sale. If DRX says this is not allowed, mark Couldn't test and copy the message into your notes.",
      "Reconnect, wait for syncing, then check the sale and customer balance.",
    ],
  },
  {
    id: "notifications",
    title: "Delivery reminders",
    prompt: "Allow reminders and make sure the lock screen never shows a customer's private details.",
    steps: [
      "Allow reminders when DRX asks.",
      "Create a made-up delivery if your test shop has deliveries turned on.",
      "Open Deliveries, open the new delivery, and tap Assign to Me if it is shown.",
      "Tap Mark Uber Ordered, enter a 2-minute wait, and confirm.",
      "Lock the phone and wait up to 2 minutes. The reminder should not show a name, address, or sale details.",
    ],
  },
  {
    id: "signout",
    title: "Sign out and come back",
    prompt: "Sign out, close DRX, and reopen it. The last shop's customer and sales details should be gone.",
    steps: [
      "Open More, scroll down, and tap Sign Out.",
      "Close DRX completely and open it again.",
      "Before signing back in, make sure you cannot see the last shop's products, customers, or sales.",
    ],
  },
  {
    id: "isolation",
    title: "Switch test shops",
    prompt: "Sign in to a second test shop and make sure nothing from the first shop appears.",
    steps: [
      "Sign out of the first test shop.",
      "Sign in with the second test-shop invite you received.",
      "Look through POS, Inventory, Customers, and Sales History.",
      "Make sure none of the first shop's made-up records appear.",
    ],
  },
  {
    id: "support",
    title: "Get help",
    prompt: "Open Help & Support and try both the guide and email buttons.",
    steps: [
      "Open More, then Help & Support.",
      "Open a guide and make sure it is useful on this phone.",
      "Try the email button. You do not need to send the message.",
    ],
  },
] as const;

export function nativeTestChecksFor(platform: MobileTestPlatform) {
  return nativeTestChecks.filter((check) => !check.platforms || check.platforms.includes(platform));
}

export const mobileWebTestChecks: readonly MobileTestCheck[] = [
  {
    id: "web-identity",
    title: "Open the same shop on the web",
    prompt: "Open DRX in your phone's browser, sign in, and make sure you see the same test shop and role.",
    steps: [
      "Open deelrxcrm.app in the browser you picked above.",
      "Sign in with the same test account.",
      "Check the shop name and the screens available to you.",
    ],
  },
  {
    id: "web-native-readback",
    title: "Check the web catalog",
    prompt: "Use the made-up browser records your test coordinator provided. Phone-app records may not appear here yet.",
    steps: [
      "Open Inventory and find the made-up browser product from your test notes.",
      "Open Customers and find the made-up browser customer from your test notes.",
      "Check the price, stock amount, customer details, and available credit. Tell us if anything is missing or confusing.",
    ],
  },
  {
    id: "web-checkout",
    title: "Make a sale in the browser",
    prompt: "Make a made-up cash sale in the browser. Check the total, stock, and sales list.",
    steps: [
      "Open Quick Sale and add your made-up product.",
      "Continue to payment, choose Cash, enter enough cash, and finish the sale.",
      "Open Sales and make sure the sale appears once.",
      "Refresh Sales and make sure the sale still appears only once.",
    ],
  },
  {
    id: "web-usability",
    title: "Use it on a small screen",
    prompt: "Move around, fill out a form, open the keyboard, and scroll. Nothing important should be hidden or hard to tap.",
    steps: [
      "Open the menu and visit Inventory, Customers, Sales, and Settings.",
      "Tap into a form and open the keyboard.",
      "Rotate the phone once and scroll to the bottom of a longer page.",
      "Tell us about anything cut off, tiny, or hard to tap.",
    ],
  },
  {
    id: "web-isolation",
    title: "Sign out and switch shops",
    prompt: "Sign out, refresh the page, and open a second test shop. Nothing from the first shop should appear.",
    steps: [
      "Sign out, then refresh the browser page.",
      "Make sure the first shop's details are no longer visible.",
      "Sign in to the second test shop and check Inventory, Customers, and Sales.",
    ],
  },
  {
    id: "web-support",
    title: "Open the helpful links",
    prompt: "Open Resources, Privacy, and Terms. Tell us if anything is missing or does not open.",
    steps: [
      "Open Resources and try the DRX, testing, and help links.",
      "Open Privacy and Terms.",
      "Use the back button after each page and make sure you return to the right place.",
    ],
  },
] as const;

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
    "Google Pixel 10 Pro Fold", "Google Pixel 10 Pro XL", "Google Pixel 10 Pro", "Google Pixel 10",
    "Google Pixel 9 Pro Fold", "Google Pixel 9 Pro XL", "Google Pixel 9 Pro", "Google Pixel 9a", "Google Pixel 9",
    "Google Pixel 8 Pro", "Google Pixel 8a", "Google Pixel 8", "Google Pixel 7 Pro", "Google Pixel 7a", "Google Pixel 7", "Google Pixel 6 Pro", "Google Pixel 6a", "Google Pixel 6", "Google Pixel Fold", "Google Pixel Tablet",
    "Samsung Galaxy S25 Ultra", "Samsung Galaxy S25+", "Samsung Galaxy S25", "Samsung Galaxy S24 Ultra", "Samsung Galaxy S24+", "Samsung Galaxy S24", "Samsung Galaxy S23 Ultra", "Samsung Galaxy S23+", "Samsung Galaxy S23", "Samsung Galaxy S22", "Samsung Galaxy S21",
    "Samsung Galaxy A56", "Samsung Galaxy A55", "Samsung Galaxy A54", "Samsung Galaxy A36", "Samsung Galaxy A35", "Samsung Galaxy A25", "Samsung Galaxy A16", "Samsung Galaxy A15",
    "Samsung Galaxy Z Fold 7", "Samsung Galaxy Z Fold 6", "Samsung Galaxy Z Fold 5", "Samsung Galaxy Z Flip 7", "Samsung Galaxy Z Flip 6", "Samsung Galaxy Z Flip 5", "Samsung Galaxy Tab S10", "Samsung Galaxy Tab S9",
    "OnePlus 13", "OnePlus 12", "OnePlus 11", "OnePlus Nord 4", "Motorola Razr Ultra", "Motorola Razr", "Motorola Edge", "Moto G Power", "Nothing Phone (3)", "Nothing Phone (2)", "Sony Xperia 1", "Xiaomi 15", "Redmi Note 14", "Other Android phone or tablet",
  ],
  ios: [
    "iPhone 17 Pro Max", "iPhone 17 Pro", "iPhone 17", "iPhone Air",
    "iPhone 16 Pro Max", "iPhone 16 Pro", "iPhone 16 Plus", "iPhone 16", "iPhone 16e",
    "iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15", "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14 Plus", "iPhone 14", "iPhone 13 Pro Max", "iPhone 13 Pro", "iPhone 13 mini", "iPhone 13", "iPhone 12 Pro Max", "iPhone 12 Pro", "iPhone 12 mini", "iPhone 12", "iPhone 11 Pro Max", "iPhone 11 Pro", "iPhone 11", "iPhone SE (3rd generation)", "iPhone SE (2nd generation)",
    "iPad Pro 13-inch", "iPad Pro 11-inch", "iPad Air 13-inch", "iPad Air 11-inch", "iPad (11th generation)", "iPad (10th generation)", "iPad mini", "Other iPhone or iPad",
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

export function suggestTestSetup(
  userAgent: string,
  now = new Date(),
  device: { platform?: string; maxTouchPoints?: number } = {},
) {
  const desktopModeIPad = /Macintosh/i.test(userAgent)
    && device.platform === "MacIntel"
    && (device.maxTouchPoints ?? 0) > 1;
  const ios = /iPad|iPhone|iPod/i.test(userAgent) || desktopModeIPad;
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
  const activeNativeChecks = nativeTestChecksFor(input.platform);
  const allChecks = [...activeNativeChecks, ...mobileWebTestChecks];
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
    ...formatChecks(activeNativeChecks),
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

export const mobileTestStorageKey = "drx.mobile-test.v1";

export type SavedMobileTest = {
  report: AndroidTestReportInput;
  syntheticConfirmed: boolean;
  savedAt: string;
};

const allowedStatuses = new Set<AndroidTestStatus>(["not_tested", "pass", "fail", "blocked"]);

export function serializeMobileTestProgress(saved: SavedMobileTest) {
  return JSON.stringify(saved);
}

export function parseMobileTestProgress(raw: string): SavedMobileTest | null {
  try {
    const value = JSON.parse(raw) as Partial<SavedMobileTest>;
    const candidate = value.report as Partial<AndroidTestReportInput> | undefined;
    if (!candidate || (candidate.platform !== "android" && candidate.platform !== "ios")) return null;

    const allChecks = [...nativeTestChecks, ...mobileWebTestChecks];
    const results = Object.fromEntries(allChecks.map((check) => {
      const result = candidate.results?.[check.id];
      const status = result && allowedStatuses.has(result.status) ? result.status : "not_tested";
      return [check.id, { status, notes: typeof result?.notes === "string" ? result.notes : "" }];
    }));
    const text = (field: keyof AndroidTestReportInput) => typeof candidate[field] === "string" ? candidate[field] as string : "";

    return {
      report: {
        platform: candidate.platform,
        testerAlias: text("testerAlias"),
        deviceModel: text("deviceModel"),
        androidVersion: text("androidVersion"),
        appVersion: text("appVersion"),
        buildNumber: text("buildNumber"),
        browserName: text("browserName"),
        testedAt: text("testedAt"),
        timezone: text("timezone"),
        overallNotes: text("overallNotes"),
        results,
      },
      syntheticConfirmed: value.syntheticConfirmed === true,
      savedAt: typeof value.savedAt === "string" ? value.savedAt : "",
    };
  } catch {
    return null;
  }
}
