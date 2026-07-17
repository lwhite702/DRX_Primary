import Foundation

struct AppConfiguration: Sendable, Equatable {
    enum Environment: String, Sendable {
        case development
        case production
    }

    let environment: Environment
    let clerkPublishableKey: String
    let apiBaseURL: URL
    let sentryDSN: URL?
    let postHogAPIKey: String?
    let postHogHost: URL?

    static func live(bundle: Bundle = .main) throws -> AppConfiguration {
        try AppConfiguration(info: bundle.infoDictionary ?? [:])
    }

    init(info: [String: Any]) throws {
        guard let environmentValue = Self.value(for: "DRX_APP_ENVIRONMENT", in: info),
              let environment = Environment(rawValue: environmentValue) else {
            throw ConfigurationError.missingOrInvalid("DRX_APP_ENVIRONMENT")
        }

        guard let clerkPublishableKey = Self.value(for: "CLERK_PUBLISHABLE_KEY", in: info),
              clerkPublishableKey.hasPrefix("pk_test_") || clerkPublishableKey.hasPrefix("pk_live_") else {
            throw ConfigurationError.missingOrInvalid("CLERK_PUBLISHABLE_KEY")
        }

        guard let apiBaseURLValue = Self.value(for: "DRX_API_BASE_URL", in: info),
              let apiBaseURL = URL(string: apiBaseURLValue),
              apiBaseURL.scheme == "https",
              apiBaseURL.host != nil else {
            throw ConfigurationError.missingOrInvalid("DRX_API_BASE_URL")
        }

        self.environment = environment
        self.clerkPublishableKey = clerkPublishableKey
        self.apiBaseURL = apiBaseURL
        self.sentryDSN = Self.optionalURL(for: "SENTRY_DSN", in: info)
        self.postHogAPIKey = Self.value(for: "POSTHOG_API_KEY", in: info)
        self.postHogHost = Self.optionalURL(for: "POSTHOG_HOST", in: info)
    }

    private static func value(for key: String, in info: [String: Any]) -> String? {
        guard let value = info[key] as? String else { return nil }
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, !trimmed.hasPrefix("$(") else { return nil }
        return trimmed
    }

    private static func optionalURL(for key: String, in info: [String: Any]) -> URL? {
        guard let value = value(for: key, in: info) else { return nil }
        return URL(string: value)
    }
}

enum ConfigurationError: LocalizedError, Sendable, Equatable {
    case missingOrInvalid(String)

    var errorDescription: String? {
        switch self {
        case .missingOrInvalid(let key):
            "DRX is missing a valid \(key) build setting. Regenerate the Xcode project from apps/ios/project.yml."
        }
    }
}

