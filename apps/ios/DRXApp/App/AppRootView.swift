import SwiftUI
import ClerkKit
import ClerkKitUI

struct AppRootView: View {
    @State private var environment: AppEnvironment
    @State private var identifiedUserID: String?
    @State private var authenticationRoute: AuthenticationRoute?
    @State private var minimumSplashDurationElapsed = false
    @State private var hasCompletedInitialSplash = false
    @Environment(Clerk.self) private var clerk
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    init(environment: AppEnvironment) {
        _environment = State(initialValue: environment)
    }

    var body: some View {
        Group {
            if !hasCompletedInitialSplash {
                LaunchSplashView()
            } else {
                switch environment.rootState {
                case .initializing, .checkingProvisioning, .loadingWorkspace:
                    SessionBootstrapView()
                case .signedOut:
                    SignedOutWelcomeView(
                        onCreateAccount: { authenticationRoute = .signUp },
                        onSignIn: { authenticationRoute = .signIn }
                    )
                    .onAppear { environment.telemetry.screen("Welcome") }
                case .needsOnboarding:
                    if clerk.user != nil {
                        NativeOnboardingView()
                    } else {
                        SignedOutWelcomeView(
                            onCreateAccount: { authenticationRoute = .signUp },
                            onSignIn: { authenticationRoute = .signIn }
                        )
                    }
                case .ready:
                    if clerk.user != nil {
                        OperatorTabView(onSwitchUser: { authenticationRoute = .signIn })
                    } else {
                        SignedOutWelcomeView(
                            onCreateAccount: { authenticationRoute = .signUp },
                            onSignIn: { authenticationRoute = .signIn }
                        )
                    }
                case .recoverableError:
                    ProvisioningRecoveryView()
                }
            }
        }
        .id(hasCompletedInitialSplash ? String(describing: environment.rootState) : "launchSplash")
        .transition(
            reduceMotion
                ? .opacity
                : .opacity.combined(with: .scale(scale: 0.985))
        )
        .animation(.easeInOut(duration: reduceMotion ? 0.16 : 0.3), value: environment.rootState)
        .tint(DRXPalette.accent)
        .environment(environment)
        .fullScreenCover(item: $authenticationRoute) { route in
            AuthView(mode: route.mode, isDismissible: true)
                .environment(\.clerkTheme, .drx)
                .background(DRXPalette.canvas.ignoresSafeArea())
                .accessibilityIdentifier(route.accessibilityIdentifier)
        }
        .task {
            guard !ProcessInfo.processInfo.arguments.contains("--ui-testing-hold-splash") else { return }
            try? await Task.sleep(for: .milliseconds(900))
            minimumSplashDurationElapsed = true
            completeInitialSplashIfReady()
        }
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
        .onChange(of: environment.rootState) { _, _ in
            completeInitialSplashIfReady()
        }
        .onChange(of: clerk.user?.id) { _, userID in
            if userID != nil {
                authenticationRoute = nil
            }
        }
    }

    private func completeInitialSplashIfReady() {
        guard minimumSplashDurationElapsed,
              environment.rootState != .initializing,
              environment.rootState != .checkingProvisioning,
              environment.rootState != .loadingWorkspace else { return }
        hasCompletedInitialSplash = true
    }
}

private enum AuthenticationRoute: String, Identifiable {
    case signIn
    case signUp

    var id: String { rawValue }

    var mode: AuthView.Mode {
        switch self {
        case .signIn: .signIn
        case .signUp: .signUp
        }
    }

    var accessibilityIdentifier: String {
        switch self {
        case .signIn: "signInAuthView"
        case .signUp: "signUpAuthView"
        }
    }
}

