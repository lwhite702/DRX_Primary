import Foundation
import PostHog
import Sentry

@MainActor
final class TelemetryService {
    private(set) var configured = false
    private let configuration: AppConfiguration

    init(configuration: AppConfiguration) {
        self.configuration = configuration
        configureSDKs()
    }

    private func configureSDKs() {
        if let dsn = configuration.sentryDSN?.absoluteString {
            SentrySDK.start { options in
                options.dsn = dsn
                options.environment = self.configuration.environment.rawValue
                options.releaseName = self.configuration.releaseName
                options.dist = self.configuration.buildNumber
                options.sendDefaultPii = true
                options.tracesSampleRate = self.configuration.environment == .production ? 0.10 : 1.0
                options.sessionReplay.sessionSampleRate = self.configuration.environment == .production ? 0.05 : 0.10
                options.sessionReplay.onErrorSampleRate = 1.0
                options.enableNetworkBreadcrumbs = true
                options.enableAutoPerformanceTracing = true
                options.beforeSend = { event in
                    event.request?.cookies = nil
                    event.request?.queryString = nil
                    event.request?.fragment = nil
                    if let headers = event.request?.headers {
                        event.request?.headers = headers.filter { key, _ in
                            !["authorization", "cookie", "set-cookie", "x-api-key"].contains(key.lowercased())
                        }
                    }
                    event.extra = Self.scrub(event.extra)
                    return event
                }
            }
        }

        if let apiKey = configuration.postHogAPIKey,
           let host = configuration.postHogHost?.absoluteString {
            let config = PostHogConfig(projectToken: apiKey, host: host)
            config.captureApplicationLifecycleEvents = true
            config.captureScreenViews = true
            config.captureElementInteractions = false
            config.sessionReplay = true
            config.sessionReplayConfig.maskAllTextInputs = true
            config.sessionReplayConfig.maskAllImages = true
            config.sessionReplayConfig.maskAllSandboxedViews = true
            config.sessionReplayConfig.captureNetworkTelemetry = false
            config.sessionReplayConfig.captureLogs = false
            config.sessionReplayConfig.screenshotMode = false
            config.tracingHeaders = [configuration.apiBaseURL.host].compactMap { $0 }
            PostHogSDK.shared.setup(config)
        }

        configured = true
    }

    func identify(_ session: OperatorSession) {
        let role = session.roles.first ?? "operator"
        let distributionChannel = configuration.environment == .production ? "testflight" : "development"
        var properties: [String: Any] = [
            "name": session.displayName,
            "business_id": session.businessID,
            "role": role,
            "platform": "ios",
            "app_version": configuration.appVersion,
            "build": configuration.buildNumber,
            "distribution_channel": distributionChannel,
        ]
        if let email = session.email { properties["email"] = email }
        PostHogSDK.shared.identify(session.operatorID, userProperties: properties)

        let user = User(userId: session.operatorID)
        user.email = session.email
        user.name = session.displayName
        user.data = ["business_id": session.businessID, "role": role]
        SentrySDK.setUser(user)
        SentrySDK.configureScope { scope in
            scope.setTag(value: "ios", key: "platform")
            scope.setTag(value: session.businessID, key: "business_id")
            scope.setTag(value: role, key: "role")
            scope.setTag(value: distributionChannel, key: "distribution_channel")
        }
    }

    func reset() {
        PostHogSDK.shared.reset()
        SentrySDK.setUser(nil)
    }

    nonisolated private static func scrub(_ dictionary: [String: Any]?) -> [String: Any]? {
        guard let dictionary else { return nil }
        let sensitive = ["password", "token", "authorization", "cookie", "payment", "card", "customer", "phone"]
        return dictionary.reduce(into: [:]) { result, entry in
            let (key, value) = entry
            if sensitive.contains(where: { key.localizedCaseInsensitiveContains($0) }) {
                result[key] = "[Filtered]"
            } else if let nested = value as? [String: Any] {
                result[key] = scrub(nested)
            } else {
                result[key] = value
            }
        }
    }
}
