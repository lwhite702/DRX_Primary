import SwiftUI
import ClerkKit
import ClerkKitUI

struct AppRootView: View {
    @State private var environment: AppEnvironment
    @State private var identifiedUserID: String?
    @Environment(Clerk.self) private var clerk

    init(environment: AppEnvironment) {
        _environment = State(initialValue: environment)
    }

    var body: some View {
        Group {
            switch environment.rootState {
            case .initializing, .checkingProvisioning, .loadingWorkspace:
                SessionBootstrapView()
            case .signedOut:
                AuthView(isDismissible: false)
                    .environment(\.clerkTheme, .drx)
                    .accessibilityIdentifier("clerkAuthView")
                    .onAppear { environment.telemetry.screen("Sign In") }
            case .needsOnboarding:
                NativeOnboardingView()
            case .ready:
                OperatorTabView()
            case .recoverableError:
                ProvisioningRecoveryView()
            }
        }
        .tint(DRXPalette.accent)
        .environment(environment)
        .task(id: clerk.user?.id) {
            guard let userID = clerk.user?.id else {
                await environment.clerkSignedOut()
                identifiedUserID = nil
                return
            }
            if let identifiedUserID, identifiedUserID != userID {
                await environment.signOut()
            }
            identifiedUserID = userID
            await environment.checkProvisioning()
        }
    }
}

private struct SessionBootstrapView: View {
    @Environment(AppEnvironment.self) private var environment
    @Environment(Clerk.self) private var clerk

    var body: some View {
        ZStack {
            DRXPalette.canvas.ignoresSafeArea()

            VStack(spacing: 24) {
                Image(systemName: "shippingbox.fill")
                    .font(.system(size: 34, weight: .bold))
                    .foregroundStyle(DRXPalette.accent)
                    .frame(width: 72, height: 72)
                    .background(DRXPalette.surface, in: RoundedRectangle(cornerRadius: 20))
                    .accessibilityHidden(true)

                VStack(spacing: 8) {
                    Text("Opening Deelrx CRM")
                        .font(.title2.bold())
                        .foregroundStyle(DRXPalette.ink)

                    Text("Confirming your operator access")
                        .font(.subheadline)
                        .foregroundStyle(DRXPalette.muted)
                }

                ProgressView("Loading your workspace…")
                        .tint(DRXPalette.ink)
                        .foregroundStyle(DRXPalette.muted)
                        .accessibilityIdentifier("sessionLoadingIndicator")
            }
            .padding(32)
            .frame(maxWidth: 440)
            .background(DRXPalette.card, in: RoundedRectangle(cornerRadius: 24))
            .overlay {
                RoundedRectangle(cornerRadius: 24)
                    .stroke(DRXPalette.border, lineWidth: 1)
            }
            .shadow(color: DRXPalette.ink.opacity(0.08), radius: 24, y: 12)
            .padding(24)
        }
        .onAppear { environment.telemetry.screen("Session Bootstrap") }
    }
}

private struct NativeOnboardingView: View {
    @Environment(AppEnvironment.self) private var environment
    @State private var ownerName = ""
    @State private var businessName = ""
    @State private var businessType = "Retail POS"
    @State private var timezone = TimeZone.current.identifier
    @State private var currency = "USD"
    @State private var collectTax = true
    @State private var taxRate = "8.25"

    private var isValid: Bool {
        !ownerName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !businessName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        (!collectTax || (parseTaxRate(taxRate).map { (0...100).contains($0) } ?? false))
    }

    private func parseTaxRate(_ input: String) -> Double? {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.locale = Locale.current
        return formatter.number(from: input)?.doubleValue
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    GroupBox("Owner") {
                        TextField("Owner name", text: $ownerName)
                            .textContentType(.name)
                            .textFieldStyle(.roundedBorder)
                    }

                    GroupBox("Business") {
                        VStack(alignment: .leading, spacing: 12) {
                            TextField("Business name", text: $businessName)
                                .textFieldStyle(.roundedBorder)
                            Picker("Business type", selection: $businessType) {
                                ForEach(["Retail POS", "Wholesale", "Services", "Other"], id: \.self) { Text($0) }
                            }
                            TextField("Timezone", text: $timezone)
                                .textInputAutocapitalization(.never)
                                .textFieldStyle(.roundedBorder)
                            Picker("Currency", selection: $currency) {
                                ForEach(["USD", "CAD", "GBP", "EUR"], id: \.self) { Text($0) }
                            }
                        }
                    }

                    GroupBox("Tax") {
                        VStack(alignment: .leading, spacing: 12) {
                            Toggle("Collect tax", isOn: $collectTax)
                            if collectTax {
                                TextField("Tax rate (%)", text: $taxRate)
                                    .keyboardType(.decimalPad)
                                    .textFieldStyle(.roundedBorder)
                            }
                        }
                    }

                    Button(environment.isSubmittingOnboarding ? "Creating business…" : "Create Business") {
                        Task {
                            let rate = Int(((parseTaxRate(taxRate) ?? 0) * 100).rounded())
                            _ = await environment.completeOnboarding(.init(
                                name: ownerName.trimmingCharacters(in: .whitespacesAndNewlines),
                                businessName: businessName.trimmingCharacters(in: .whitespacesAndNewlines),
                                businessType: businessType, currency: currency, timezone: timezone,
                                collectTax: collectTax, taxRateBps: collectTax ? rate : 0
                            ))
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .frame(maxWidth: .infinity)
                    .disabled(!isValid || environment.isSubmittingOnboarding)
                    .accessibilityIdentifier("submitOnboardingButton")
                }
                .padding(20)
            }
            .navigationTitle("Set Up Your Business")
            .onAppear { environment.telemetry.screen("Business Onboarding") }
        }
    }
}

