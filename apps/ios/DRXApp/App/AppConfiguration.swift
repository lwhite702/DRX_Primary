import Foundation

struct AppConfiguration: Sendable, Equatable {
    enum Environment: String, Sendable {
        case development
        case production
    }

    let environment: Environment
    let clerkPublishableKey: String
    let apiBaseURL: URL
    let convexDeploymentURL: URL
    let sentryDSN: URL?
    let postHogAPIKey: String?
    let postHogHost: URL?
    let appVersion: String
    let buildNumber: String

    var releaseName: String { "com.wrelik.drx@\(appVersion)+\(buildNumber)" }
    var distributionChannel: String { environment == .production ? "testflight" : "development" }

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
              let parsedAPIBaseURL = URL(string: apiBaseURLValue),
              let apiBaseURL = Self.canonicalAPIBaseURL(parsedAPIBaseURL),
              apiBaseURL.scheme == "https",
              apiBaseURL.host != nil else {
            throw ConfigurationError.missingOrInvalid("DRX_API_BASE_URL")
        }

        guard let convexDeploymentURLValue = Self.value(for: "DRX_CONVEX_URL", in: info),
              let convexDeploymentURL = URL(string: convexDeploymentURLValue),
              convexDeploymentURL.scheme == "https",
              convexDeploymentURL.host != nil else {
            throw ConfigurationError.missingOrInvalid("DRX_CONVEX_URL")
        }

        self.environment = environment
        self.clerkPublishableKey = clerkPublishableKey
        self.apiBaseURL = apiBaseURL
        self.convexDeploymentURL = convexDeploymentURL
        let sentryDSN = Self.optionalHTTPSURL(for: "SENTRY_DSN", in: info)
        let postHogAPIKey = Self.value(for: "POSTHOG_API_KEY", in: info)
        let postHogHost = Self.optionalHTTPSURL(for: "POSTHOG_HOST", in: info)

        if environment == .production {
            guard sentryDSN != nil else {
                throw ConfigurationError.missingOrInvalid("SENTRY_DSN")
            }
            guard postHogAPIKey?.hasPrefix("phc_") == true else {
                throw ConfigurationError.missingOrInvalid("POSTHOG_API_KEY")
            }
            guard postHogHost != nil else {
                throw ConfigurationError.missingOrInvalid("POSTHOG_HOST")
            }
        }

        self.sentryDSN = sentryDSN
        self.postHogAPIKey = postHogAPIKey
        self.postHogHost = postHogHost
        self.appVersion = Self.value(for: "CFBundleShortVersionString", in: info) ?? "0.0.0"
        self.buildNumber = Self.value(for: "CFBundleVersion", in: info) ?? "0"
    }

    private static func value(for key: String, in info: [String: Any]) -> String? {
        guard let value = info[key] as? String else { return nil }
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, !trimmed.hasPrefix("$(") else { return nil }
        return trimmed
    }

    private static func optionalHTTPSURL(for key: String, in info: [String: Any]) -> URL? {
        guard let value = value(for: key, in: info) else { return nil }
        guard let url = URL(string: value), url.scheme == "https", url.host != nil else { return nil }
        return url
    }

    private static func canonicalAPIBaseURL(_ url: URL) -> URL? {
        guard url.host == "deelrxcrm.app" else { return url }
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        components?.host = "www.deelrxcrm.app"
        return components?.url
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
