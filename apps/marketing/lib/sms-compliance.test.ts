import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

describe("10DLC SMS Compliance and Consent Verification", () => {
  const privacyFilePath = path.resolve(__dirname, "../app/legal/privacy/page.tsx");
  const termsFilePath = path.resolve(__dirname, "../app/legal/terms/page.tsx");
  const consentFormPath = path.resolve(
    __dirname,
    "../components/marketing/forms/sms-consent-form.tsx"
  );
  const consentPagePath = path.resolve(__dirname, "../app/sms-consent/page.tsx");

  const privacyContent = fs.readFileSync(privacyFilePath, "utf8");
  const termsContent = fs.readFileSync(termsFilePath, "utf8");
  const consentFormContent = fs.readFileSync(consentFormPath, "utf8");
  const consentPageContent = fs.readFileSync(consentPagePath, "utf8");

  describe("Privacy Policy Requirements", () => {
    it("points to a page titled 'Privacy Policy'", () => {
      expect(privacyContent).toMatch(/<h1[^>]*>Privacy Policy<\/h1>/);
      expect(privacyContent).toContain('title: "Privacy Policy | Deelrx CRM"');
    });

    it("describes what data is collected and how it is used including SMS/communications", () => {
      expect(privacyContent).toContain("Communications and SMS details");
      expect(privacyContent).toContain("mobile phone numbers");
      expect(privacyContent).toContain("How information is used");
    });

    it("contains the exact statement: 'We do not sell or share your SMS opt-in data or personal information with third parties for marketing purposes.'", () => {
      const exactStatement =
        "We do not sell or share your SMS opt-in data or personal information with third parties for marketing purposes.";
      expect(privacyContent).toContain(exactStatement);
    });

    it("mentions the registered Brand name", () => {
      expect(privacyContent).toContain("Wrelik Brands LLC");
      expect(privacyContent).toContain("Deelrx CRM");
      expect(privacyContent).toContain("DRX");
    });
  });

  describe("Terms & Conditions / Terms of Service Requirements", () => {
    it("points to a page titled 'Terms of Service' or 'Terms & Conditions'", () => {
      expect(termsContent).toMatch(/<h1[^>]*>Terms of Service<\/h1>/);
      expect(termsContent).toContain('title: "Terms of Service | Deelrx CRM"');
      expect(termsContent).toContain("Terms &amp; Conditions");
    });

    it("includes a dedicated SMS Terms section", () => {
      expect(termsContent).toContain('title="SMS Terms"');
      expect(termsContent).toContain('id="sms-terms"');
    });

    it("includes a 'message and data rates may apply' disclosure", () => {
      expect(termsContent.toLowerCase()).toContain("message and data rates may apply");
    });

    it("mentions the registered Brand name in SMS terms", () => {
      expect(termsContent).toContain("Wrelik Brands LLC");
      expect(termsContent).toContain("Deelrx CRM");
      expect(termsContent).toContain("DRX");
    });

    it("includes STOP opt-out and HELP assistance instructions", () => {
      expect(termsContent).toContain("STOP");
      expect(termsContent).toContain("HELP");
      expect(termsContent).toContain("support@deelrxcrm.com");
    });
  });

  describe("Text Message Consent Form Requirements", () => {
    it("provides a form for relevant communication", () => {
      expect(consentFormContent).toMatch(/relevant communications/i);
      expect(consentFormContent).toContain("phoneNumber");
      expect(consentFormContent).toContain("fullName");
    });

    it("provides explicit links to the Campaign's Privacy Policy", () => {
      expect(consentFormContent).toContain('href="/legal/privacy"');
      expect(consentFormContent).toContain("Privacy Policy");
      expect(consentPageContent).toContain('href="/legal/privacy"');
    });

    it("provides explicit links to the Campaign's Terms of Service / Terms & Conditions", () => {
      expect(consentFormContent).toContain('href="/legal/terms"');
      expect(consentFormContent).toContain("Terms of Service");
      expect(consentPageContent).toContain('href="/legal/terms"');
    });

    it("requires explicit, unchecked opt-in checkbox", () => {
      expect(consentFormContent).toContain('type="checkbox"');
      expect(consentFormContent).toContain("consent: false");
      expect(consentFormContent).toContain("Message and data rates may apply");
      expect(consentFormContent).toContain("Reply STOP to cancel");
    });
  });
});
