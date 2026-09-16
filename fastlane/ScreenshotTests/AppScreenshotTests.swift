import XCTest

// Run only on the fresh simulator created by screenshotsLane. No account credentials.
@MainActor
final class AppScreenshotTests: XCTestCase {
    override func setUpWithError() throws { continueAfterFailure = false }

    func testScreenshots() {
        let app = XCUIApplication()
        setupSnapshot(app)
        app.launchArguments += ["--ui-testing"]
        app.launch()
        XCTAssertTrue(app.buttons["signInButton"].waitForExistence(timeout: 20))
        snapshot("01Welcome")
        app.buttons["signInButton"].tap()
        XCTAssertTrue(app.otherElements["signInAuthView"].waitForExistence(timeout: 20))
        snapshot("02SignIn")
        app.terminate()
        app.launch()
        XCTAssertTrue(app.buttons["createAccountButton"].waitForExistence(timeout: 20))
        app.buttons["createAccountButton"].tap()
        XCTAssertTrue(app.otherElements["signUpAuthView"].waitForExistence(timeout: 20))
        snapshot("03CreateAccount")
    }
}
