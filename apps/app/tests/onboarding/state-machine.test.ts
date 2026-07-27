import { describe, expect, it } from "vitest";
import { createDraft, nextStep, previousStep, restoreDraft, validationMessage } from "@/lib/onboarding/state-machine";

describe("progressive onboarding state machine", () => {
  it("starts at welcome and advances one decision at a time", () => { const draft = createDraft(); expect(draft.currentStep).toBe("welcome"); expect(nextStep(draft)).toBe("ownerProfile"); });
  it("requires owner and business names", () => { const draft = createDraft(); draft.currentStep = "ownerProfile"; expect(validationMessage(draft)).toMatch(/name/); draft.ownerName = "Lee White"; expect(validationMessage(draft)).toBeNull(); });
  it("only reveals tax details for tax collection", () => { const draft = createDraft(); draft.currentStep = "taxDecision"; draft.businessType = "retail"; draft.taxChoice = "later"; expect(nextStep(draft)).toBe("inventoryDecision"); draft.taxChoice = "yes"; expect(nextStep(draft)).toBe("taxDetails"); });
  it("skips inventory for service businesses", () => { const draft = createDraft(); draft.currentStep = "taxDecision"; draft.businessType = "service"; draft.taxChoice = "later"; expect(nextStep(draft)).toBe("teamDecision"); });
  it("skips an optional invitation and navigates back", () => { const draft = createDraft(); draft.currentStep = "teamDecision"; draft.inviteTeam = false; expect(nextStep(draft)).toBe("review"); draft.currentStep = "review"; expect(previousStep(draft)).toBe("teamDecision"); });
  it("validates percentages and invitation email inline", () => { const draft = createDraft(); draft.currentStep = "taxDetails"; draft.taxRate = "101"; expect(validationMessage(draft)).toMatch(/0% to 100%/); draft.currentStep = "teamInvitation"; draft.invitedUserEmail = "invalid"; expect(validationMessage(draft)).toMatch(/valid email/); });
  it("restores only versioned valid drafts", () => { const draft = createDraft(); draft.currentStep = "location"; expect(restoreDraft(JSON.stringify(draft))?.currentStep).toBe("location"); expect(restoreDraft('{"version":2}')).toBeNull(); expect(restoreDraft("bad json")).toBeNull(); });
});
