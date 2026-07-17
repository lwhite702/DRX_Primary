import SwiftUI
import ClerkKit

@main
struct DRXApp: App {
    @State private var environment = AppEnvironment.live()

    init() {
        guard let publishableKey = Bundle.main.object(forInfoDictionaryKey: "CLERK_PUBLISHABLE_KEY") as? String,
              !publishableKey.isEmpty else {
            fatalError("Missing CLERK_PUBLISHABLE_KEY in Info.plist")
        }

        Clerk.configure(publishableKey: publishableKey)
    }

    var body: some Scene {
        WindowGroup {
            AppRootView(environment: environment)
                .environment(Clerk.shared)
                .onOpenURL { url in
                    Task { try? await Clerk.shared.handle(url) }
                }
        }
    }
}
