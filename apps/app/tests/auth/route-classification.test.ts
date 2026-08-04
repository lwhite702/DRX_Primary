import { describe, expect, it } from "vitest";
import {
  classifyDrxHost,
  isAuthEntryPath,
  isClerkUiPath,
  isOnboardingPath,
  isProtectedAppPath,
  isPublicAppPath,
  shouldRedirectMarketingToApp,
} from "@/lib/auth/route-classification";

describe("route classification", () => {
  it("classifies DRX hosts", () => {
    expect(classifyDrxHost("deelrxcrm.com")).toBe("marketing");
    expect(classifyDrxHost("www.deelrxcrm.com")).toBe("marketing");
    expect(classifyDrxHost("deelrxcrm.app")).toBe("app");
    expect(classifyDrxHost("www.deelrxcrm.app")).toBe("app");
    expect(classifyDrxHost("preview.deelrxcrm.app")).toBe("app");
    expect(classifyDrxHost("localhost:3000")).toBe("app");
    expect(classifyDrxHost("clerk.deelrxcrm.app")).toBe("auth");
    expect(classifyDrxHost("accounts.deelrxcrm.app")).toBe("auth");
    expect(classifyDrxHost("api.example.com")).toBe("other");
  });

  it("marks public app paths correctly", () => {
    expect(isPublicAppPath("/login")).toBe(true);
    expect(isPublicAppPath("/register/verify")).toBe(true);
    expect(isPublicAppPath("/api/public/health")).toBe(true);
    expect(isPublicAppPath("/api/webhooks/clerk")).toBe(true);
    expect(isPublicAppPath("/_next/static/chunks/app.js")).toBe(true);
    expect(isPublicAppPath("/privacy")).toBe(true);
    expect(isPublicAppPath("/privacy-policy")).toBe(true);
    expect(isPublicAppPath("/legal/privacy")).toBe(true);
    expect(isPublicAppPath("/legal/terms")).toBe(true);
    expect(isPublicAppPath("/support")).toBe(true);
    expect(isPublicAppPath("/dashboard")).toBe(false);
  });

  it("separates auth entry, clerk ui, and onboarding paths", () => {
    expect(isAuthEntryPath("/login")).toBe(true);
    expect(isAuthEntryPath("/onboarding")).toBe(false);
    expect(isClerkUiPath("/login")).toBe(true);
    expect(isClerkUiPath("/onboarding")).toBe(true);
    expect(isOnboardingPath("/onboarding/checklist")).toBe(true);
    expect(isOnboardingPath("/dashboard")).toBe(false);
  });

  it("marks protected app routes", () => {
    expect(isProtectedAppPath("/dashboard")).toBe(true);
    expect(isProtectedAppPath("/pos/sale")).toBe(true);
    expect(isProtectedAppPath("/api/team")).toBe(false);
    expect(isProtectedAppPath("/api/public/status")).toBe(false);
    expect(isProtectedAppPath("/login")).toBe(false);
  });

  it("flags operator routes that should redirect off marketing domain", () => {
    expect(shouldRedirectMarketingToApp("/login")).toBe(true);
    expect(shouldRedirectMarketingToApp("/dashboard/operator")).toBe(true);
    expect(shouldRedirectMarketingToApp("/pos/sale")).toBe(true);
    expect(shouldRedirectMarketingToApp("/product")).toBe(false);
  });
});
