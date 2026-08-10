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

enum WorkspaceTab: Hashable { case dashboard, pos, inventory, customers, more }

enum ProvisioningStatus: String, Decodable, Sendable {
    case needsBusinessOnboarding = "NEEDS_BUSINESS_ONBOARDING"
    case ready = "READY"
    case inactive = "INACTIVE"
    case businessMissing = "BUSINESS_MISSING"
}

struct ProvisioningStatusResponse: Decodable, Sendable {
    let status: ProvisioningStatus
    let session: OperatorSession?
}

struct BusinessOnboardingInput: Encodable, Sendable {
    let name: String
    let businessName: String
    let businessType: String
    let currency: String
    let timezone: String
    let collectTax: Bool
    let taxRateBps: Int
    let locationName: String
    let city: String?
    let region: String?
    let country: String
    let tracksInventory: Bool
    let invitedUserEmail: String?
    let invitedUserRole: String?
    let invitationToken: String?
}

struct BusinessOnboardingResponse: Decodable, Sendable {
    let status: String
}

protocol ProvisioningClient: Sendable {
    func status() async throws -> ProvisioningStatusResponse
    func createBusiness(_ input: BusinessOnboardingInput) async throws -> BusinessOnboardingResponse
}

struct LiveProvisioningClient: ProvisioningClient {
    let client: ConvexClient

    init(client: ConvexClient = .shared) {
        self.client = client
    }

    func status() async throws -> ProvisioningStatusResponse {
        try await client.query("onboarding:getCurrentOnboardingStatus", args: EmptyConvexArgs())
    }

    func createBusiness(_ input: BusinessOnboardingInput) async throws -> BusinessOnboardingResponse {
        try await client.mutation("onboarding:createBusinessOnboarding", args: input)
    }
}

struct PreviewProvisioningClient: ProvisioningClient {
    func status() async throws -> ProvisioningStatusResponse {
        ProvisioningStatusResponse(status: .needsBusinessOnboarding, session: nil)
    }

    func createBusiness(_ input: BusinessOnboardingInput) async throws -> BusinessOnboardingResponse {
        BusinessOnboardingResponse(status: "ONBOARDING_SUCCESS")
    }
}

private enum WorkspaceProvisioningFailure: String, Error, LocalizedError, Sendable {
    case authentication
    case network
    case service
    case invalidResponse
    case inactiveAccount
    case missingBusiness
    case unknown

    var errorDescription: String? {
        switch self {
        case .authentication: "Native workspace authentication failed."
        case .network: "Native workspace provisioning could not reach the service."
        case .service: "Native workspace provisioning service failed."
        case .invalidResponse: "Native workspace provisioning returned an invalid response."
        case .inactiveAccount: "Native workspace provisioning found an inactive account."
        case .missingBusiness: "Native workspace provisioning found a missing business."
        case .unknown: "Native workspace provisioning failed."
        }
    }
}

@MainActor
@Observable
final class AppEnvironment {
    let session: SessionStore
    let telemetry: TelemetryService
    let configuration: AppConfiguration
    private let provisioningClient: any ProvisioningClient
    private(set) var rootState: RootApplicationState = .initializing
    private(set) var provisioningMessage: String?
    private(set) var supportRequestID: String?
    private(set) var isSubmittingOnboarding = false
    private(set) var nextWorkspaceTab: WorkspaceTab = .dashboard
    private var provisioningGeneration = 0

    init(
        session: SessionStore,
        telemetry: TelemetryService,
        configuration: AppConfiguration,
        provisioningClient: any ProvisioningClient = LiveProvisioningClient()
    ) {
        self.session = session
        self.telemetry = telemetry
        self.configuration = configuration
        self.provisioningClient = provisioningClient
    }

    static func live(configuration: AppConfiguration) -> AppEnvironment {
        if ProcessInfo.processInfo.arguments.contains("--ui-testing") {
            return preview()
        }

        return AppEnvironment(
            session: SessionStore(),
            telemetry: TelemetryService(configuration: configuration),
            configuration: configuration,
            provisioningClient: LiveProvisioningClient(
                client: ConvexClient(deploymentURL: configuration.convexDeploymentURL)
            )
        )
    }

    static func preview() -> AppEnvironment {
        let configuration = try! AppConfiguration(info: [
            "DRX_APP_ENVIRONMENT": "development",
            "CLERK_PUBLISHABLE_KEY": "pk_test_preview",
            "DRX_API_BASE_URL": "https://example.test",
            "DRX_CONVEX_URL": "https://example.convex.cloud",
        ])
        return AppEnvironment(
            session: SessionStore(),
            telemetry: TelemetryService(configuration: configuration),
            configuration: configuration,
            provisioningClient: PreviewProvisioningClient()
        )
    }

