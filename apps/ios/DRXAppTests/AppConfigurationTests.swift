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
            "SENTRY_DSN": "https://public@example.test/1",
            "POSTHOG_API_KEY": "phc_example",
            "POSTHOG_HOST": "https://us.i.posthog.com"
        ])

        #expect(configuration.environment == .development)
        #expect(configuration.clerkPublishableKey == "pk_test_example")
        #expect(configuration.apiBaseURL == URL(string: "https://example.test"))
        #expect(configuration.sentryDSN == URL(string: "https://public@example.test/1"))
        #expect(configuration.postHogAPIKey == "phc_example")
        #expect(configuration.postHogHost == URL(string: "https://us.i.posthog.com"))
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
}
