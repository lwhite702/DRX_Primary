import SwiftUI
import ClerkKit
import ClerkKitUI

struct AppRootView: View {
    @State private var environment: AppEnvironment
    @Environment(Clerk.self) private var clerk

    init(environment: AppEnvironment) {
        _environment = State(initialValue: environment)
    }

    var body: some View {
        Group {
            if clerk.user == nil {
                AuthView(isDismissible: false)
                    .accessibilityIdentifier("clerkAuthView")
            } else if environment.session.isAuthenticated {
                OperatorTabView()
            } else {
                SessionBootstrapView()
            }
        }
        .environment(environment)
        .task(id: clerk.user?.id) {
            guard clerk.user != nil else {
                environment.session.reset()
                return
            }
            await environment.session.restore()
        }
    }
}

private struct SessionBootstrapView: View {
    @Environment(AppEnvironment.self) private var environment

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "shippingbox.fill")
                .font(.system(size: 52))
                .accessibilityHidden(true)

            Text("Opening DRX")
                .font(.title2.bold())

            if environment.session.isRestoring {
                ProgressView("Loading your operator access…")
                    .accessibilityIdentifier("sessionLoadingIndicator")
            } else if let errorMessage = environment.session.errorMessage {
                Label(errorMessage, systemImage: "exclamationmark.triangle.fill")
                    .font(.footnote)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
                    .accessibilityIdentifier("sessionErrorMessage")

                Button("Try Again") {
                    Task { await environment.session.restore() }
                }
                .buttonStyle(.borderedProminent)
                .accessibilityIdentifier("retrySessionButton")
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
            NavigationStack { PlaceholderView(title: "Dashboard", symbol: "gauge.with.dots.needle.67percent") }
                .tabItem { Label("Dashboard", systemImage: "gauge.with.dots.needle.67percent") }

            NavigationStack { PlaceholderView(title: "POS", symbol: "cart.fill") }
                .tabItem { Label("POS", systemImage: "cart.fill") }

            NavigationStack { PlaceholderView(title: "Inventory", symbol: "shippingbox.fill") }
                .tabItem { Label("Inventory", systemImage: "shippingbox.fill") }

            NavigationStack { PlaceholderView(title: "Customers", symbol: "person.2.fill") }
                .tabItem { Label("Customers", systemImage: "person.2.fill") }

            NavigationStack {
                List {
                    Section("Session") {
                        if let session = environment.session.operatorSession {
                            LabeledContent("Operator", value: session.displayName)
                            LabeledContent("Business", value: session.businessName)
                        }

                        Button("Sign Out", role: .destructive) {
                            Task {
                                try? await clerk.auth.signOut()
                                await environment.session.signOut()
                            }
                        }
                        .accessibilityIdentifier("signOutButton")
                    }
                }
                .navigationTitle("More")
            }
            .tabItem { Label("More", systemImage: "ellipsis.circle.fill") }
        }
    }
}

private struct PlaceholderView: View {
    let title: String
    let symbol: String

    var body: some View {
        ContentUnavailableView(title, systemImage: symbol, description: Text("Native feature wiring is in progress."))
            .navigationTitle(title)
    }
}

#Preview("Signed Out") {
    AppRootView(environment: .preview())
        .environment(Clerk.preview { preview in
            preview.isSignedIn = false
        })
}
