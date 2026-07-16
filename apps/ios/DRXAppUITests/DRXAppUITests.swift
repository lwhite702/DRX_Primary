import XCTest

final class DRXAppUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testSignedOutShellShowsSignInAction() {
        let app = XCUIApplication()
        app.launchArguments.append("--ui-testing")
        app.launch()

        let signInButton = app.buttons["signInButton"]
        XCTAssertTrue(signInButton.waitForExistence(timeout: 10))
        XCTAssertTrue(signInButton.isHittable)
    }
}
