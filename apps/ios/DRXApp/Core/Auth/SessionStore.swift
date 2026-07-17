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
        errorMessage = nil
        defer { isRestoring = false }

        do {
            guard try await tokenStore.readToken() != nil else {
                errorMessage = "Clerk did not provide an active session token."
                return
            }
            operatorSession = try await apiClient.send(APIRequest(path: "/api/mobile/v1/session"))
        } catch APIError.unauthorized {
            operatorSession = nil
            errorMessage = "DRX could not authorize this Clerk session. Confirm the mobile session endpoint validates Clerk tokens."
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
