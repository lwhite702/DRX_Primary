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

@MainActor
struct CreditAttemptControllerTests {
    @Test
    func restoresAnUncertainPaymentAndRetriesItsExactPayload() async throws {
        let store = InMemoryTokenStore()
        var sent: [PendingCreditAttempt] = []
        let first = CreditAttemptController(identity: { "synthetic-operator" }, storage: { _ in store }, send: { attempt in
            sent.append(attempt)
            throw URLError(.networkConnectionLost)
        }, resolve: { _ in false }, deploymentScope: "https://synthetic.convex.cloud")
        await first.prepare(customerId: "synthetic-customer", kind: .payment)
        #expect(await first.submit(customerId: "synthetic-customer", kind: .payment, amountCents: 1200) == false)
        #expect(try await store.readToken() != nil)
        let reopened = CreditAttemptController(identity: { "synthetic-operator" }, storage: { _ in store }, send: { sent.append($0) }, resolve: { _ in false }, deploymentScope: "https://synthetic.convex.cloud")
        await reopened.prepare(customerId: "synthetic-customer", kind: .payment)
        #expect(reopened.pending?.amountCents == 1200)
        #expect(await reopened.submit(customerId: "synthetic-customer", kind: .payment, amountCents: 9900))
        #expect(sent.count == 2)
        #expect(sent.first == sent.last)
        #expect(try await store.readToken() == nil)
    }

    @Test
    func preservesPendingRequestUntilRecoverySucceedsAndRejectsIdentityChange() async throws {
        let store = InMemoryTokenStore()
        var identity: String? = "synthetic-operator"
        var resolverCalls = 0
        let controller = CreditAttemptController(identity: { identity }, storage: { _ in store }, send: { _ in throw URLError(.timedOut) }, resolve: { _ in resolverCalls += 1; return false }, deploymentScope: "https://synthetic.convex.cloud")
        await controller.prepare(customerId: "synthetic-customer", kind: .issue)
        #expect(await controller.submit(customerId: "synthetic-customer", kind: .issue, amountCents: 100) == false)
        identity = "another-operator"
        #expect(await controller.checkPending() == false)
        #expect(resolverCalls == 0)
        #expect(controller.pending != nil)
        identity = "synthetic-operator"
        #expect(await controller.checkPending() == false)
        #expect(resolverCalls == 1)
        #expect(controller.pending == nil)
        #expect(try await store.readToken() == nil)
    }
}
