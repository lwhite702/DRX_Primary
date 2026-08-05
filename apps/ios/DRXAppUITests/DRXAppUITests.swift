import XCTest

@MainActor
final class DRXAppUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testSignedOutShellShowsClerkAuthentication() {
        let app = XCUIApplication()
        app.launchArguments.append("--ui-testing")
        app.launch()

        let authView = app.otherElements["clerkAuthView"]
        XCTAssertTrue(authView.waitForExistence(timeout: 10))
    }
}
