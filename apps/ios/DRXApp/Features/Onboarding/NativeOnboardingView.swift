import SwiftUI
import UIKit

struct NativeOnboardingView: View {
    @Environment(AppEnvironment.self) private var environment
    @State private var model = OnboardingModel()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if model.draft.currentStep != .welcome { progress.padding(.horizontal, 24).padding(.top) }
                ScrollView { content.frame(maxWidth: 560, alignment: .leading).padding(24).frame(maxWidth: .infinity) }
                    .scrollDismissesKeyboard(.interactively)
                actions.padding(24).background(.bar)
            }
            .background(DRXPalette.canvas.ignoresSafeArea())
            .animation(.easeOut(duration: 0.2), value: model.draft.currentStep)
            .onAppear { environment.telemetry.screen("Business Onboarding: \(model.draft.currentStep.rawValue)") }
        }
    }

    private var progress: some View {
        let value = model.progress
        return VStack(alignment: .leading, spacing: 8) {
            HStack { Text("Step \(value.0) of \(value.1)"); Spacer(); Text("Progress saved") }.font(.caption).foregroundStyle(DRXPalette.muted)
            ProgressView(value: Double(value.0), total: Double(value.1)).accessibilityLabel("Business setup, step \(value.0) of \(value.1)")
        }
    }

    @ViewBuilder private var content: some View {
        VStack(alignment: .leading, spacing: 20) {
            if model.resumed && model.draft.currentStep != .welcome { Text("Welcome back. Let’s finish setting up your business.").font(.callout).padding().background(DRXPalette.surface, in: RoundedRectangle(cornerRadius: 12)) }
            switch model.draft.currentStep {
            case .welcome: prompt("Welcome to DRX", "Let’s set up the essentials so you can start managing products, inventory, customers, and transactions.")
            case .ownerProfile:
                prompt("What should your team call you?", "This name appears in activity history and transaction records.")
                TextField("Full name", text: $model.draft.ownerName).textContentType(.name).textFieldStyle(.roundedBorder).accessibilityIdentifier("onboardingOwnerName")
            case .businessName:
                prompt("What should we call your business?", "You can update the public-facing name later.")
                TextField("Business name", text: $model.draft.businessName).textFieldStyle(.roundedBorder).accessibilityIdentifier("onboardingBusinessName")
            case .businessType:
                prompt("What kind of business are you setting up?", "Choose the closest fit. This only helps us recommend useful defaults.")
                ForEach(OnboardingBusinessType.allCases, id: \.self) { type in choice(type.title, selected: model.draft.businessType == type) { model.draft.businessType = type; if type == .service { model.draft.tracksInventory = false } } }
            case .location:
                prompt("Where does your business operate?", "This location is internal unless you choose to publish it later.")
                Group { TextField("Location name", text: $model.draft.locationName); TextField("City", text: $model.draft.city); TextField("State or region", text: $model.draft.region); TextField("Country", text: $model.draft.country) }.textFieldStyle(.roundedBorder)
            case .regionalSettings:
                prompt("Do these settings look right?", "We suggested these from your device. You can change them now or later.")
                LabeledContent("Currency") { TextField("Currency", text: $model.draft.currency).multilineTextAlignment(.trailing) }
                LabeledContent("Time zone") { TextField("Time zone", text: $model.draft.timezone).multilineTextAlignment(.trailing) }
            case .taxDecision:
                prompt("Will you collect sales tax in DRX?", "DRX can include tax in transaction totals. Confirm the correct rules and rate for your business.")
                choice("Yes", selected: model.draft.collectsTax == true) { model.draft.collectsTax = true }
                choice("Not right now", selected: model.draft.collectsTax == false) { model.draft.collectsTax = false; model.draft.taxRate = "" }
            case .taxDetails:
                prompt("What default tax rate should DRX use?", "You can configure supported product and location overrides later.")
                TextField("8.25%", text: $model.draft.taxRate).keyboardType(.decimalPad).textFieldStyle(.roundedBorder).accessibilityIdentifier("onboardingTaxRate")
            case .inventoryDecision:
                prompt("Would you like DRX to track inventory quantities?", "Inventory tracking helps prevent overselling and records stock changes.")
                choice("Yes, track inventory", selected: model.draft.tracksInventory == true) { model.draft.tracksInventory = true }
                choice("Not yet", selected: model.draft.tracksInventory == false) { model.draft.tracksInventory = false }
            case .teamDecision:
                prompt("Will anyone else use DRX with you?", "You can assign different access levels later.")
                choice("Invite someone now", selected: model.draft.inviteTeam == true) { model.draft.inviteTeam = true }
                choice("I’ll do this later", selected: model.draft.inviteTeam == false) { model.draft.inviteTeam = false }
            case .teamInvitation:
                prompt("Who would you like to invite?", "We’ll keep permissions simple. You can customize them later.")
                TextField("Email", text: $model.draft.invitedUserEmail).keyboardType(.emailAddress).textInputAutocapitalization(.never).textFieldStyle(.roundedBorder)
                Picker("Role", selection: $model.draft.invitedUserRole) { ForEach(["Manager", "Operator", "Inventory"], id: \.self) { Text($0) } }
            case .review: review
            default: ProgressView("Creating your DRX workspace…")
            }
            if let message = model.validationMessage { Text(message).foregroundStyle(DRXPalette.danger).accessibilityLabel("Error: \(message)") }
        }.foregroundStyle(DRXPalette.ink).transition(.opacity.combined(with: .move(edge: .trailing)))
    }

    private var actions: some View {
        HStack { if model.draft.currentStep != .welcome { Button("Back") { model.back() }.frame(minHeight: 44) }; Spacer()
            Button(model.draft.currentStep == .welcome ? "Set Up My Business" : model.draft.currentStep == .review ? "Create My Workspace" : "Continue") {
                if model.draft.currentStep == .review { submit() } else { model.continueForward() }
            }.buttonStyle(.borderedProminent).disabled(environment.isSubmittingOnboarding).frame(minHeight: 44).accessibilityIdentifier("onboardingContinue")
        }
    }
    /// Creates a vertically arranged prompt with a title and supporting text.
