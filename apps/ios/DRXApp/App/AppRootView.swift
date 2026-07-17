import SwiftUI

struct AppRootView: View {
    @State private var environment: AppEnvironment

    init(environment: AppEnvironment) {
        _environment = State(initialValue: environment)
    }

    var body: some View {
        Group {
            if environment.session.isAuthenticated {
                OperatorTabView()
            } else {
                SignInView()
            }
        }
        .environment(environment)
        .task {
            await environment.session.restore()
        }
    }
}

private struct SignInView: View {
    @Environment(AppEnvironment.self) private var environment

    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "shippingbox.fill")
                .font(.system(size: 56))
                .accessibilityHidden(true)

            VStack(spacing: 8) {
                Text("DRX")
                    .font(.largeTitle.bold())
                Text("Retail operations, without the desktop drag.")
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            Button {
                Task { await environment.session.beginSignIn() }
            } label: {
                HStack(spacing: 10) {
                    if environment.session.isSigningIn {
                        ProgressView()
                            .controlSize(.small)
                    }
                    Text(environment.session.isSigningIn ? "Signing In…" : "Continue to Sign In")
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .disabled(environment.session.isSigningIn)
            .accessibilityIdentifier("signInButton")

            if let errorMessage = environment.session.errorMessage {
                Label(errorMessage, systemImage: "exclamationmark.triangle.fill")
                    .font(.footnote)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
                    .accessibilityIdentifier("signInErrorMessage")
            }

            #if DEBUG
            Text("Debug builds use a local demo session until production authentication is connected.")
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            #endif
        }
        .padding(32)
    }
}

private struct OperatorTabView: View {
    @Environment(AppEnvironment.self) private var environment

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
                            Task { await environment.session.signOut() }
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
}
