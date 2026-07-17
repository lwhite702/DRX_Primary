import Foundation
import Observation

struct OperatorSession: Codable, Sendable, Equatable {
    let operatorID: String
    let displayName: String
    let businessID: String
    let businessName: String
    let roles: [String]
    let permissions: [String]
    let email: String?
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
        errorMessage = nil
        defer { isRestoring = false }

        do {
            guard try await tokenStore.readToken() != nil else {
                errorMessage = "Clerk did not provide an active session token."
                return
            }
            let restored: OperatorSession = try await apiClient.send(APIRequest(path: "/api/mobile/v1/session"))
            operatorSession = restored
        } catch APIError.unauthorized {
            operatorSession = nil
            errorMessage = "Your Clerk session could not be verified. Sign out, then sign in again."
        } catch APIError.forbidden(let message) {
            operatorSession = nil
            errorMessage = message
        } catch {
            operatorSession = nil
            errorMessage = error.localizedDescription
        }
    }

    func reset() {
        operatorSession = nil
        errorMessage = nil
        isRestoring = false
    }

    func signOut() async {
        reset()
    }
}
