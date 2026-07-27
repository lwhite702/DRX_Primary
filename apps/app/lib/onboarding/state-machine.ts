export const ONBOARDING_DRAFT_KEY = "drx_onboarding_draft_v1";
export const ONBOARDING_DRAFT_VERSION = 1;

export type BusinessType = "retail" | "delivery" | "service" | "wholesale" | "hybrid" | "other";
export type TaxChoice = "yes" | "later" | "unsure";
export type OnboardingStep =
  | "welcome" | "ownerProfile" | "businessName" | "businessType" | "location"
  | "regionalSettings" | "taxDecision" | "taxDetails" | "inventoryDecision"
  | "teamDecision" | "teamInvitation" | "review" | "submitting" | "completed" | "recoverableError";

export type OnboardingDraft = {
  version: 1; currentStep: OnboardingStep; ownerName: string; businessName: string;
  businessType?: BusinessType; locationName: string; city: string; region: string; country: string;
  currency: string; timezone: string; taxChoice?: TaxChoice; taxRate: string;
  tracksInventory?: boolean; inviteTeam?: boolean; invitedUserEmail: string; invitedUserRole: string;
  lastSavedAt?: string;
};

/**
 * Creates an onboarding draft with default values.
 *
 * @param timezone - The timezone to assign to the draft
 * @returns A new onboarding draft initialized at the welcome step
 */
export function createDraft(timezone = "America/New_York"): OnboardingDraft {
  return { version: 1, currentStep: "welcome", ownerName: "", businessName: "", locationName: "Main Location",
    city: "", region: "", country: "US", currency: "USD", timezone, taxRate: "", invitedUserEmail: "", invitedUserRole: "manager" };
}

export const productBusiness = (type?: BusinessType) => type !== "service";

/**
 * Determines the next onboarding step based on the current step and draft decisions.
 *
 * @param draft - The onboarding draft containing the current step and branching choices
 * @returns The next onboarding step
 */
export function nextStep(draft: OnboardingDraft): OnboardingStep {
  switch (draft.currentStep) {
    case "welcome": return "ownerProfile"; case "ownerProfile": return "businessName";
    case "businessName": return "businessType"; case "businessType": return "location";
    case "location": return "regionalSettings"; case "regionalSettings": return "taxDecision";
    case "taxDecision": return draft.taxChoice === "yes" ? "taxDetails" : productBusiness(draft.businessType) ? "inventoryDecision" : "teamDecision";
    case "taxDetails": return productBusiness(draft.businessType) ? "inventoryDecision" : "teamDecision";
    case "inventoryDecision": return "teamDecision";
    case "teamDecision": return draft.inviteTeam ? "teamInvitation" : "review";
    case "teamInvitation": return "review"; case "review": return "submitting";
    default: return draft.currentStep;
  }
}

/**
 * Determines the preceding onboarding step for the current draft.
 *
 * @param draft - The onboarding draft whose current step determines the result
 * @returns The preceding onboarding step, or the current step when no preceding step is defined
 */
export function previousStep(draft: OnboardingDraft): OnboardingStep {
  switch (draft.currentStep) {
    case "ownerProfile": return "welcome"; case "businessName": return "ownerProfile";
    case "businessType": return "businessName"; case "location": return "businessType";
    case "regionalSettings": return "location"; case "taxDecision": return "regionalSettings";
    case "taxDetails": return "taxDecision";
    case "inventoryDecision": return draft.taxChoice === "yes" ? "taxDetails" : "taxDecision";
    case "teamDecision": return productBusiness(draft.businessType) ? "inventoryDecision" : draft.taxChoice === "yes" ? "taxDetails" : "taxDecision";
    case "teamInvitation": return "teamDecision";
    case "review": return draft.inviteTeam ? "teamInvitation" : "teamDecision";
    default: return draft.currentStep;
  }
}

/**
 * Validates the fields required for the draft's current onboarding step.
 *
 * @param draft - The onboarding draft to validate
 * @returns The first applicable validation message, or `null` when the current step is valid
 */
export function validationMessage(draft: OnboardingDraft): string | null {
  if (draft.currentStep === "ownerProfile" && !draft.ownerName.trim()) return "Enter the name your team should use.";
  if (draft.currentStep === "businessName" && !draft.businessName.trim()) return "Enter a business name to continue.";
  if (draft.currentStep === "businessType" && !draft.businessType) return "Choose the option that fits best for now.";
  if (draft.currentStep === "taxDecision" && !draft.taxChoice) return "Choose an option to continue.";
  if (draft.currentStep === "taxDetails" && (!Number.isFinite(Number(draft.taxRate)) || Number(draft.taxRate) < 0 || Number(draft.taxRate) > 100)) return "Enter a tax rate from 0% to 100%.";
  if (draft.currentStep === "inventoryDecision" && draft.tracksInventory === undefined) return "Choose whether to track inventory.";
  if (draft.currentStep === "teamDecision" && draft.inviteTeam === undefined) return "Choose whether to invite someone now.";
  if (draft.currentStep === "teamInvitation" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.invitedUserEmail)) return "Enter a valid email address.";
  return null;
}

/**
 * Restores an onboarding draft from a serialized value when its version is supported.
 *
 * @param value - The serialized onboarding draft
 * @returns The restored draft, or `null` when the value is missing, invalid, or uses an unsupported version
 */
export function restoreDraft(value: string | null): OnboardingDraft | null {
  if (!value) return null;
  try { const parsed = JSON.parse(value) as OnboardingDraft; return parsed.version === ONBOARDING_DRAFT_VERSION ? parsed : null; } catch { return null; }
}