private struct LaunchSplashView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var isGlowing = false

    private var isHeldForUITesting: Bool {
        ProcessInfo.processInfo.arguments.contains("--ui-testing-hold-splash")
    }

    var body: some View {
        ZStack {
            DRXPalette.canvas.ignoresSafeArea()

            RadialGradient(
                colors: [DRXPalette.accent.opacity(isGlowing ? 0.17 : 0.07), .clear],
                center: .center,
                startRadius: 12,
                endRadius: 240
            )
            .ignoresSafeArea()
            .accessibilityHidden(true)

            Image("DRXWordmark")
                .resizable()
                .scaledToFit()
                .frame(width: 210, height: 132)
                .scaleEffect(reduceMotion || isHeldForUITesting ? 1 : (isGlowing ? 1.025 : 0.985))
                .opacity(reduceMotion || isHeldForUITesting ? 1 : (isGlowing ? 1 : 0.86))
                .shadow(color: DRXPalette.accent.opacity(isGlowing ? 0.78 : 0.28), radius: isGlowing ? 34 : 14)
                .shadow(color: DRXPalette.accent.opacity(isGlowing ? 0.40 : 0.12), radius: isGlowing ? 72 : 30)
                .accessibilityLabel("Deelrx CRM")
        }
        .accessibilityIdentifier("launchSplashView")
        .onAppear {
            guard !reduceMotion, !isHeldForUITesting else {
                isGlowing = true
                return
            }
            withAnimation(.easeInOut(duration: 1.15).repeatForever(autoreverses: true)) {
                isGlowing = true
            }
        }
    }
}

private struct SignedOutWelcomeView: View {
    let onCreateAccount: () -> Void
    let onSignIn: () -> Void

    var body: some View {
        ZStack {
            DRXPalette.canvas.ignoresSafeArea()

            VStack(spacing: DRXSpacing.xxl) {
                Spacer()

                VStack(spacing: DRXSpacing.md) {
                    Text("Your workspace starts here")
                        .font(.largeTitle.bold())
                        .foregroundStyle(DRXPalette.ink)
                        .multilineTextAlignment(.center)
                        .accessibilityIdentifier("signedOutWelcomeTitle")

                    Text("Create an operator account or sign in to continue to your private business workspace.")
                        .font(.body)
                        .foregroundStyle(DRXPalette.muted)
                        .multilineTextAlignment(.center)
                }

                VStack(spacing: DRXSpacing.md) {
                    Button("Create Account", action: onCreateAccount)
                        .buttonStyle(.borderedProminent)
                        .tint(DRXPalette.accent)
                        .foregroundStyle(DRXPalette.onAccent)
                        .controlSize(.large)
                        .accessibilityIdentifier("createAccountButton")

                    Button("Sign In", action: onSignIn)
                        .buttonStyle(.bordered)
                        .tint(DRXPalette.ink)
                        .controlSize(.large)
                        .accessibilityIdentifier("signInButton")
                }
                .frame(maxWidth: 360)

                Spacer()

                Text("Each operator session remains isolated to its authorized workspace.")
                    .font(.footnote)
                    .foregroundStyle(DRXPalette.muted)
                    .multilineTextAlignment(.center)
            }
            .padding(DRXSpacing.xxl)
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
    let onSwitchUser: () -> Void
    @Environment(AppEnvironment.self) private var environment
    @Environment(Clerk.self) private var clerk
    @State private var selection: WorkspaceTab = .dashboard
    @State private var signOutError: String?
    @State private var isSwitchingUser = false

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

                        Button {
                            Task { await switchUser() }
                        } label: {
                            Label("Switch User", systemImage: "person.2.arrow.trianglehead.counterclockwise")
                        }
                        .disabled(isSwitchingUser)
                        .accessibilityIdentifier("switchUserButton")

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

    @MainActor
    private func switchUser() async {
        guard !isSwitchingUser else { return }
        isSwitchingUser = true
        defer { isSwitchingUser = false }

        do {
            try await clerk.auth.signOut()
            UserDefaultsOnboardingDraftStore().clear()
            await environment.signOut()
            onSwitchUser()
        } catch {
            signOutError = "We couldn't switch users. Check your connection and try again."
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
