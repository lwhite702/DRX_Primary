import { expect, test } from "@playwright/test";

// @target:apps/marketing/components/marketing/rebuild/sections.tsx
// @target:apps/marketing/components/marketing/rebuild/nav.tsx
for (const width of [320, 375, 768, 1024, 1440]) {
  test(`landing remains readable and accessible at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Know what you sold. See who still owes you.");
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const clipped = await page.locator("main h1, main h2, main h3, main p, main figure").evaluateAll((elements) =>
      elements.filter((element) => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && (box.left < -1 || box.right > innerWidth + 1);
      }).map((element) => element.textContent),
    );
    expect(clipped).toEqual([]);
    await expect(page.getByText("Illustrative screen with fictional data.")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`landing-${width}.png`), fullPage: true });

    if (width < 768) {
      const toggle = page.getByRole("button", { name: "Open menu" });
      await toggle.click();
      await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(toggle).toBeFocused();
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await expect(toggle).toHaveAttribute("aria-label");
    }
    const question = page.locator("#faq details").first();
    await question.locator("summary").click();
    await expect(question).toHaveAttribute("open", "");
    await expect(page.getByRole("link", { name: "Join early access" }).first()).toBeVisible();
  });
}
