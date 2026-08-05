import SwiftUI
import ClerkKit

@main
struct DRXApp: App {
    private let configuration: AppConfiguration?
    private let configurationError: String?
    @State private var environment: AppEnvironment?

    init() {
        do {
            let configuration = try AppConfiguration.live()
            Clerk.configure(publishableKey: configuration.clerkPublishableKey)
            self.configuration = configuration
            self.configurationError = nil
            _environment = State(initialValue: AppEnvironment.live(configuration: configuration))
        } catch {
            self.configuration = nil
            self.configurationError = error.localizedDescription
            _environment = State(initialValue: nil)
        }
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if configuration != nil, let environment {
                    AppRootView(environment: environment)
                        .environment(Clerk.shared)
                        .onOpenURL { url in
                            Task { try? await Clerk.shared.handle(url) }
                        }
                } else {
                    ConfigurationErrorView(
                        message: configurationError ?? "DRX could not load its app configuration."
                    )
                }
            }
        }
    }
}

private struct ConfigurationErrorView: View {
    let message: String

    var body: some View {
        ZStack {
            DRXPalette.canvas.ignoresSafeArea()

            ContentUnavailableView {
                Label("Configuration Required", systemImage: "wrench.and.screwdriver.fill")
                    .foregroundStyle(DRXPalette.danger)
            } description: {
                Text(message)
                    .foregroundStyle(DRXPalette.muted)
            }
        }
        .padding()
        .accessibilityIdentifier("configurationErrorView")
    }
}
