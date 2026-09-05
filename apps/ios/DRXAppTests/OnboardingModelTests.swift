import XCTest
@testable import DRXApp

private final class MemoryDraftStore: OnboardingDraftStore {
    var value: OnboardingDraft?
    func load() -> OnboardingDraft? { value }
    func save(_ draft: OnboardingDraft) { value = draft }
    func clear() { value = nil }
}

@MainActor final class OnboardingModelTests: XCTestCase {
    func testNewUserStartsAtWelcomeAndValidStepsPersist() {
        let store = MemoryDraftStore(); let model = OnboardingModel(store: store)
        XCTAssertEqual(model.draft.currentStep, .welcome)
        model.continueForward(); model.draft.ownerName = "Lee White"; model.continueForward()
        XCTAssertEqual(store.value?.currentStep, .businessName)
    }
    func testTaxAndServiceBranchesUseProgressiveDisclosure() {
        let model = OnboardingModel(store: MemoryDraftStore())
        model.draft.currentStep = .taxDecision; model.draft.businessType = .service; model.draft.taxChoice = .later
        model.continueForward(); XCTAssertEqual(model.draft.currentStep, .teamDecision)
        model.draft.currentStep = .taxDecision; model.draft.taxChoice = .yes; model.continueForward()
        XCTAssertEqual(model.draft.currentStep, .taxDetails)
    }
    func testInvalidRateDoesNotAdvance() {
        let model = OnboardingModel(store: MemoryDraftStore()); model.draft.currentStep = .taxDetails; model.draft.taxRate = "101"
        model.continueForward(); XCTAssertEqual(model.draft.currentStep, .taxDetails); XCTAssertNotNil(model.validationMessage)
    }
    func testCompletedDraftCanBeCleared() {
        let store = MemoryDraftStore(); store.value = OnboardingDraft(); let model = OnboardingModel(store: store)
        model.clear(); XCTAssertNil(store.value)
    }
    func testReviewEditReturnsDirectlyToReview() {
        let model = OnboardingModel(store: MemoryDraftStore()); model.draft.currentStep = .review
        model.edit(.businessName); model.draft.businessName = "Wrelik Retail"; model.continueForward()
        XCTAssertEqual(model.draft.currentStep, .review)
    }
}
