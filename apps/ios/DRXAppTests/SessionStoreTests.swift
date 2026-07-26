import Foundation
import Testing
@testable import DRXApp

@MainActor
struct SessionStoreTests {
    private struct StubProvisioningClient: ProvisioningClient {
        let result: ProvisioningStatus
        func status() async throws -> ProvisioningStatus { result }
        func createBusiness(_ input: BusinessOnboardingInput) async throws -> BusinessOnboardingResponse {
            BusinessOnboardingResponse(status: "ONBOARDING_SUCCESS")
        }
    }

    private func environment(status: ProvisioningStatus) -> AppEnvironment {
        let tokenStore = InMemoryTokenStore()
        let configuration = try! AppConfiguration(info: [
            "DRX_APP_ENVIRONMENT": "development",
            "CLERK_PUBLISHABLE_KEY": "pk_test_unit",
            "DRX_API_BASE_URL": "https://example.test",
        ])
        return AppEnvironment(
            apiClient: MockAPIClient(),
            session: SessionStore(apiClient: MockAPIClient(), tokenStore: tokenStore),
            telemetry: TelemetryService(configuration: configuration),
            configuration: configuration,
            provisioningClient: StubProvisioningClient(result: status)
        )
    }

    @Test
    func authenticatedNewUserRoutesToOnboardingBeforeDashboard() async {
        let environment = environment(status: .needsBusinessOnboarding)
        await environment.checkProvisioning()
        #expect(environment.rootState == .needsOnboarding)
        #expect(environment.session.isAuthenticated == false)
    }

    @Test
    func inactiveAndMissingBusinessUseControlledRecovery() async {
        let inactive = environment(status: .inactive)
        await inactive.checkProvisioning()
        #expect(inactive.rootState == .recoverableError)
        #expect(inactive.provisioningMessage?.contains("inactive") == true)

        let missing = environment(status: .businessMissing)
        await missing.checkProvisioning()
        #expect(missing.rootState == .recoverableError)
        #expect(missing.provisioningMessage?.contains("clerk") == false)
        #expect(missing.provisioningMessage?.contains("convex/") == false)
    }

    @Test
    func supportDetailsExtractOnlyRequestIdentifier() {
        let error = ConvexError.convexError(message: "UNAUTHORIZED clerk_unsafe at convex/helpers/auth.ts request_id=req_safe_123")
        #expect(AppEnvironment.requestID(from: error) == "req_safe_123")
    }

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
