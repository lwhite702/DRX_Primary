import Foundation
import Testing
@testable import DRXApp

@MainActor
struct SessionStoreTests {
    @Test
    func parsesOperatorCurrencyInputInCents() {
        #expect(CurrencyInput.cents(from: "5") == 500)
        #expect(CurrencyInput.cents(from: "20.5") == 2_050)
        #expect(CurrencyInput.cents(from: "1.15") == 115)
        #expect(CurrencyInput.cents(from: "NaN") == nil)
        #expect(CurrencyInput.cents(from: "1.234") == nil)
    }

    @Test
    func calculatesTaxInclusiveCheckoutTotals() {
        #expect(CheckoutMath.taxCents(subtotalCents: 1_000, taxRateBps: 825) == 83)
        #expect(CheckoutMath.totalCents(subtotalCents: 1_000, collectTax: true, taxRateBps: 825) == 1_083)
        #expect(CheckoutMath.totalCents(subtotalCents: 1_000, collectTax: false, taxRateBps: 825) == 1_000)
    }

    private struct StubProvisioningClient: ProvisioningClient {
        let response: ProvisioningStatusResponse

        func status() async throws -> ProvisioningStatusResponse { response }

        func createBusiness(_ input: BusinessOnboardingInput) async throws -> BusinessOnboardingResponse {
            BusinessOnboardingResponse(status: "ONBOARDING_SUCCESS")
        }
    }

    private let readySession = OperatorSession(
        operatorID: "user_testflight",
        displayName: "Test Operator",
        businessID: "business_live",
        businessName: "Deelrx Store",
        roles: ["owner"],
        permissions: ["*"],
        email: "operator@example.com"
    )

    private func environment(
        status: ProvisioningStatus,
        session: OperatorSession? = nil
    ) -> AppEnvironment {
        let configuration = try! AppConfiguration(info: [
            "DRX_APP_ENVIRONMENT": "development",
            "CLERK_PUBLISHABLE_KEY": "pk_test_unit",
            "DRX_API_BASE_URL": "https://example.test",
            "DRX_CONVEX_URL": "https://example.convex.cloud",
        ])
        return AppEnvironment(
            session: SessionStore(),
            telemetry: TelemetryService(configuration: configuration),
            configuration: configuration,
            provisioningClient: StubProvisioningClient(
                response: ProvisioningStatusResponse(status: status, session: session)
            )
        )
    }

    @Test
    func provisioningRequiredUserRoutesToOnboardingBeforeDashboard() async {
        let environment = environment(status: .needsBusinessOnboarding)
        await environment.checkProvisioning()
        #expect(environment.rootState == .needsOnboarding)
        #expect(environment.session.isAuthenticated == false)
    }

    @Test
    func readyProvisioningRestoresTheConvexOperatorSession() async {
        let environment = environment(status: .ready, session: readySession)

        await environment.checkProvisioning()

        #expect(environment.rootState == .ready)
        #expect(environment.session.operatorSession == readySession)
    }

    @Test
    func readyWithoutSessionUsesControlledRecovery() async {
        let environment = environment(status: .ready)

        await environment.checkProvisioning()

        #expect(environment.rootState == .recoverableError)
        #expect(environment.provisioningMessage?.contains("workspace details") == true)
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
        let error = ConvexError.convexError(
            message: "UNAUTHORIZED clerk_unsafe at convex/helpers/auth.ts request_id=req_safe_123"
        )
        #expect(AppEnvironment.requestID(from: error) == "req_safe_123")
    }

    @Test
    func previewProvisioningIsIsolatedAndSignOutOwnsRootTransition() async {
        let preview = AppEnvironment.preview()
        await preview.checkProvisioning()
        #expect(preview.rootState == .needsOnboarding)

        await preview.signOut()
        #expect(preview.rootState == .signedOut)
    }

    @Test
    func sessionStoreRestoresAndResetsAuthoritativeSession() {
        let store = SessionStore()

        store.restore(readySession)
        #expect(store.isAuthenticated)
        #expect(store.operatorSession == readySession)

        store.reset()
        #expect(store.isAuthenticated == false)
        #expect(store.operatorSession == nil)
    }

    @Test
    func decodesLiveConvexProvisioningContractWithAcronymIdentifiers() throws {
        let payload = Data(
            #"""
            {
                "status":"READY",
                "session":{
                    "operatorId":"user_testflight",
                    "displayName":"Test Operator",
                    "businessId":"business_live",
                    "businessName":"Deelrx Store",
                    "roles":["owner"],
                    "permissions":["*"],
                    "email":"operator@example.com"
                }
            }
            """#.utf8
        )

        let response = try JSONDecoder.convex.decode(ProvisioningStatusResponse.self, from: payload)

        #expect(response.status == .ready)
        #expect(response.session?.operatorID == "user_testflight")
        #expect(response.session?.businessID == "business_live")
        #expect(response.session?.displayName == "Test Operator")
        #expect(response.session?.email == "operator@example.com")
    }
}
