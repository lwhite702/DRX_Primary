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
            if clerk.user == nil {
                AuthView(isDismissible: false)
                    .environment(\.clerkTheme, .drx)
                    .accessibilityIdentifier("clerkAuthView")
                    .onAppear { environment.telemetry.screen("Sign In") }
            } else if environment.session.isAuthenticated {
                OperatorTabView()
            } else {
                SessionBootstrapView()
            }
        }
        .tint(DRXPalette.accent)
        .environment(environment)
        .task(id: clerk.user?.id) {
            guard let userID = clerk.user?.id else {
                await environment.signOut()
                identifiedUserID = nil
                return
            }
            if let identifiedUserID, identifiedUserID != userID {
                await environment.signOut()
            }
            identifiedUserID = userID
            await environment.restoreSession()
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

                if environment.session.isRestoring {
                    ProgressView("Loading your workspace…")
                        .tint(DRXPalette.ink)
                        .foregroundStyle(DRXPalette.muted)
                        .accessibilityIdentifier("sessionLoadingIndicator")
                } else if let errorMessage = environment.session.errorMessage {
                    Label(errorMessage, systemImage: "exclamationmark.triangle.fill")
                        .font(.footnote)
                        .foregroundStyle(DRXPalette.danger)
                        .multilineTextAlignment(.center)
                        .accessibilityIdentifier("sessionErrorMessage")

                    Button("Try Again") {
                        Task { await environment.restoreSession() }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(DRXPalette.accent)
                    .foregroundStyle(DRXPalette.onAccent)
                    .accessibilityIdentifier("retrySessionButton")

                    Button("Sign Out", role: .destructive) {
                        Task {
                            try? await clerk.auth.signOut()
                            await environment.signOut()
                        }
                    }
                    .accessibilityIdentifier("bootstrapSignOutButton")
                }
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

private struct OperatorTabView: View {
    @Environment(AppEnvironment.self) private var environment
    @Environment(Clerk.self) private var clerk

    var body: some View {
        TabView {
            NavigationStack {
                PlaceholderView(title: "Dashboard", symbol: "gauge.with.dots.needle.67percent")
            }
                .tabItem { Label("Dashboard", systemImage: "gauge.with.dots.needle.67percent") }

            NavigationStack {
                PlaceholderView(title: "POS", symbol: "cart.fill")
            }
                .tabItem { Label("POS", systemImage: "cart.fill") }

            NavigationStack {
                PlaceholderView(title: "Inventory", symbol: "shippingbox.fill")
            }
                .tabItem { Label("Inventory", systemImage: "shippingbox.fill") }

            NavigationStack { PlaceholderView(title: "Customers", symbol: "person.2.fill") }
                .tabItem { Label("Customers", systemImage: "person.2.fill") }

            NavigationStack {
                List {
                    Section("Modules") {
                        moduleLink("Credit", symbol: "creditcard.fill")
                        moduleLink("Reports", symbol: "chart.bar.doc.horizontal.fill")
                        moduleLink("Workspaces", symbol: "building.2.fill")
                        moduleLink("AI Intelligence", symbol: "sparkles")
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
            PlaceholderView(title: title, symbol: symbol)
        } label: {
            Label(title, systemImage: symbol)
        }
        .accessibilityIdentifier("module_\(title.lowercased().replacingOccurrences(of: " ", with: "_"))")
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
