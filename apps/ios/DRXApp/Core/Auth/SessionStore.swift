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

    private enum CodingKeys: String, CodingKey {
        case operatorID = "operatorId"
        case displayName
        case businessID = "businessId"
        case businessName
        case roles
        case permissions
        case email
    }
}

@MainActor
@Observable
final class SessionStore {
    private(set) var operatorSession: OperatorSession?
    private(set) var isRestoring = false
    private(set) var errorMessage: String?

    private let apiClient: APIClient
    private let tokenStore: any TokenStore
    private var restorationGeneration = 0

    var isAuthenticated: Bool { operatorSession != nil }

    init(apiClient: APIClient, tokenStore: any TokenStore) {
        self.apiClient = apiClient
        self.tokenStore = tokenStore
    }

    func restore() async {
        guard !isRestoring, operatorSession == nil else { return }
        restorationGeneration += 1
        let generation = restorationGeneration
        isRestoring = true
        errorMessage = nil
        defer {
            if generation == restorationGeneration {
                isRestoring = false
            }
        }

        do {
            let token = try await tokenStore.readToken()
            guard generation == restorationGeneration else { return }
            guard token != nil else {
                errorMessage = "Clerk did not provide an active session token."
                return
            }
            let restored: OperatorSession = try await apiClient.send(APIRequest(path: "/api/mobile/v1/session"))
            guard generation == restorationGeneration else { return }
            operatorSession = restored
        } catch APIError.unauthorized {
            guard generation == restorationGeneration else { return }
            operatorSession = nil
            errorMessage = "Your Clerk session could not be verified. Sign out, then sign in again."
        } catch APIError.forbidden(let message) {
            guard generation == restorationGeneration else { return }
            operatorSession = nil
            errorMessage = message
        } catch {
            guard generation == restorationGeneration else { return }
            operatorSession = nil
            errorMessage = error.localizedDescription
        }
    }

    func reset() {
        restorationGeneration += 1
        operatorSession = nil
        errorMessage = nil
        isRestoring = false
    }

    func signOut() async {
        reset()
    }
}