/// - Parameters:
///   - title: The prompt title.
///   - body: The supporting text.
private func prompt(_ title: String, _ body: String) -> some View { VStack(alignment: .leading, spacing: 10) { Text(title).font(.largeTitle.bold()); Text(body).foregroundStyle(DRXPalette.muted) } }
    /// Creates a selectable option button with a title and selection indicator.
/// - Parameters:
///   - title: The title displayed for the option.
///   - selected: A Boolean value indicating whether the option is selected.
///   - action: The action performed when the option is selected.
/// - Returns: A styled selectable option button.
private func choice(_ title: String, selected: Bool, action: @escaping () -> Void) -> some View { Button(action: action) { HStack { Text(title).foregroundStyle(DRXPalette.ink); Spacer(); Image(systemName: selected ? "checkmark.circle.fill" : "circle").accessibilityHidden(true) }.padding().frame(minHeight: 56).background(DRXPalette.card, in: RoundedRectangle(cornerRadius: 14)).overlay { RoundedRectangle(cornerRadius: 14).stroke(selected ? DRXPalette.accent : DRXPalette.border) } }.accessibilityAddTraits(selected ? .isSelected : []) }
    private var review: some View { VStack(alignment: .leading, spacing: 14) { prompt("Review your setup", "Everything here can be changed later in Business Settings."); summary("Owner", model.draft.ownerName); summary("Business", model.draft.businessName); summary("Location", model.draft.locationName); summary("Tax", model.draft.collectsTax == true ? "Enabled at \(model.draft.taxRate)%" : "Not enabled"); summary("Inventory", model.draft.tracksInventory == true ? "Tracking enabled" : "Not enabled") } }
    /// Displays a labeled value in a styled summary card.
///
/// - Parameters:
///   - title: The label for the summary value.
///   - value: The summary value to display.
/// - Returns: A styled view containing the label and value.
private func summary(_ title: String, _ value: String) -> some View { LabeledContent(title, value: value).padding().background(DRXPalette.card, in: RoundedRectangle(cornerRadius: 12)) }
    /// Submits the onboarding details to create the workspace.
/// On success, clears the onboarding state and provides success feedback.
private func submit() { let draft = model.draft; Task { let success = await environment.completeOnboarding(.init(name: draft.ownerName.trimmingCharacters(in: .whitespacesAndNewlines), businessName: draft.businessName.trimmingCharacters(in: .whitespacesAndNewlines), businessType: draft.businessType?.rawValue ?? "other", currency: draft.currency, timezone: draft.timezone, collectTax: draft.collectsTax == true, taxRateBps: Int(((Double(draft.taxRate) ?? 0) * 100).rounded()))); if success { model.clear(); UINotificationFeedbackGenerator().notificationOccurred(.success) } } }
}
