import Foundation
import Observation

@MainActor
@Observable
final class AppEnvironment {
    let apiClient: APIClient
    let session: SessionStore

    init(apiClient: APIClient, session: SessionStore) {
        self.apiClient = apiClient
        self.session = session
    }

    static func live() -> AppEnvironment {
        if ProcessInfo.processInfo.arguments.contains("--ui-testing") {
            return preview()
        }

        let baseURL = URL(string: "https://app.deelrx.com")!
        let tokenStore = KeychainTokenStore(service: "com.wrelik.drx")
        let apiClient = URLSessionAPIClient(baseURL: baseURL, tokenStore: tokenStore)
        let session = SessionStore(apiClient: apiClient, tokenStore: tokenStore)
        return AppEnvironment(apiClient: apiClient, session: session)
    }

    static func preview() -> AppEnvironment {
        let tokenStore = InMemoryTokenStore()
        let apiClient = MockAPIClient()
        let session = SessionStore(apiClient: apiClient, tokenStore: tokenStore)
        return AppEnvironment(apiClient: apiClient, session: session)
    }
}
