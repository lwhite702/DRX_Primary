import Testing
@testable import DRXApp

struct TelemetryServiceTests {
    @Test
    func keepsNativeSessionReplayDisabled() {
        #expect(TelemetryService.sessionReplayEnabled == false)
        #expect(TelemetryService.sentryReplaySampleRate == 0)
        #expect(TelemetryService.sentryReplayOnErrorSampleRate == 0)
    }

    @Test
    func scrubsSensitiveNestedTelemetryValues() {
        let scrubbed = TelemetryService.scrub([
            "workflow": "checkout",
            "authorization": "Bearer secret",
            "profile": [
                "email": "operator@example.test",
                "customer_record": "private",
            ],
            "items": [
                ["sku": "safe", "card_number": "4242"],
                ["nested", ["session_token": "secret"]] as [Any],
            ],
        ])

        #expect(scrubbed?["workflow"] as? String == "checkout")
        #expect(scrubbed?["authorization"] as? String == "[Filtered]")

        let profile = scrubbed?["profile"] as? [String: Any]
        #expect(profile?["email"] as? String == "operator@example.test")
        #expect(profile?["customer_record"] as? String == "[Filtered]")

        let items = scrubbed?["items"] as? [Any]
        let firstItem = items?.first as? [String: Any]
        #expect(firstItem?["sku"] as? String == "safe")
        #expect(firstItem?["card_number"] as? String == "[Filtered]")
        let heterogeneousItem = items?[1] as? [Any]
        let nestedSecret = heterogeneousItem?[1] as? [String: Any]
        #expect(nestedSecret?["session_token"] as? String == "[Filtered]")
    }
}
