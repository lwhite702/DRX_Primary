import Foundation
import Testing
@testable import DRXApp

struct AppConfigurationTests {
    @Test
    func loadsRequiredAndOptionalClientConfiguration() throws {
        let configuration = try AppConfiguration(info: [
            "DRX_APP_ENVIRONMENT": "development",
            "CLERK_PUBLISHABLE_KEY": "pk_test_example",
            "DRX_API_BASE_URL": "https://example.test",
            "DRX_CONVEX_URL": "https://handsome-llama-678.convex.cloud",
            "SENTRY_DSN": "https://public@example.test/1",
            "POSTHOG_API_KEY": "phc_example",
            "POSTHOG_HOST": "https://us.i.posthog.com"
        ])

        #expect(configuration.environment == .development)
        #expect(configuration.clerkPublishableKey == "pk_test_example")
        #expect(configuration.apiBaseURL == URL(string: "https://example.test"))
        #expect(configuration.convexDeploymentURL == URL(string: "https://handsome-llama-678.convex.cloud"))
        #expect(configuration.sentryDSN == URL(string: "https://public@example.test/1"))
        #expect(configuration.postHogAPIKey == "phc_example")
        #expect(configuration.postHogHost == URL(string: "https://us.i.posthog.com"))
        #expect(configuration.distributionChannel == "development")
    }

    @Test
    func rejectsMissingClerkConfigurationWithoutCrashing() {
        #expect(throws: ConfigurationError.missingOrInvalid("CLERK_PUBLISHABLE_KEY")) {
            try AppConfiguration(info: [
                "DRX_APP_ENVIRONMENT": "development",
                "DRX_API_BASE_URL": "https://example.test"
            ])
        }
    }

    @Test
    func requiresTLSForTheAPI() {
        #expect(throws: ConfigurationError.missingOrInvalid("DRX_API_BASE_URL")) {
            try AppConfiguration(info: [
                "DRX_APP_ENVIRONMENT": "development",
                "CLERK_PUBLISHABLE_KEY": "pk_test_example",
                "DRX_API_BASE_URL": "http://example.test"
            ])
        }
    }

    @Test
    func canonicalizesTheProductionAPIHostWithoutAnAuthStrippingRedirect() throws {
        let configuration = try AppConfiguration(info: [
            "DRX_APP_ENVIRONMENT": "production",
            "CLERK_PUBLISHABLE_KEY": "pk_live_example",
            "DRX_API_BASE_URL": "https://deelrxcrm.app",
            "DRX_CONVEX_URL": "https://brainy-mouse-884.convex.cloud",
            "SENTRY_DSN": "https://public@example.test/1",
            "POSTHOG_API_KEY": "phc_example",
            "POSTHOG_HOST": "https://us.i.posthog.com"
        ])

        #expect(configuration.apiBaseURL == URL(string: "https://www.deelrxcrm.app"))
        #expect(configuration.convexDeploymentURL == URL(string: "https://brainy-mouse-884.convex.cloud"))
        #expect(configuration.distributionChannel == "testflight")
    }

    @Test
    func requiresAConvexCloudDeployment() {
        #expect(throws: ConfigurationError.missingOrInvalid("DRX_CONVEX_URL")) {
            try AppConfiguration(info: [
                "DRX_APP_ENVIRONMENT": "development",
                "CLERK_PUBLISHABLE_KEY": "pk_test_example",
                "DRX_API_BASE_URL": "https://example.test",
                "DRX_CONVEX_URL": "https://example.test",
            ])
        }
    }

    @Test
    func requiresTelemetryForProduction() {
        #expect(throws: ConfigurationError.missingOrInvalid("SENTRY_DSN")) {
            try AppConfiguration(info: [
                "DRX_APP_ENVIRONMENT": "production",
                "CLERK_PUBLISHABLE_KEY": "pk_live_example",
                "DRX_API_BASE_URL": "https://www.deelrxcrm.app",
                "DRX_CONVEX_URL": "https://brainy-mouse-884.convex.cloud"
            ])
        }
    }
}
