import SwiftUI
import UIKit

struct NativeOnboardingView: View {
    @Environment(AppEnvironment.self) private var environment
    @State private var model = OnboardingModel()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if model.draft.currentStep != .welcome { progress.padding(.horizontal, 24).padding(.top) }
                ScrollView {
                    content
                        .frame(maxWidth: 560, alignment: .leading)
                        .padding(24)
                        .frame(maxWidth: .infinity)
                        .id(model.draft.currentStep)
                        .transition(.asymmetric(
                            insertion: .move(edge: .trailing).combined(with: .opacity),
                            removal: .move(edge: .leading).combined(with: .opacity),
                        ))
                }
                    .scrollDismissesKeyboard(.interactively)
                actions.padding(24).background(.bar)
            }
            .background(DRXPalette.canvas.ignoresSafeArea())
            .animation(
                .spring(response: 0.34, dampingFraction: 0.86, blendDuration: 0.2),
                value: model.draft.currentStep,
            )
            .onAppear {
                environment.telemetry.capture(model.resumed ? "onboarding_resumed" : "onboarding_started", properties: ["step": model.draft.currentStep.rawValue])
                environment.telemetry.screen("Business Onboarding: \(model.draft.currentStep.rawValue)")
            }
            .onChange(of: model.draft.currentStep) { _, step in
                environment.telemetry.capture("onboarding_step_viewed", properties: ["step": step.rawValue])
            }
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
                choice("Yes", selected: model.draft.taxChoice == .yes) { model.draft.taxChoice = .yes }
                choice("Not right now", selected: model.draft.taxChoice == .later) { model.draft.taxChoice = .later; model.draft.taxRate = "" }
                choice("I’m not sure", selected: model.draft.taxChoice == .unsure) { model.draft.taxChoice = .unsure; model.draft.taxRate = "" }
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
            case .completed: workspaceReady
            default: ProgressView("Creating your DRX workspace…")
            }
            if let message = model.validationMessage { Text(message).foregroundStyle(DRXPalette.danger).accessibilityLabel("Error: \(message)") }
        }
        .foregroundStyle(DRXPalette.ink)
    }

    private var actions: some View {
        HStack {
            if model.draft.currentStep != .welcome && model.draft.currentStep != .completed {
                onboardingActionButton("Back") { withAnimation { model.back() } }
            }
            Spacer()
            if model.draft.currentStep == .completed {
                onboardingActionButton(
                    model.draft.businessType == .service ? "Create First Service" : "Add First Product",
                    identifier: "onboardingFirstAction",
                    action: {
                        environment.telemetry.capture(
                            "onboarding_first_action_selected",
                            properties: [
                                "action": model.draft.businessType == .service
                                    ? "create_service"
                                    : "add_product",
                            ],
                        )
                        Task { await environment.openWorkspace(at: .inventory) }
                    },
                )
            } else {
                onboardingActionButton(
                    model.draft.currentStep == .welcome
                        ? "Set Up My Business"
                        : model.draft.currentStep == .review
                        ? "Create My Workspace"
                        : "Continue",
                    isDisabled: environment.isSubmittingOnboarding,
                    identifier: "onboardingContinue",
                    action: {
                        if model.draft.currentStep == .review {
                            submit()
                        } else {
                            model.continueForward()
                        }
                    },
                )
            }
        }
    }
    
    private func onboardingActionButton(
        _ title: String,
        identifier: String = "",
        isDisabled: Bool = false,
        action: @escaping () -> Void
    ) -> some View {
        Button(title, action: action)
            .frame(minHeight: 44)
            .buttonStyle(.borderedProminent)
            .tint(DRXPalette.accent)
            .foregroundStyle(DRXPalette.onAccent)
            .disabled(isDisabled)
            .accessibilityIdentifier(identifier)
            .contentTransition(.identity)
    }
    private func prompt(_ title: String, _ body: String) -> some View { VStack(alignment: .leading, spacing: 10) { Text(title).font(.largeTitle.bold()); Text(body).foregroundStyle(DRXPalette.muted) } }
    private func choice(_ title: String, selected: Bool, action: @escaping () -> Void) -> some View { Button(action: action) { HStack { Text(title).foregroundStyle(DRXPalette.ink); Spacer(); Image(systemName: selected ? "checkmark.circle.fill" : "circle").accessibilityHidden(true) }.padding().frame(minHeight: 56).background(DRXPalette.card, in: RoundedRectangle(cornerRadius: 14)).overlay { RoundedRectangle(cornerRadius: 14).stroke(selected ? DRXPalette.accent : DRXPalette.border) } }.accessibilityAddTraits(selected ? .isSelected : []) }
    private var review: some View { VStack(alignment: .leading, spacing: 14) { prompt("Review your setup", "Everything here can be changed later in Business Settings."); summary("Owner", model.draft.ownerName, .ownerProfile); summary("Business", model.draft.businessName, .businessName); summary("Location", model.draft.locationName, .location); summary("Tax", model.draft.taxChoice == .yes ? "Enabled at \(model.draft.taxRate)%" : "Not enabled", .taxDecision); summary("Inventory", model.draft.tracksInventory == true ? "Tracking enabled" : "Not enabled", model.draft.businessType?.tracksProducts == false ? .businessType : .inventoryDecision); summary("Team", model.draft.inviteTeam == true ? model.draft.invitedUserEmail : "Just me for now", .teamDecision) } }
    private func summary(_ title: String, _ value: String, _ step: OnboardingStep) -> some View { HStack { VStack(alignment: .leading) { Text(title).font(.caption).foregroundStyle(DRXPalette.muted); Text(value) }; Spacer(); Button("Edit") { model.edit(step) } }.padding().background(DRXPalette.card, in: RoundedRectangle(cornerRadius: 12)) }
    private var workspaceReady: some View { VStack(alignment: .leading, spacing: 16) { Text("Setup complete").font(.caption.bold()).foregroundStyle(DRXPalette.accent); prompt("Your DRX workspace is ready", "Here’s what we created. You can change these settings whenever you need to."); summaryValue("Business", model.draft.businessName); summaryValue("Owner", "\(model.draft.ownerName) · Owner"); summaryValue("Location", model.draft.locationName); summaryValue("Tax", model.draft.taxChoice == .yes ? "Enabled at \(model.draft.taxRate)%" : "Not enabled"); summaryValue("Inventory", model.draft.tracksInventory == true ? "Tracking enabled" : "Not enabled"); Text("What would you like to do first?").font(.title3.bold()) } }
    private func summaryValue(_ title: String, _ value: String) -> some View { LabeledContent(title, value: value).padding().background(DRXPalette.card, in: RoundedRectangle(cornerRadius: 12)) }
    private func submit() {
        let draft = model.draft
        let invitesTeam = draft.inviteTeam == true
        environment.telemetry.capture(
            "onboarding_submission_started",
            properties: [
                "business_type": draft.businessType?.rawValue ?? "other",
                "tax_enabled": draft.taxChoice == .yes,
                "inventory_enabled": draft.tracksInventory == true,
            ],
        )
        Task {
            let success = await environment.completeOnboarding(
                .init(
                    name: draft.ownerName.trimmingCharacters(in: .whitespacesAndNewlines),
                    businessName: draft.businessName.trimmingCharacters(in: .whitespacesAndNewlines),
                    businessType: draft.businessType?.rawValue ?? "other",
                    currency: draft.currency,
                    timezone: draft.timezone,
                    collectTax: draft.taxChoice == .yes,
                    taxRateBps: Int(((Double(draft.taxRate) ?? 0) * 100).rounded()),
                    locationName: draft.locationName,
                    city: draft.city.nilIfEmpty,
                    region: draft.region.nilIfEmpty,
                    country: draft.country,
                    tracksInventory: draft.tracksInventory == true,
                    invitedUserEmail: invitesTeam ? draft.invitedUserEmail.nilIfEmpty : nil,
                    invitedUserRole: invitesTeam ? draft.invitedUserRole.uppercased() : nil,
                    invitationToken: invitesTeam ? UUID().uuidString : nil,
                )
            )
            if success {
                model.markCompleted()
                environment.telemetry.capture(
                    "onboarding_completed",
                    properties: ["business_type": draft.businessType?.rawValue ?? "other"],
                )
                UINotificationFeedbackGenerator().notificationOccurred(.success)
            } else {
                environment.telemetry.capture(
                    "onboarding_submission_failed",
                    properties: ["error_category": "recoverable"],
                )
            }
        }
    }
}

private extension String { var nilIfEmpty: String? { let value = trimmingCharacters(in: .whitespacesAndNewlines); return value.isEmpty ? nil : value } }