private struct ProvisioningRecoveryView: View {
    @Environment(AppEnvironment.self) private var environment
    @Environment(Clerk.self) private var clerk

    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: "exclamationmark.triangle.fill").font(.largeTitle).foregroundStyle(DRXPalette.danger)
            Text("Workspace Unavailable").font(.title2.bold())
            Text(environment.provisioningMessage ?? "We couldn't open your workspace.")
                .multilineTextAlignment(.center).foregroundStyle(DRXPalette.muted)
                .accessibilityIdentifier("provisioningErrorMessage")
            Button("Retry") { Task { await environment.checkProvisioning() } }
                .buttonStyle(.borderedProminent).accessibilityIdentifier("retryProvisioningButton")
            Button("Sign Out", role: .destructive) {
                Task { try? await clerk.auth.signOut(); await environment.clerkSignedOut() }
            }
            if let requestID = environment.supportRequestID {
                ShareLink(item: requestID) { Label("Copy Support Details", systemImage: "doc.on.doc") }
                    .accessibilityIdentifier("supportDetailsButton")
            }
        }
        .padding(32)
    }
}

private struct OperatorTabView: View {
    @Environment(AppEnvironment.self) private var environment
    @Environment(Clerk.self) private var clerk

    var body: some View {
        TabView {
            NavigationStack {
                DashboardView()
            }
                .tabItem { Label("Dashboard", systemImage: "gauge.with.dots.needle.67percent") }

            NavigationStack {
                POSView()
            }
                .tabItem { Label("POS", systemImage: "cart.fill") }

            NavigationStack {
                InventoryView()
            }
                .tabItem { Label("Inventory", systemImage: "shippingbox.fill") }

            NavigationStack {
                CustomersView()
            }
                .tabItem { Label("Customers", systemImage: "person.2.fill") }

            NavigationStack {
                List {
                    Section("Modules") {
                        NavigationLink {
                            CreditView()
                        } label: {
                            Label("Credit", systemImage: "creditcard.fill")
                        }
                        .accessibilityIdentifier("module_credit")

                        NavigationLink {
                            ReportsView()
                        } label: {
                            Label("Reports", systemImage: "chart.bar.doc.horizontal.fill")
                        }
                        .accessibilityIdentifier("module_reports")

                        NavigationLink {
                            WorkspacesView()
                        } label: {
                            Label("Workspaces", systemImage: "building.2.fill")
                        }
                        .accessibilityIdentifier("module_workspaces")

                        NavigationLink {
                            AIIntelligenceView()
                        } label: {
                            Label("AI Intelligence", systemImage: "sparkles")
                        }
                        .accessibilityIdentifier("module_ai_intelligence")
                    }

                    Section("Session") {
                        if let session = environment.session.operatorSession {
                            LabeledContent("Operator", value: session.displayName)
                            LabeledContent("Business", value: session.businessName)
                        }

                        Button("Sign Out", role: .destructive) {
                            Task {
                                try? await clerk.auth.signOut()
                                await environment.signOut()
                            }
                        }
                        .accessibilityIdentifier("signOutButton")
                    }
                }
                .scrollContentBackground(.hidden)
                .background(DRXPalette.canvas)
                .navigationTitle("More")
            }
            .tabItem { Label("More", systemImage: "ellipsis.circle.fill") }
            .onAppear { environment.telemetry.screen("More") }
        }
        .tint(DRXPalette.accent)
        .toolbarBackground(DRXPalette.surface, for: .tabBar)
        .toolbarBackground(.visible, for: .tabBar)
        .toolbarColorScheme(.dark, for: .tabBar)
    }

    private func moduleLink(_ title: String, symbol: String) -> some View {
        NavigationLink {
            AuthenticatedWebView(path: path(for: title), title: title)
        } label: {
            Label(title, systemImage: symbol)
        }
        .accessibilityIdentifier("module_\(title.lowercased().replacingOccurrences(of: " ", with: "_"))")
    }

    private func path(for title: String) -> String {
        switch title {
        case "Dashboard": return "dashboard"
        case "POS": return "pos"
        case "Inventory": return "inventory"
        case "Customers": return "customers"
        case "Credit": return "credit"
        case "Reports": return "reports"
        case "Workspaces": return "workspaces"
        case "AI Intelligence": return "ai-intelligence"
        default: return "dashboard"
        }
    }
}

private struct PlaceholderView: View {
    let title: String
    let symbol: String
    @Environment(AppEnvironment.self) private var environment

    var body: some View {
        ZStack {
            DRXPalette.canvas.ignoresSafeArea()

            VStack(spacing: 18) {
                Image(systemName: symbol)
                    .font(.system(size: 30, weight: .semibold))
                    .foregroundStyle(DRXPalette.accent)
                    .frame(width: 68, height: 68)
                    .background(DRXPalette.surface, in: RoundedRectangle(cornerRadius: 18))

                Text(title)
                    .font(.title2.bold())
                    .foregroundStyle(DRXPalette.ink)

                Text("Native feature wiring is in progress.")
                    .font(.subheadline)
                    .foregroundStyle(DRXPalette.muted)
            }
            .padding(32)
            .frame(maxWidth: 360)
            .background(DRXPalette.card, in: RoundedRectangle(cornerRadius: 24))
            .overlay {
                RoundedRectangle(cornerRadius: 24)
                    .stroke(DRXPalette.border, lineWidth: 1)
            }
        }
        .navigationTitle(title)
        .onAppear { environment.telemetry.screen(title) }
    }
}

#Preview("Signed Out") {
    AppRootView(environment: .preview())
        .environment(Clerk.preview { preview in
            preview.isSignedIn = false
        })
}

#Preview("Signed In") {
    AppRootView(environment: .preview())
        .environment(Clerk.preview())
}
