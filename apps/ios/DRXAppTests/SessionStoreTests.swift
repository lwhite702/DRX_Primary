import Testing
@testable import DRXApp

@MainActor
struct SessionStoreTests {
    @Test
    func startsSignedOutWithoutStoredToken() async {
        let tokenStore = InMemoryTokenStore()
        let store = SessionStore(apiClient: MockAPIClient(), tokenStore: tokenStore)

        await store.restore()

        #expect(store.isAuthenticated == false)
        #expect(store.operatorSession == nil)
    }

    @Test
    func completedSignInPersistsSession() async throws {
        let tokenStore = InMemoryTokenStore()
        let store = SessionStore(apiClient: MockAPIClient(), tokenStore: tokenStore)
        let session = OperatorSession(
            operatorID: "operator-1",
            displayName: "Test Operator",
            businessID: "business-1",
            businessName: "DRX Test",
            roles: ["operator"],
            permissions: ["pos:checkout"]
        )

        try await store.completeSignIn(token: "test-token", session: session)

        #expect(store.operatorSession == session)
        #expect(try await tokenStore.readToken() == "test-token")
    }
}
