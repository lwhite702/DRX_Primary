export const ONBOARDING_DRAFT_KEY = "drx_onboarding_draft_v1";

export type BusinessType = "retail" | "delivery" | "service" | "wholesale" | "hybrid" | "other";
export type OnboardingStep =
  | "welcome"
  | "ownerProfile"
  | "businessName"
  | "businessType"
  | "location"
  | "regionalSettings"
  | "taxDecision"
  | "taxDetails"
  | "inventoryDecision"
  | "teamDecision"
  | "teamInvitation"
  | "review"
  | "completed";

export type OnboardingTaxChoice = "yes" | "later" | "unsure";

export interface OnboardingDraft {
  ownerName: string;
  businessName: string;
  businessType: BusinessType;
  locationName: string;
  city: string;
  region: string;
  country: string;
  currency: string;
  timezone: string;
  taxChoice: OnboardingTaxChoice;
  taxRate: string;
  tracksInventory: boolean;
  inviteTeam: boolean;
  invitedUserEmail: string;
  invitedUserRole: string;
  currentStep: OnboardingStep;
  returnToReview: boolean;
}

const DEFAULT_DRAFT: Omit<OnboardingDraft, "currentStep" | "returnToReview"> = {
  ownerName: "",
  businessName: "",
  businessType: "retail",
  locationName: "",
  city: "",
  region: "",
  country: "",
  currency: "USD",
  timezone: "America/New_York",
  taxChoice: "later",
  taxRate: "",
  tracksInventory: true,
  inviteTeam: false,
  invitedUserEmail: "",
  invitedUserRole: "MANAGER",
};

const STEP_SEQUENCE: Exclude<OnboardingStep, "completed">[] = [
  "welcome",
  "ownerProfile",
  "businessName",
  "businessType",
  "location",
  "regionalSettings",
  "taxDecision",
  "taxDetails",
  "inventoryDecision",
  "teamDecision",
  "teamInvitation",
  "review",
];

export const productBusiness = (type: BusinessType): boolean => type !== "service";

const isTaxDetailsStepEnabled = (draft: OnboardingDraft) => draft.taxChoice === "yes";
const isInventoryStepEnabled = (draft: OnboardingDraft) => productBusiness(draft.businessType);
const isTeamInviteStepEnabled = (draft: OnboardingDraft) => draft.inviteTeam;

const nextVisibleStep = (draft: OnboardingDraft, current: Exclude<OnboardingStep, "completed">): Exclude<OnboardingStep, "completed"> => {
  const nextCandidates = STEP_SEQUENCE.slice(
    STEP_SEQUENCE.indexOf(current) + 1,
  );

  for (const candidate of nextCandidates) {
    if (candidate === "taxDetails" && !isTaxDetailsStepEnabled(draft)) {
      continue;
    }
    if (candidate === "inventoryDecision" && !isInventoryStepEnabled(draft)) {
      continue;
    }
    if (candidate === "teamInvitation" && !isTeamInviteStepEnabled(draft)) {
      continue;
    }
    return candidate;
  }

  return "review";
};

export function createDraft(timezone = "America/New_York"): OnboardingDraft {
  return {
    ...DEFAULT_DRAFT,
    timezone,
    currentStep: "welcome",
    returnToReview: false,
  };
}

export function loadDraft(storage: Pick<Storage, "getItem">, timezone = "America/New_York"): OnboardingDraft {
  const raw = storage.getItem(ONBOARDING_DRAFT_KEY);
  if (!raw) {
    return createDraft(timezone);
  }

  try {
    const parsed = JSON.parse(raw) as Partial<OnboardingDraft>;
    const normalizedTimezone = typeof parsed.timezone === "string" && parsed.timezone
      ? parsed.timezone
      : timezone;

    return {
      ...createDraft(normalizedTimezone),
      ...parsed,
      timezone: normalizedTimezone,
      currentStep: (parsed.currentStep as OnboardingStep) ?? "welcome",
      returnToReview: parsed.returnToReview ?? false,
    };
  } catch {
    return createDraft(timezone);
  }
}

export function saveDraft(storage: Pick<Storage, "setItem">, draft: OnboardingDraft): void {
  storage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
}

export function clearDraft(storage: Pick<Storage, "removeItem">): void {
  storage.removeItem(ONBOARDING_DRAFT_KEY);
}

export function validationMessage(draft: OnboardingDraft): string | null {
  switch (draft.currentStep) {
    case "ownerProfile":
      return draft.ownerName.trim() ? null : "Owner name is required.";
    case "businessName":
      return draft.businessName.trim() ? null : "Business name is required.";
    case "businessType":
      return draft.businessType ? null : "Choose a business type.";
    case "location":
      return draft.locationName.trim() ? null : "Location name is required.";
    case "taxDetails":
      if (!draft.taxRate.trim()) {
        return "Please add a tax rate.";
      }
      return Number.isFinite(Number(draft.taxRate)) && Number(draft.taxRate) >= 0 && Number(draft.taxRate) <= 100
        ? null
        : "Enter a valid tax rate between 0 and 100.";
    case "teamInvitation":
      if (!draft.invitedUserEmail.trim()) {
        return "An email is required to invite a team member.";
      }
      return /.+@.+\..+/.test(draft.invitedUserEmail)
        ? null
        : "Enter a valid email address.";
    default:
      return null;
  }
}

export function nextStep(draft: OnboardingDraft): OnboardingStep {
  if (draft.currentStep === "review" || draft.currentStep === "completed") {
    return "completed";
  }
  return nextVisibleStep(draft, draft.currentStep);
}

export function previousStep(draft: OnboardingDraft): OnboardingStep {
  if (draft.currentStep === "welcome") {
    return "welcome";
  }

  if (draft.currentStep === "review") {
    return "teamInvitation";
  }

  if (draft.currentStep === "completed") {
    return "review";
  }

  const currentIndex = STEP_SEQUENCE.indexOf(draft.currentStep);
  const previousCandidates = STEP_SEQUENCE.slice(0, currentIndex).reverse();

  for (const candidate of previousCandidates) {
    if (candidate === "taxDetails" && !isTaxDetailsStepEnabled(draft)) {
      continue;
    }
    if (candidate === "inventoryDecision" && !isInventoryStepEnabled(draft)) {
      continue;
    }
    if (candidate === "teamInvitation" && !isTeamInviteStepEnabled(draft)) {
      continue;
    }
    return candidate;
  }

  return "welcome";
}
