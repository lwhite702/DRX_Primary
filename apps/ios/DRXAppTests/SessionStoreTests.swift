import Testing
@testable import DRXApp

@MainActor
struct SessionStoreTests {
    @Test
    func startsSignedOutWithoutClerkToken() async {
        let tokenStore = InMemoryTokenStore()
        let store = SessionStore(apiClient: MockAPIClient(), tokenStore: tokenStore)

        await store.restore()

        #expect(store.isAuthenticated == false)
        #expect(store.operatorSession == nil)
        #expect(store.errorMessage == "Clerk did not provide an active session token.")
    }

    @Test
    func resetClearsTransientSessionState() async {
        let tokenStore = InMemoryTokenStore()
        let store = SessionStore(apiClient: MockAPIClient(), tokenStore: tokenStore)

        await store.restore()
        store.reset()

        #expect(store.isAuthenticated == false)
        #expect(store.operatorSession == nil)
        #expect(store.errorMessage == nil)
        #expect(store.isRestoring == false)
    }
}
