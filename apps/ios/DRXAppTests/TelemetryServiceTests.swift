import Testing
@testable import DRXApp

struct TelemetryServiceTests {
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
            ],
        ])

        #expect(scrubbed?["workflow"] as? String == "checkout")
        #expect(scrubbed?["authorization"] as? String == "[Filtered]")

        let profile = scrubbed?["profile"] as? [String: Any]
        #expect(profile?["email"] as? String == "operator@example.test")
        #expect(profile?["customer_record"] as? String == "[Filtered]")

        let items = scrubbed?["items"] as? [[String: Any]]
        #expect(items?.first?["sku"] as? String == "safe")
        #expect(items?.first?["card_number"] as? String == "[Filtered]")
    }
}
