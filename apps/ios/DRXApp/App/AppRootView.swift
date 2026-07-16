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

            Button("Continue to Sign In") {
                Task { await environment.session.beginSignIn() }
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .accessibilityIdentifier("signInButton")
        }
        .padding(32)
    }
}

private struct OperatorTabView: View {
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

            NavigationStack { PlaceholderView(title: "More", symbol: "ellipsis.circle.fill") }
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
