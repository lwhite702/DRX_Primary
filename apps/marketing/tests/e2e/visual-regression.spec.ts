import { expect, test } from "@playwright/test";

// @target:apps/marketing/app/page.tsx

const viewports = [
  { name: "desktop", width: 1440, height: 1024 },
  { name: "tablet", width: 834, height: 1194 },
  { name: "mobile", width: 390, height: 844 },
];

const routeCases = [
  { name: "landing", path: "/" },
  { name: "product", path: "/product" },
  { name: "lawful-use", path: "/legal/lawful-use" },
  { name: "regulatory-disclaimer", path: "/legal/regulatory-disclaimer" },
] as const;

async function waitForVisualAssets(page: import("@playwright/test").Page) {
  await page.evaluate(async () => {
    const assetsReady = async () => {
      await document.fonts.ready;
      await Promise.all(
        Array.from(document.images, (image) =>
          image.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                image.addEventListener("load", () => resolve(), { once: true });
                image.addEventListener("error", () => resolve(), { once: true });
              }),
        ),
      );
    };

    await Promise.race([
      assetsReady(),
      new Promise<void>((resolve) => window.setTimeout(resolve, 3_000)),
    ]);
  });
}

for (const viewport of viewports) {
  for (const routeCase of routeCases) {
    test(`${routeCase.name} · ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(routeCase.path, { waitUntil: "domcontentloaded" });
      await expect(page.locator("h1")).toBeVisible();
      await waitForVisualAssets(page);
      await expect(page).toHaveScreenshot(`${routeCase.name}-${viewport.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });
  }

  test(`faq expanded · ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const firstQuestion = page.locator("#faq details").first();
    await firstQuestion.locator("summary").click();
    await expect(firstQuestion).toHaveAttribute("open", "");
    await waitForVisualAssets(page);
    await expect(page).toHaveScreenshot(`faq-expanded-${viewport.name}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });
}
