import XCTest

final class DRXAppUITests: XCTestCase {
    func testSignedOutShellShowsSignInAction() {
        let app = XCUIApplication()
        app.launch()

        XCTAssertTrue(app.buttons["signInButton"].waitForExistence(timeout: 5))
    }
}
