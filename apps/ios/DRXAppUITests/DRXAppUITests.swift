import XCTest

@MainActor
final class DRXAppUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testColdLaunchShowsSplash() {
        let app = XCUIApplication()
        app.launchArguments.append("--ui-testing")
        app.launchArguments.append("--ui-testing-hold-splash")
        app.launch()

        XCTAssertTrue(app.otherElements["launchSplashView"].waitForExistence(timeout: 10))
    }

    func testCreateAccountOpensNativeRegistration() {
        let app = XCUIApplication()
        app.launchArguments.append("--ui-testing")
        app.launch()

        let createAccount = app.buttons["createAccountButton"]
        XCTAssertTrue(createAccount.waitForExistence(timeout: 10))
        createAccount.tap()

        XCTAssertTrue(app.otherElements["signUpAuthView"].waitForExistence(timeout: 10))
    }

    func testSignInOpensExistingUserAuthentication() {
        let app = XCUIApplication()
        app.launchArguments.append("--ui-testing")
        app.launch()

        let signIn = app.buttons["signInButton"]
        XCTAssertTrue(signIn.waitForExistence(timeout: 10))
        signIn.tap()

        XCTAssertTrue(app.otherElements["signInAuthView"].waitForExistence(timeout: 10))
    }
}