    func clerkSignedOut() async {
        await signOut()
    }

    func checkProvisioning() async {
        provisioningGeneration += 1
        let generation = provisioningGeneration
        rootState = .checkingProvisioning
        provisioningMessage = nil
        supportRequestID = nil

        do {
            let response = try await provisioningClient.status()
            guard isCurrent(generation) else { return }

            switch response.status {
            case .needsBusinessOnboarding:
                session.reset()
                rootState = .needsOnboarding
            case .ready:
                rootState = .loadingWorkspace
                guard let operatorSession = response.session else {
                    showRecovery(
                        "We couldn't read your workspace details. Please try again.",
                        failure: .invalidResponse
                    )
                    return
                }
                session.restore(operatorSession)
                telemetry.identify(operatorSession)
                rootState = .ready
            case .inactive:
                showRecovery(
                    "This account is inactive. Contact your administrator for access.",
                    failure: .inactiveAccount
                )
            case .businessMissing:
                showRecovery(
                    "Your workspace needs attention. Contact support or try again.",
                    failure: .missingBusiness
                )
            }
        } catch is CancellationError {
            return
        } catch {
            guard isCurrent(generation) else { return }
            let failure = Self.failure(from: error)
            showRecovery(Self.recoveryMessage(for: failure), failure: failure, sourceError: error)
        }
    }

    func completeOnboarding(_ input: BusinessOnboardingInput) async -> Bool {
        guard !isSubmittingOnboarding else { return false }
        isSubmittingOnboarding = true
        defer { isSubmittingOnboarding = false }

        do {
            let response = try await provisioningClient.createBusiness(input)
            guard !Task.isCancelled else { return false }
            guard response.status == "ONBOARDING_SUCCESS" || response.status == "ALREADY_ONBOARDED" else {
                showRecovery(
                    "We couldn't finish setting up your business. Please try again.",
                    failure: response.status == "BUSINESS_MISSING" ? .missingBusiness : .service
                )
                return false
            }
            session.reset()
            await checkProvisioning()
            return rootState == .ready
        } catch is CancellationError {
            return false
        } catch {
            guard !Task.isCancelled else { return false }
            let failure = Self.failure(from: error)
            showRecovery(
                "We couldn't finish setting up your business. Please try again.",
                failure: failure,
                sourceError: error
            )
            return false
        }
    }

    func openWorkspace(at tab: WorkspaceTab) async {
        nextWorkspaceTab = tab
        await checkProvisioning()
    }

    private func isCurrent(_ generation: Int) -> Bool {
        generation == provisioningGeneration && !Task.isCancelled
    }

    private func showRecovery(
        _ message: String,
        failure: WorkspaceProvisioningFailure,
        sourceError: Error? = nil
    ) {
        let requestID = Self.requestID(from: sourceError)
        var context = [
            "stage": "native_workspace_provisioning",
            "failure_category": failure.rawValue,
            "distribution_channel": configuration.distributionChannel,
        ]
        if let requestID {
            context["request_id"] = requestID
        }
        telemetry.capture(error: failure, context: context)
        provisioningMessage = message
        supportRequestID = requestID
        rootState = .recoverableError
    }

    private static func failure(from error: Error) -> WorkspaceProvisioningFailure {
        if error is DecodingError {
            return .invalidResponse
        }
        if let urlError = error as? URLError {
            return urlError.code == .userAuthenticationRequired ? .authentication : .network
        }
        if let convexError = error as? ConvexError {
            switch convexError {
            case .missingAuthenticationToken:
                return .authentication
            case .invalidResponse:
                return .invalidResponse
            case .server(let statusCode, _):
                return statusCode == 401 || statusCode == 403 ? .authentication : .service
            case .convexError(let message):
                return message.localizedCaseInsensitiveContains("UNAUTHENTICATED")
                    ? .authentication
                    : .service
            }
        }
        return .unknown
    }

    private static func recoveryMessage(for failure: WorkspaceProvisioningFailure) -> String {
        switch failure {
        case .authentication:
            "We couldn't verify your session. Sign out, then sign in again."
        case .network:
            "We couldn't reach your workspace. Check your connection and try again."
        case .invalidResponse:
            "We couldn't read your workspace details. Please try again."
        default:
            "We couldn't confirm your workspace. Please try again."
        }
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
        provisioningGeneration += 1
        session.reset()
        telemetry.reset()
        provisioningMessage = nil
        supportRequestID = nil
        rootState = .signedOut
    }
}
