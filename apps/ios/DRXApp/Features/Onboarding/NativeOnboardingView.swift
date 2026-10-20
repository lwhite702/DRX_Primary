import SwiftUI
import UIKit
import ClerkKit

struct NativeOnboardingView: View {
    @Environment(AppEnvironment.self) private var environment
    @Environment(Clerk.self) private var clerk
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var model = OnboardingModel()
    @State private var navigationDirection: NavigationDirection = .forward
    @State private var accountError: String?

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
                        .transition(stepTransition)
                }
                    .scrollDismissesKeyboard(.interactively)
                actions.padding(24).background(.bar)
            }
            .background(DRXPalette.canvas.ignoresSafeArea())
            .animation(stepAnimation, value: model.draft.currentStep)
            .navigationTitle("Business setup")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Use another account", systemImage: "person.crop.circle.badge.arrow.forward") {
                        switchAccount()
                    }
                    .accessibilityIdentifier("onboardingSwitchAccount")
                }
            }
            .onAppear {
                environment.telemetry.capture(model.resumed ? "onboarding_resumed" : "onboarding_started", properties: ["step": model.draft.currentStep.rawValue])
                environment.telemetry.screen("Business Onboarding: \(model.draft.currentStep.rawValue)")
            }
            .onChange(of: model.draft.currentStep) { _, step in
                environment.telemetry.capture("onboarding_step_viewed", properties: ["step": step.rawValue])
            }
            .alert("Account Switch Failed", isPresented: .init(
                get: { accountError != nil },
                set: { if !$0 { accountError = nil } }
            )) {
                Button("OK", role: .cancel) { accountError = nil }
            } message: {
                Text(accountError ?? "")
            }
        }
    }

    private enum NavigationDirection { case forward, backward }

    private var stepAnimation: Animation {
        reduceMotion
            ? .easeOut(duration: 0.16)
            : .spring(response: 0.38, dampingFraction: 0.9, blendDuration: 0.16)
    }

    private var stepTransition: AnyTransition {
        guard !reduceMotion else { return .opacity }
        let insertion: Edge = navigationDirection == .forward ? .trailing : .leading
        let removal: Edge = navigationDirection == .forward ? .leading : .trailing
        return .asymmetric(
            insertion: .move(edge: insertion).combined(with: .opacity),
            removal: .move(edge: removal).combined(with: .opacity)
        )
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
            case .welcome: prompt("Welcome to DRX", "Let’s set up your business so you can track products, stock, customers, and sales.")
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
                prompt("Should DRX track stock counts?", "DRX records what comes in, what sells, and what changes. You can also set up products sold by weight or partial units.")
                choice("Yes, track stock", selected: model.draft.tracksInventory == true) { model.draft.tracksInventory = true }
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
            default: ProgressView("Creating your business…")
            }
            if let message = model.validationMessage { Text(message).foregroundStyle(DRXPalette.danger).accessibilityLabel("Error: \(message)") }
        }
        .foregroundStyle(DRXPalette.ink)
    }

    private var actions: some View {
        HStack {
            if model.draft.currentStep != .welcome && model.draft.currentStep != .completed {
                onboardingActionButton("Back", isPrimary: false) {
                    navigationDirection = .backward
                    withAnimation(stepAnimation) { model.back() }
                }
            }
            Spacer()
            if model.draft.currentStep == .completed {
                onboardingActionButton(
                    model.draft.businessType == .service ? "Create first service" : DRXContent.Actions.addProduct,
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
                        ? "Set up my business"
                        : model.draft.currentStep == .review
                        ? "Create my business"
                        : "Continue",
                    identifier: "onboardingContinue",
                    isDisabled: environment.isSubmittingOnboarding,
                    action: {
                        if model.draft.currentStep == .review {
                            submit()
                        } else {
                            navigationDirection = .forward
                            withAnimation(stepAnimation) { model.continueForward() }
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
        isPrimary: Bool = true,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Text(title)
                .font(.headline)
                .foregroundStyle(isPrimary ? DRXPalette.onAccent : DRXPalette.ink)
                .padding(.horizontal, 20)
                .frame(minHeight: 48)
                .background(
                    isPrimary ? DRXPalette.accent : DRXPalette.surface,
                    in: RoundedRectangle(cornerRadius: DRXRadius.control)
                )
                .overlay {
                    RoundedRectangle(cornerRadius: DRXRadius.control)
                        .stroke(isPrimary ? Color.clear : DRXPalette.border, lineWidth: 1)
                }
        }
            .buttonStyle(DRXQuietButtonStyle())
            .disabled(isDisabled)
            .opacity(isDisabled ? 0.48 : 1)
            .accessibilityIdentifier(identifier)
            .contentTransition(.identity)
    }
    private func prompt(_ title: String, _ body: String) -> some View { VStack(alignment: .leading, spacing: 10) { Text(title).font(.largeTitle.bold()); Text(body).foregroundStyle(DRXPalette.muted) } }
    private func choice(_ title: String, selected: Bool, action: @escaping () -> Void) -> some View { Button(action: action) { HStack { Text(title).foregroundStyle(DRXPalette.ink); Spacer(); Image(systemName: selected ? "checkmark.circle.fill" : "circle").accessibilityHidden(true) }.padding().frame(minHeight: 56).background(DRXPalette.card, in: RoundedRectangle(cornerRadius: 14)).overlay { RoundedRectangle(cornerRadius: 14).stroke(selected ? DRXPalette.accent : DRXPalette.border) } }.accessibilityAddTraits(selected ? .isSelected : []) }
    private var review: some View { VStack(alignment: .leading, spacing: 14) { prompt("Review your setup", "Everything here can be changed later in Business Settings."); summary("Owner", model.draft.ownerName, .ownerProfile); summary(DRXContent.Terms.business, model.draft.businessName, .businessName); summary(DRXContent.Terms.location, model.draft.locationName, .location); summary("Tax", model.draft.taxChoice == .yes ? "Enabled at \(model.draft.taxRate)%" : "Not enabled", .taxDecision); summary(DRXContent.Terms.stock, model.draft.tracksInventory == true ? "Tracking enabled" : "Not enabled", model.draft.businessType?.tracksProducts == false ? .businessType : .inventoryDecision); summary(DRXContent.Navigation.team, model.draft.inviteTeam == true ? model.draft.invitedUserEmail : "Just me for now", .teamDecision) } }
    private func summary(_ title: String, _ value: String, _ step: OnboardingStep) -> some View { HStack { VStack(alignment: .leading) { Text(title).font(.caption).foregroundStyle(DRXPalette.muted); Text(value) }; Spacer(); Button("Edit") { navigationDirection = .backward; withAnimation(stepAnimation) { model.edit(step) } } }.padding().background(DRXPalette.card, in: RoundedRectangle(cornerRadius: 12)) }
    private var workspaceReady: some View { VStack(alignment: .leading, spacing: 16) { Text("Setup complete").font(.caption.bold()).foregroundStyle(DRXPalette.accent); prompt("Your DRX business is ready", "Here’s what we created. You can change these settings whenever you need to."); summaryValue(DRXContent.Terms.business, model.draft.businessName); summaryValue("Owner", "\(model.draft.ownerName) · Owner"); summaryValue(DRXContent.Terms.location, model.draft.locationName); summaryValue("Tax", model.draft.taxChoice == .yes ? "Enabled at \(model.draft.taxRate)%" : "Not enabled"); summaryValue(DRXContent.Terms.stock, model.draft.tracksInventory == true ? "Tracking enabled" : "Not enabled"); Text("Selling by weight or partial units? Choose those options when you add the product.").foregroundStyle(DRXPalette.muted); Text("What would you like to do first?").font(.title3.bold()) } }
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

    private func switchAccount() {
        Task {
            do {
                await PushNotificationCoordinator.shared.unregister()
                try await clerk.auth.signOut()
                model.clear()
                await environment.clerkSignedOut()
            } catch {
                accountError = "We couldn't switch accounts. Check your connection and try again."
            }
        }
    }
}

private extension String { var nilIfEmpty: String? { let value = trimmingCharacters(in: .whitespacesAndNewlines); return value.isEmpty ? nil : value } }
