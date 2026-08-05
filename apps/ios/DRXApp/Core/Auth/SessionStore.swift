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

    var isAuthenticated: Bool { operatorSession != nil }

    func restore(_ operatorSession: OperatorSession) {
        self.operatorSession = operatorSession
    }

    func reset() {
        operatorSession = nil
    }
}
