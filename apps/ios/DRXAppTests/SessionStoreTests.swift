import Foundation
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

    @Test
    func decodesLiveMobileSessionContractWithAcronymIdentifiers() throws {
        let payload = Data(
            #"""
            {
                "operator_id":"user_testflight",
                "display_name":"Test Operator",
                "business_id":"business_live",
                "business_name":"Deelrx Store",
                "roles":["owner"],
                "permissions":["system.manage"],
                "email":"operator@example.com"
            }
            """#.utf8
        )

        let session = try JSONDecoder.drx.decode(OperatorSession.self, from: payload)

        #expect(session.operatorID == "user_testflight")
        #expect(session.businessID == "business_live")
        #expect(session.displayName == "Test Operator")
        #expect(session.email == "operator@example.com")
    }
}
