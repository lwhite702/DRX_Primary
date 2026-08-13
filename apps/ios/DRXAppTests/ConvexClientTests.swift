import Foundation
import Testing
@testable import DRXApp

struct ConvexClientTests {
    @Test
    func readsConvexAudienceFromIntegratedSessionToken() throws {
        let token = try token(payload: ["aud": "convex"])

        #expect(ConvexClient.tokenAudiences(token) == ["convex"])
    }

    @Test
    func readsAudienceArrayAndRejectsMalformedTokens() throws {
        let token = try token(payload: ["aud": ["other-service", "convex"]])

        #expect(ConvexClient.tokenAudiences(token) == ["other-service", "convex"])
        #expect(ConvexClient.tokenAudiences("not-a-jwt").isEmpty)
    }

    private func token(payload: [String: Any]) throws -> String {
        let data = try JSONSerialization.data(withJSONObject: payload)
        let encoded = data.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
        return "header.\(encoded).signature"
    }
}
