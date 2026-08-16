import SwiftUI
import ClerkKit
import ClerkKitUI

struct AppRootView: View {
    @State private var environment: AppEnvironment
    @State private var identifiedUserID: String?
    @Environment(Clerk.self) private var clerk
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    init(environment: AppEnvironment) {
        _environment = State(initialValue: environment)
    }

    var body: some View {
        Group {
            switch environment.rootState {
            case .initializing, .checkingProvisioning, .loadingWorkspace:
                SessionBootstrapView()
            case .signedOut:
                VStack(spacing: 0) {
                    Image("DRXWordmark")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 176, height: 88)
                        .accessibilityLabel("Deelrx CRM")
                        .padding(.top, DRXSpacing.xl)

                    VStack(spacing: DRXSpacing.sm) {
                        Text("Sign in or create an account")
                            .font(.title2.bold())
                            .foregroundStyle(DRXPalette.ink)
                        Text("Your account keeps each business workspace private and separate.")
                            .font(.subheadline)
                            .foregroundStyle(DRXPalette.muted)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.horizontal, DRXSpacing.xl)

                    AuthView(isDismissible: false)
                        .environment(\.clerkTheme, .drx)
                        .accessibilityIdentifier("clerkAuthView")
                }
                .background(DRXPalette.canvas.ignoresSafeArea())
                .onAppear { environment.telemetry.screen("Sign In") }
            case .needsOnboarding:
                if clerk.user != nil { NativeOnboardingView() } else { AuthView(isDismissible: false) }
            case .ready:
                if clerk.user != nil { OperatorTabView() } else { AuthView(isDismissible: false) }
            case .recoverableError:
                ProvisioningRecoveryView()
            }
        }
        .id(environment.rootState)
        .transition(
            reduceMotion
                ? .opacity
                : .opacity.combined(with: .scale(scale: 0.985))
        )
        .animation(.easeInOut(duration: reduceMotion ? 0.16 : 0.3), value: environment.rootState)
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
                Image("DRXWordmark")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 184, height: 96)
                    .accessibilityLabel("Deelrx CRM")

                VStack(spacing: 8) {
                    Text("Opening Deelrx CRM")
                        .font(.title2.bold())
                        .foregroundStyle(DRXPalette.ink)

                    Text("Confirming your operator access")
                        .font(.subheadline)
                        .foregroundStyle(DRXPalette.muted)
                }

                ProgressView("Loading your workspace…")
                        .tint(DRXPalette.accent)
                        .foregroundStyle(DRXPalette.muted)
                        .accessibilityIdentifier("sessionLoadingIndicator")
            }
            .padding(32)
            .frame(maxWidth: 440)
            .background(DRXPalette.card, in: RoundedRectangle(cornerRadius: DRXRadius.panel))
            .overlay {
                RoundedRectangle(cornerRadius: DRXRadius.panel)
                    .stroke(DRXPalette.border, lineWidth: 1)
            }
            .shadow(color: .black.opacity(0.35), radius: 24, y: 12)
            .padding(24)
        }
        .onAppear { environment.telemetry.screen("Session Bootstrap") }
    }
}

private struct ProvisioningRecoveryView: View {
    @Environment(AppEnvironment.self) private var environment
    @Environment(Clerk.self) private var clerk
    @State private var signOutError: String?

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
                Task {
                    do {
                        try await clerk.auth.signOut()
                        await environment.clerkSignedOut()
                    } catch {
                        signOutError = "We couldn't sign you out. Check your connection and try again."
                    }
                }
            }
            if let requestID = environment.supportRequestID {
                ShareLink(item: requestID) { Label("Copy Support Details", systemImage: "doc.on.doc") }
                    .accessibilityIdentifier("supportDetailsButton")
            }
        }
        .padding(32)
        .alert("Sign Out Failed", isPresented: .init(
            get: { signOutError != nil },
            set: { if !$0 { signOutError = nil } }
        )) {
            Button("OK", role: .cancel) { signOutError = nil }
        } message: {
            Text(signOutError ?? "")
        }
    }
}

private struct OperatorTabView: View {
    @Environment(AppEnvironment.self) private var environment
    @Environment(Clerk.self) private var clerk
    @State private var selection: WorkspaceTab = .dashboard
    @State private var signOutError: String?

    var body: some View {
        TabView(selection: $selection) {
            NavigationStack {
                DashboardView()
            }
                .tabItem { Label("Dashboard", systemImage: "gauge.with.dots.needle.67percent") }
                .tag(WorkspaceTab.dashboard)

            NavigationStack {
                POSView()
            }
                .tabItem { Label("POS", systemImage: "cart.fill") }
                .tag(WorkspaceTab.pos)

            NavigationStack {
                InventoryView()
            }
                .tabItem { Label("Inventory", systemImage: "shippingbox.fill") }
                .tag(WorkspaceTab.inventory)

            NavigationStack {
                CustomersView()
            }
                .tabItem { Label("Customers", systemImage: "person.2.fill") }
                .tag(WorkspaceTab.customers)

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
                                do {
                                    try await clerk.auth.signOut()
                                    await environment.signOut()
                                } catch {
                                    signOutError = "We couldn't sign you out. Check your connection and try again."
                                }
                            }
                        }
                        .accessibilityIdentifier("signOutButton")
                    }

                    Section("Help & Legal") {
                        NavigationLink {
                            AccountAndLegalView()
                        } label: {
                            Label("Help, Legal & Account", systemImage: "person.crop.circle.badge.questionmark")
                        }
                        .accessibilityIdentifier("helpLegalAccountButton")
                    }
                }
                .scrollContentBackground(.hidden)
                .background(DRXPalette.canvas)
                .navigationTitle("More")
            }
            .tabItem { Label("More", systemImage: "ellipsis.circle.fill") }
            .tag(WorkspaceTab.more)
            .onAppear { environment.telemetry.screen("More") }
        }
        .tint(DRXPalette.accent)
        .toolbarBackground(DRXPalette.surface, for: .tabBar)
        .toolbarBackground(.visible, for: .tabBar)
        .toolbarColorScheme(.dark, for: .tabBar)
        .onAppear { selection = environment.nextWorkspaceTab }
        .alert("Sign Out Failed", isPresented: .init(
            get: { signOutError != nil },
            set: { if !$0 { signOutError = nil } }
        )) {
            Button("OK", role: .cancel) { signOutError = nil }
        } message: {
            Text(signOutError ?? "")
        }
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
