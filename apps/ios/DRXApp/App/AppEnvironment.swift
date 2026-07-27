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
    /// Retrieves the current business provisioning status.
    /// - Returns: The current provisioning status.
    func status() async throws -> ProvisioningStatus {
        let response: ProvisioningStatusResponse = try await ConvexClient.shared.query(
            "onboarding:getCurrentOnboardingStatus", args: EmptyConvexArgs()
        )
        return response.status
    }

    /// Creates a business onboarding record.
    ///
    /// - Parameter input: The business details and onboarding settings.
    /// - Returns: The onboarding result returned by the provisioning service.
    func createBusiness(_ input: BusinessOnboardingInput) async throws -> BusinessOnboardingResponse {
        try await ConvexClient.shared.mutation("onboarding:createBusinessOnboarding", args: input)
    }
}

struct MockProvisioningClient: ProvisioningClient {
    /// Retrieves the current provisioning status.
    ///
    /// - Returns: The provisioning status, always `.needsBusinessOnboarding`.
    func status() async throws -> ProvisioningStatus {
        .needsBusinessOnboarding
    }

    /// Creates a business onboarding record.
    /// - Parameter input: The business onboarding details.
    /// - Returns: The onboarding operation status.
    func createBusiness(_ input: BusinessOnboardingInput) async throws -> BusinessOnboardingResponse {
        .init(status: "ONBOARDING_SUCCESS")
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
    private var provisioningGeneration = 0

    init(apiClient: APIClient, session: SessionStore, telemetry: TelemetryService, configuration: AppConfiguration, provisioningClient: any ProvisioningClient = LiveProvisioningClient()) {
        self.apiClient = apiClient
        self.session = session
        self.telemetry = telemetry
        self.configuration = configuration
        self.provisioningClient = provisioningClient
    }

    /// Creates a live application environment using the supplied configuration.
    /// - Parameter configuration: The application configuration used to configure the API client and telemetry service.
    /// - Returns: A live application environment, or a preview environment when UI testing is enabled.
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

    /// Creates an app environment configured with in-memory services for previews and testing.
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
            configuration: configuration,
            provisioningClient: MockProvisioningClient()
        )
    }

    /// Restores the current session and identifies the operator when a session is available.
    func restoreSession() async {
        await session.restore()
        guard let operatorSession = session.operatorSession else { return }
        telemetry.identify(operatorSession)
    }

    /// Signs out the current operator and updates the application state to signed out.
    func clerkSignedOut() async {
        await signOut()
        rootState = .signedOut
    }

    /// Checks the current provisioning status and updates the application state accordingly.
    /// - Updates the root state for onboarding, workspace loading, readiness, or recoverable errors.
    /// - Clears previous provisioning messages and support request identifiers before checking.
    func checkProvisioning() async {
        provisioningGeneration += 1
        let currentGeneration = provisioningGeneration
        rootState = .checkingProvisioning
        provisioningMessage = nil
        supportRequestID = nil
        do {
            let status = try await provisioningClient.status()
            guard currentGeneration == provisioningGeneration else { return }
            switch status {
            case .needsBusinessOnboarding:
                rootState = .needsOnboarding
            case .ready:
                rootState = .loadingWorkspace
                await restoreSession()
                guard currentGeneration == provisioningGeneration else { return }
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
            guard currentGeneration == provisioningGeneration else { return }
            showRecovery("We couldn't confirm your workspace. Check your connection and try again.", error: error)
        }
    }

    /// Completes business onboarding and advances the application to the ready state when provisioning succeeds.
    /// - Parameter input: The business details submitted for onboarding.
    /// - Returns: `true` if onboarding succeeds and the application reaches the ready state, `false` otherwise.
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

    /// Presents a recoverable provisioning error with an optional support request identifier.
    /// - Parameters:
    ///   - message: The message describing the recovery issue.
    ///   - error: An optional error from which to extract a support request identifier.
    private func showRecovery(_ message: String, error: Error? = nil) {
        provisioningMessage = message
        supportRequestID = Self.requestID(from: error)
        rootState = .recoverableError
    }

    /// Extracts a request identifier from an error's localized description.
    ///
    /// - Parameter error: The error whose localized description may contain a request identifier.
    /// - Returns: The extracted request identifier, or `nil` if none is found.
    static func requestID(from error: Error?) -> String? {
        guard let text = error?.localizedDescription else { return nil }
        let pattern = #"(?i)(?:request[_ -]?id)[:= ]+([A-Za-z0-9_-]{6,80})"#
        guard let regex = try? NSRegularExpression(pattern: pattern),
              let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
              let range = Range(match.range(at: 1), in: text) else { return nil }
        return String(text[range])
    }

    /// Signs out the current session and clears telemetry and provisioning recovery state.
    func signOut() async {
        await session.signOut()
        telemetry.reset()
        provisioningMessage = nil
        supportRequestID = nil
    }
}
