import { describe, expect, it } from "vitest";
import { marketingContent } from "./marketing-content";

describe("marketingContent consistent navigation (WCAG 3.2.4)", () => {
  it("uses consistent 'Resources' label for /resources across header and footer", () => {
    const headerResourceLink = marketingContent.footer.menuLinks.find((l) => l.href === "/resources");
    const footerResourceLink = marketingContent.footer.resourceLinks.find((l) => l.href === "/resources");

    expect(headerResourceLink).toBeDefined();
    expect(footerResourceLink).toBeDefined();
    expect(headerResourceLink?.label).toBe("Resources");
    expect(footerResourceLink?.label).toBe("Resources");
  });

  it("uses consistent 'Privacy Policy' label in legal links", () => {
    const privacyLink = marketingContent.footer.legalLinks.find((l) => l.href === "/legal/privacy");
    expect(privacyLink).toBeDefined();
    expect(privacyLink?.label).toBe("Privacy Policy");
  });
});
