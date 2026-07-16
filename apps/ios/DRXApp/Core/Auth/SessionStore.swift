import Foundation
import Observation

struct OperatorSession: Codable, Sendable, Equatable {
    let operatorID: String
    let displayName: String
    let businessID: String
    let businessName: String
    let roles: [String]
    let permissions: [String]
}

@MainActor
@Observable
final class SessionStore {
    private(set) var operatorSession: OperatorSession?
    private(set) var isRestoring = false
    private(set) var errorMessage: String?

    private let apiClient: APIClient
    private let tokenStore: any TokenStore

    var isAuthenticated: Bool { operatorSession != nil }

    init(apiClient: APIClient, tokenStore: any TokenStore) {
        self.apiClient = apiClient
        self.tokenStore = tokenStore
    }

    func restore() async {
        guard !isRestoring, operatorSession == nil else { return }
        isRestoring = true
        defer { isRestoring = false }

        do {
            guard try await tokenStore.readToken() != nil else { return }
            operatorSession = try await apiClient.send(APIRequest(path: "/api/mobile/v1/session"))
            errorMessage = nil
        } catch APIError.unauthorized {
            try? await tokenStore.deleteToken()
            operatorSession = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func beginSignIn() async {
        errorMessage = "Native token exchange is pending the mobile authentication contract."
    }

    func completeSignIn(token: String, session: OperatorSession) async throws {
        try await tokenStore.writeToken(token)
        operatorSession = session
        errorMessage = nil
    }

    func signOut() async {
        try? await tokenStore.deleteToken()
        operatorSession = nil
        errorMessage = nil
    }
}
