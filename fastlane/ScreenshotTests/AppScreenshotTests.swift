import XCTest

// Run only on the fresh simulator created by screenshotsLane. No account credentials.
@MainActor
final class AppScreenshotTests: XCTestCase {
    override func setUpWithError() throws { continueAfterFailure = false }

    private func saveScreen(name: String) {
        let screenshot = XCUIScreen.main.screenshot()
        let data = screenshot.pngRepresentation
        let targetDirs = [
            "/Volumes/Projects/Projects/DRX_Primary/app-docs/_assets/help-center/screenshots",
            "/Volumes/Projects/Projects/DRX_Primary/mintlify/images/help-center/screenshots",
            "/Volumes/Projects/Projects/DRX_Primary/docs/mintlify/qa-review"
        ]
        for dir in targetDirs {
            let path = "\(dir)/ios-\(name).png"
            try? data.write(to: URL(fileURLWithPath: path), options: .atomic)
        }
    }

    func testScreenshots() {
        let app = XCUIApplication()
        setupSnapshot(app)
        app.launchArguments += ["--ui-testing"]
        app.launch()
        XCTAssertTrue(app.buttons["signInButton"].waitForExistence(timeout: 20))
        saveScreen(name: "welcome")
        snapshot("01Welcome")
        app.buttons["signInButton"].tap()
        XCTAssertTrue(app.otherElements["signInAuthView"].waitForExistence(timeout: 20))
        saveScreen(name: "signin")
        snapshot("02SignIn")
        app.terminate()
        app.launch()
        XCTAssertTrue(app.buttons["createAccountButton"].waitForExistence(timeout: 20))
        saveScreen(name: "create-account")
        app.buttons["createAccountButton"].tap()
        XCTAssertTrue(app.otherElements["signUpAuthView"].waitForExistence(timeout: 20))
        saveScreen(name: "signup-form")
        snapshot("03CreateAccount")
    }
}
