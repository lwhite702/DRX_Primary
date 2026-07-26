import Foundation
import Observation

enum RootApplicationState: Equatable {
    case initializing
    case signedOut
    case checkingProvisioning
    case needsOnboarding
    case loadingWorkspace
    case ready
    case recoverableError
}

enum ProvisioningStatus: String, Decodable, Sendable {
    case needsBusinessOnboarding = "NEEDS_BUSINESS_ONBOARDING"
    case ready = "READY"
    case inactive = "INACTIVE"
    case businessMissing = "BUSINESS_MISSING"
}

struct ProvisioningStatusResponse: Decodable, Sendable {
    let status: ProvisioningStatus
}

struct BusinessOnboardingInput: Encodable, Sendable {
    let name: String
    let businessName: String
    let businessType: String
    let currency: String
    let timezone: String
    let collectTax: Bool
    let taxRateBps: Int
}

struct BusinessOnboardingResponse: Decodable, Sendable {
    let status: String
}

protocol ProvisioningClient: Sendable {
    func status() async throws -> ProvisioningStatus
    func createBusiness(_ input: BusinessOnboardingInput) async throws -> BusinessOnboardingResponse
}

struct LiveProvisioningClient: ProvisioningClient {
    func status() async throws -> ProvisioningStatus {
        let response: ProvisioningStatusResponse = try await ConvexClient.shared.query(
            "onboarding:getCurrentOnboardingStatus", args: EmptyConvexArgs()
        )
        return response.status
    }

    func createBusiness(_ input: BusinessOnboardingInput) async throws -> BusinessOnboardingResponse {
        try await ConvexClient.shared.mutation("onboarding:createBusinessOnboarding", args: input)
    }
}

@MainActor
@Observable
final class AppEnvironment {
    let apiClient: APIClient
    let session: SessionStore
    let telemetry: TelemetryService
    let configuration: AppConfiguration
    private let provisioningClient: any ProvisioningClient
    private(set) var rootState: RootApplicationState = .initializing
    private(set) var provisioningMessage: String?
    private(set) var supportRequestID: String?
    private(set) var isSubmittingOnboarding = false

    init(apiClient: APIClient, session: SessionStore, telemetry: TelemetryService, configuration: AppConfiguration, provisioningClient: any ProvisioningClient = LiveProvisioningClient()) {
        self.apiClient = apiClient
        self.session = session
        self.telemetry = telemetry
        self.configuration = configuration
        self.provisioningClient = provisioningClient
    }

    static func live(configuration: AppConfiguration) -> AppEnvironment {
        if ProcessInfo.processInfo.arguments.contains("--ui-testing") {
            return preview()
        }

        let tokenStore = ClerkTokenStore()
        let apiClient = URLSessionAPIClient(baseURL: configuration.apiBaseURL, tokenStore: tokenStore)
        let session = SessionStore(apiClient: apiClient, tokenStore: tokenStore)
        return AppEnvironment(
            apiClient: apiClient,
            session: session,
            telemetry: TelemetryService(configuration: configuration),
            configuration: configuration
        )
    }

    static func preview() -> AppEnvironment {
        let tokenStore = InMemoryTokenStore()
        let apiClient = MockAPIClient()
        let session = SessionStore(apiClient: apiClient, tokenStore: tokenStore)
        let configuration = try! AppConfiguration(info: [
            "DRX_APP_ENVIRONMENT": "development",
            "CLERK_PUBLISHABLE_KEY": "pk_test_preview",
            "DRX_API_BASE_URL": "https://example.test",
        ])
        return AppEnvironment(
            apiClient: apiClient,
            session: session,
            telemetry: TelemetryService(configuration: configuration),
            configuration: configuration
        )
    }

    func restoreSession() async {
        await session.restore()
        guard let operatorSession = session.operatorSession else { return }
        telemetry.identify(operatorSession)
    }

    func clerkSignedOut() async {
        await signOut()
        rootState = .signedOut
    }

    func checkProvisioning() async {
        rootState = .checkingProvisioning
        provisioningMessage = nil
        supportRequestID = nil
        do {
            switch try await provisioningClient.status() {
            case .needsBusinessOnboarding:
                rootState = .needsOnboarding
            case .ready:
                rootState = .loadingWorkspace
                await restoreSession()
                if session.isAuthenticated {
                    rootState = .ready
                } else {
                    showRecovery("We couldn't load your workspace. Please try again.")
                }
            case .inactive:
                showRecovery("This account is inactive. Contact your administrator for access.")
            case .businessMissing:
                showRecovery("Your workspace needs attention. Contact support or try again.")
            }
        } catch {
            showRecovery("We couldn't confirm your workspace. Check your connection and try again.", error: error)
        }
    }

    func completeOnboarding(_ input: BusinessOnboardingInput) async -> Bool {
        guard !isSubmittingOnboarding else { return false }
        isSubmittingOnboarding = true
        defer { isSubmittingOnboarding = false }
        do {
            let response = try await provisioningClient.createBusiness(input)
            guard response.status == "ONBOARDING_SUCCESS" || response.status == "ALREADY_ONBOARDED" else {
                showRecovery("We couldn't finish setting up your business. Please try again.")
                return false
            }
            session.reset()
            await checkProvisioning()
            return rootState == .ready
        } catch {
            showRecovery("We couldn't finish setting up your business. Please try again.", error: error)
            return false
        }
    }

    private func showRecovery(_ message: String, error: Error? = nil) {
        provisioningMessage = message
        supportRequestID = Self.requestID(from: error)
        rootState = .recoverableError
    }

    static func requestID(from error: Error?) -> String? {
        guard let text = error?.localizedDescription else { return nil }
        let pattern = #"(?i)(?:request[_ -]?id)[:= ]+([A-Za-z0-9_-]{6,80})"#
        guard let regex = try? NSRegularExpression(pattern: pattern),
              let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
              let range = Range(match.range(at: 1), in: text) else { return nil }
        return String(text[range])
    }

    func signOut() async {
        await session.signOut()
        telemetry.reset()
        provisioningMessage = nil
        supportRequestID = nil
    }
}
