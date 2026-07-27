import Foundation
import Observation

enum OnboardingStep: String, Codable, CaseIterable {
    case welcome, ownerProfile, businessName, businessType, location, regionalSettings
    case taxDecision, taxDetails, inventoryDecision, teamDecision, teamInvitation, review
    case submitting, completed, recoverableError
}

enum OnboardingBusinessType: String, Codable, CaseIterable {
    case retail, delivery, service, wholesale, hybrid, other
    var title: String { rawValue.capitalized }
    var tracksProducts: Bool { self != .service }
}

struct OnboardingDraft: Codable, Equatable {
    static let currentVersion = 1
    var version = Self.currentVersion
    var currentStep: OnboardingStep = .welcome
    var ownerName = ""
    var businessName = ""
    var businessType: OnboardingBusinessType?
    var locationName = "Main Location"
    var city = ""
    var region = ""
    var country = Locale.current.region?.identifier ?? "US"
    var currency = Locale.current.currency?.identifier ?? "USD"
    var timezone = TimeZone.current.identifier
    var collectsTax: Bool?
    var taxRate = ""
    var tracksInventory: Bool?
    var inviteTeam: Bool?
    var invitedUserEmail = ""
    var invitedUserRole = "Manager"
    var lastSavedAt = Date()
}

protocol OnboardingDraftStore {
    func load() -> OnboardingDraft?
    func save(_ draft: OnboardingDraft)
    func clear()
}

struct UserDefaultsOnboardingDraftStore: OnboardingDraftStore {
    private let key = "drx.onboarding.draft.v1"
    /// Loads the saved onboarding draft when it is valid and current.
    /// - Returns: The decoded onboarding draft, or `nil` when no draft is saved, decoding fails, or the draft version is outdated.
    func load() -> OnboardingDraft? {
        guard let data = UserDefaults.standard.data(forKey: key),
              let draft = try? JSONDecoder().decode(OnboardingDraft.self, from: data), draft.version == OnboardingDraft.currentVersion else { return nil }
        return draft
    }
    /// Saves an onboarding draft to persistent user defaults storage.
/// - Parameter draft: The onboarding draft to save.
func save(_ draft: OnboardingDraft) { if let data = try? JSONEncoder().encode(draft) { UserDefaults.standard.set(data, forKey: key) } }
    /// Removes the saved onboarding draft.
func clear() { UserDefaults.standard.removeObject(forKey: key) }
}

@MainActor @Observable
final class OnboardingModel {
    var draft: OnboardingDraft
    var validationMessage: String?
    let resumed: Bool
    private let store: any OnboardingDraftStore

    init(store: any OnboardingDraftStore = UserDefaultsOnboardingDraftStore()) {
        self.store = store
        if let saved = store.load() { draft = saved; resumed = saved.currentStep != .welcome }
        else { draft = OnboardingDraft(); resumed = false }
    }

    var progress: (Int, Int) {
        let steps = visibleSteps
        return ((steps.firstIndex(of: draft.currentStep) ?? 0) + 1, steps.count)
    }
    var visibleSteps: [OnboardingStep] {
        var steps: [OnboardingStep] = [.ownerProfile, .businessName, .businessType, .location, .regionalSettings, .taxDecision]
        if draft.collectsTax == true { steps.append(.taxDetails) }
        if draft.businessType?.tracksProducts != false { steps.append(.inventoryDecision) }
        steps.append(.teamDecision)
        if draft.inviteTeam == true { steps.append(.teamInvitation) }
        steps.append(.review); return steps
    }

    /// Advances the onboarding flow after validating the current step.
    ///
    — Parameters: None
    /// Updates the draft’s current step, records the save time, and persists the draft when navigation advances.
    func continueForward() {
        guard validate() else { return }
        validationMessage = nil
        switch draft.currentStep {
        case .welcome: draft.currentStep = .ownerProfile
        case .ownerProfile: draft.currentStep = .businessName
        case .businessName: draft.currentStep = .businessType
        case .businessType: draft.currentStep = .location
        case .location: draft.currentStep = .regionalSettings
        case .regionalSettings: draft.currentStep = .taxDecision
        case .taxDecision: draft.currentStep = draft.collectsTax == true ? .taxDetails : nextAfterTax
        case .taxDetails: draft.currentStep = nextAfterTax
        case .inventoryDecision: draft.currentStep = .teamDecision
        case .teamDecision: draft.currentStep = draft.inviteTeam == true ? .teamInvitation : .review
        case .teamInvitation: draft.currentStep = .review
        default: return
        }
        draft.lastSavedAt = Date(); store.save(draft)
    }
    /// Moves the onboarding draft to the previous visible step or resets it to the welcome step.
/// - Note: Persists the draft when moving to a previous step.
func back() { if let index = visibleSteps.firstIndex(of: draft.currentStep), index > 0 { draft.currentStep = visibleSteps[index - 1]; store.save(draft) } else { draft.currentStep = .welcome } }
    /// Clears the persisted onboarding draft.
func clear() { store.clear() }
    private var nextAfterTax: OnboardingStep { draft.businessType?.tracksProducts == false ? .teamDecision : .inventoryDecision }
    /// Validates the required onboarding data for the current step.
    /// - Returns: `true` when the current step is valid; `false` otherwise.
    private func validate() -> Bool {
        switch draft.currentStep {
        case .ownerProfile where draft.ownerName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty: validationMessage = "Enter the name your team should use."
        case .businessName where draft.businessName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty: validationMessage = "Enter a business name to continue."
        case .businessType where draft.businessType == nil: validationMessage = "Choose the option that fits best for now."
        case .taxDecision where draft.collectsTax == nil: validationMessage = "Choose an option to continue."
        case .taxDetails where Double(draft.taxRate).map({ !(0...100).contains($0) }) ?? true: validationMessage = "Enter a tax rate from 0% to 100%."
        case .inventoryDecision where draft.tracksInventory == nil: validationMessage = "Choose whether to track inventory."
        case .teamDecision where draft.inviteTeam == nil: validationMessage = "Choose whether to invite someone now."
        case .teamInvitation where !draft.invitedUserEmail.contains("@"): validationMessage = "Enter a valid email address."
        default: return true
        }
        return false
    }
}
