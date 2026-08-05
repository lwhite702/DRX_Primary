import Foundation
import PostHog
import Sentry

@MainActor
final class TelemetryService {
    private(set) var configured = false
    private(set) var sentryConfigured = false
    private(set) var postHogConfigured = false
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
                options.sendDefaultPii = false
                options.tracesSampleRate = self.configuration.environment == .production ? 0.10 : 1.0
                options.sessionReplay.sessionSampleRate = self.configuration.environment == .production ? 0.05 : 0.10
                options.sessionReplay.onErrorSampleRate = 1.0
                options.sessionReplay.maskAllText = true
                options.sessionReplay.maskAllImages = true
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
                    event.context = event.context?.reduce(into: [:]) { result, entry in
                        result[entry.key] = Self.scrub(entry.value) ?? [:]
                    }
                    event.breadcrumbs?.forEach { breadcrumb in
                        breadcrumb.data = Self.scrub(breadcrumb.data)
                    }
                    return event
                }
            }
            sentryConfigured = true
        }

        if let apiKey = configuration.postHogAPIKey,
           let host = configuration.postHogHost?.absoluteString {
            let config = PostHogConfig(projectToken: apiKey, host: host)
            config.captureApplicationLifecycleEvents = true
            config.captureScreenViews = true
            config.captureElementInteractions = false
            config.preloadFeatureFlags = false
            config.sendFeatureFlagEvent = false
            config.personProfiles = .identifiedOnly
            config.reuseAnonymousId = false
            config.sessionReplay = true
            config.sessionReplayConfig.maskAllTextInputs = true
            config.sessionReplayConfig.maskAllImages = true
            config.sessionReplayConfig.maskAllSandboxedViews = true
            config.sessionReplayConfig.captureNetworkTelemetry = false
            config.sessionReplayConfig.captureLogs = false
            config.sessionReplayConfig.screenshotMode = false
            config.sessionReplayConfig.sampleRate = configuration.environment == .production ? 0.05 : 0.10
            config.tracingHeaders = [configuration.apiBaseURL.host].compactMap { $0 }
            config.setBeforeSend { event in
                event.properties = Self.scrub(event.properties) ?? [:]
                return event
            }
            PostHogSDK.shared.setup(config)
            postHogConfigured = true
        }

        configured = sentryConfigured || postHogConfigured
    }

    func identify(_ session: OperatorSession) {
        let role = session.roles.first ?? "operator"
        let properties: [String: Any] = [
            "business_id": session.businessID,
            "role": role,
            "platform": "ios",
            "app_version": configuration.appVersion,
            "build": configuration.buildNumber,
            "distribution_channel": configuration.distributionChannel,
        ]
        if postHogConfigured {
            PostHogSDK.shared.identify(session.operatorID, userProperties: properties)
            PostHogSDK.shared.capture("ios_session_identified", properties: [
                "distribution_channel": configuration.distributionChannel,
                "platform": "ios",
            ])
        }

        if sentryConfigured {
            let user = User(userId: session.operatorID)
            user.data = ["business_id": session.businessID, "role": role]
            SentrySDK.setUser(user)
            SentrySDK.configureScope { scope in
                scope.setTag(value: "ios", key: "platform")
                scope.setTag(value: session.businessID, key: "business_id")
                scope.setTag(value: role, key: "role")
                scope.setTag(value: self.configuration.distributionChannel, key: "distribution_channel")
                scope.setTag(value: self.configuration.appVersion, key: "app_version")
                scope.setTag(value: self.configuration.buildNumber, key: "build")
            }
        }
    }

    func screen(_ name: String) {
        guard postHogConfigured else { return }
        PostHogSDK.shared.screen(name, properties: [
            "distribution_channel": configuration.distributionChannel,
            "platform": "ios",
        ])
    }

    func capture(_ event: String, properties: [String: Any] = [:]) {
        guard postHogConfigured else { return }
        var enriched = properties
        enriched["distribution_channel"] = configuration.distributionChannel
        enriched["platform"] = "ios"
        PostHogSDK.shared.capture(event, properties: Self.scrub(enriched) ?? [:])
    }

    func capture(error: Error, context: [String: Any] = [:]) {
        guard sentryConfigured else { return }
        SentrySDK.capture(error: error) { scope in
            scope.setExtras(Self.scrub(context) ?? [:])
        }
    }

    func reset() {
        if postHogConfigured {
            PostHogSDK.shared.reset()
        }
        if sentryConfigured {
            SentrySDK.setUser(nil)
            SentrySDK.configureScope { scope in
                scope.removeTag(key: "business_id")
                scope.removeTag(key: "role")
                scope.removeTag(key: "distribution_channel")
                scope.removeTag(key: "app_version")
                scope.removeTag(key: "build")
            }
        }
    }

    nonisolated static func scrub(_ dictionary: [String: Any]?) -> [String: Any]? {
        guard let dictionary else { return nil }
        let sensitive = [
            "password", "passcode", "secret", "token", "authorization", "cookie", "session",
            "payment", "card", "account_number", "routing_number", "customer", "phone",
            "address", "ssn", "tax_id", "request_body", "form_values",
        ]
        return dictionary.reduce(into: [:]) { result, entry in
            let (key, value) = entry
            if sensitive.contains(where: { key.localizedCaseInsensitiveContains($0) }) {
                result[key] = "[Filtered]"
            } else if let nested = value as? [String: Any] {
                result[key] = scrub(nested)
            } else {
                result[key] = scrubValue(value)
            }
        }
    }

    private nonisolated static func scrubValue(_ value: Any) -> Any {
        if let nested = value as? [String: Any] {
            return scrub(nested) ?? [:]
        }
        if let array = value as? [Any] {
            return array.map(scrubValue)
        }
        return value
    }
}
