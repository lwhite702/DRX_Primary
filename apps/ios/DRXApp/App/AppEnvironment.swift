import Foundation
import Observation

@MainActor
@Observable
final class AppEnvironment {
    let apiClient: APIClient
    let session: SessionStore
    let telemetry: TelemetryService

    init(apiClient: APIClient, session: SessionStore, telemetry: TelemetryService) {
        self.apiClient = apiClient
        self.session = session
        self.telemetry = telemetry
    }

    static func live(configuration: AppConfiguration) -> AppEnvironment {
        if ProcessInfo.processInfo.arguments.contains("--ui-testing") {
            return preview()
        }

        let tokenStore = ClerkTokenStore()
        let apiClient = URLSessionAPIClient(baseURL: configuration.apiBaseURL, tokenStore: tokenStore)
        let session = SessionStore(apiClient: apiClient, tokenStore: tokenStore)
        return AppEnvironment(
            apiClient: apiClient,
            session: session,
            telemetry: TelemetryService(configuration: configuration)
        )
    }

    static func preview() -> AppEnvironment {
        let tokenStore = InMemoryTokenStore()
        let apiClient = MockAPIClient()
        let session = SessionStore(apiClient: apiClient, tokenStore: tokenStore)
        let configuration = try! AppConfiguration(info: [
            "DRX_APP_ENVIRONMENT": "development",
            "CLERK_PUBLISHABLE_KEY": "pk_test_preview",
            "DRX_API_BASE_URL": "https://example.test",
        ])
        return AppEnvironment(
            apiClient: apiClient,
            session: session,
            telemetry: TelemetryService(configuration: configuration)
        )
    }

    func restoreSession() async {
        await session.restore()
        guard let operatorSession = session.operatorSession else { return }
        telemetry.identify(operatorSession)
    }

    func signOut() async {
        await session.signOut()
        telemetry.reset()
    }
}
