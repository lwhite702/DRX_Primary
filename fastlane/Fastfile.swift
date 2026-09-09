import Foundation

class Fastfile: LaneFile {
    private var root: String { ProcessInfo.processInfo.environment["FASTLANE_PROJECT_ROOT"]! }
    private var native: String { root + "/apps/ios" }
    private var project: String { native + "/DRXApp.xcodeproj" }
    private var output: String { root + "/build/fastlane" }
    private let scheme = "DRXApp"
    private let appID = "com.wrelik.drx"

    private func quote(_ value: String) -> String { "'" + value.replacingOccurrences(of: "'", with: "'\\''") + "'" }
    private func require(_ condition: Bool, _ message: String) {
        if !condition {
            sh(command: "printf '%s\\n' " + quote(message) + " >&2; exit 1", log: true)
            exit(EXIT_FAILURE)
        }
    }
    override func onError(currentLane: String, errorInfo: String, errorClass: String?, errorMessage: String?) {
        // The beta bridge otherwise resumes the lane after an action failure.
        FileHandle.standardError.write(Data(((errorMessage ?? "Fastlane action failed in " + currentLane) + "\n").utf8))
        exit(EXIT_FAILURE)
    }
    private func value(_ input: String?, _ name: String) -> String {
        require(!(input ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, "Provide " + name + "; see docs/fastlane.md")
        return input ?? ""
    }
    private func file(_ input: String?, _ name: String) -> String {
        let path = value(input, name)
        require(path.hasPrefix("/") && FileManager.default.fileExists(atPath: path), name + " must be an existing absolute path")
        return path
    }
    private func appleAuthentication() {
        let env = ProcessInfo.processInfo.environment
        appStoreConnectApiKey(keyId: value(env["APP_STORE_CONNECT_KEY_ID"], "APP_STORE_CONNECT_KEY_ID"),
            issuerId: .userDefined(value(env["APP_STORE_CONNECT_ISSUER_ID"], "APP_STORE_CONNECT_ISSUER_ID")),
            keyFilepath: .userDefined(file(env["APP_STORE_CONNECT_KEY_FILE"], "APP_STORE_CONNECT_KEY_FILE")))
        // The generated Swift action returns Void; pilot consumes its shared lane-context key.
    }

    func prepareLane() {
        desc("Prepare the native Xcode project")
        // Preserve the checked-in application project.
        require(FileManager.default.fileExists(atPath: project), "Native Xcode project is missing")
    }

    func checkLane() {
        desc("Check application identity and the installed Sentry plugin")
        prepareLane()
        sh(command: "bundle exec ruby " + quote(root + "/scripts/fastlane-check.rb") + " " + quote(project) + " " + quote(scheme) + " " + quote(appID), log: true)
    }

    func buildLane() {
        desc("Build an unsigned simulator application locally")
        prepareLane()
        buildApp(project: .userDefined(project), scheme: .userDefined(scheme), configuration: "Debug",
            skipPackageIpa: true, skipArchive: .userDefined(true), skipCodesigning: .userDefined(true),
            derivedDataPath: .userDefined(output + "/DerivedData"), buildlogPath: output + "/logs",
            sdk: "iphonesimulator", destination: "generic/platform=iOS Simulator",
            xcargs: "CODE_SIGNING_ALLOWED=NO", xcodebuildFormatter: "")
    }

    func testLane(withOptions options: [String: String]?) {
        desc("Run native tests on an explicitly selected simulator")
        let destination = value(options?["destination"], "destination:platform=iOS Simulator,id=UDID")
        require(destination.hasPrefix("platform=iOS Simulator,"), "Tests require an iOS Simulator destination")
        prepareLane()
        runTests(project: .userDefined(project), scheme: .userDefined(scheme),
            outputDirectory: output + "/tests", buildlogPath: output + "/logs", xcodebuildFormatter: "",
            derivedDataPath: .userDefined(output + "/DerivedData"), configuration: "Debug",
            xcargs: "CODE_SIGNING_ALLOWED=NO", skipSlack: true, destination: destination)
    }

    func archiveLane(withOptions options: [String: String]?) {
        desc("Archive and export locally using existing signing and an external xcconfig")
        let version = value(options?["version"], "version:X.Y.Z")
        let number = value(options?["build_number"], "build_number:NUMBER resolved from App Store Connect")
        require(version.range(of: #"^\d+\.\d+\.\d+$"#, options: .regularExpression) != nil, "version must be X.Y.Z")
        require(number.range(of: #"^[1-9]\d*$"#, options: .regularExpression) != nil, "build_number must be a positive integer")
        let config = file(options?["xcconfig"], "xcconfig")
        prepareLane()
        buildApp(project: .userDefined(project), scheme: .userDefined(scheme),
            outputDirectory: output, outputName: .userDefined(scheme + "-" + number + ".ipa"), configuration: "Release",
            exportOptions: .userDefined(["method": "app-store-connect", "destination": "export", "signingStyle": "automatic", "manageAppVersionAndBuildNumber": false]),
            archivePath: .userDefined(output + "/" + scheme + "-" + number + ".xcarchive"),
            derivedDataPath: .userDefined(output + "/ArchiveDerivedData"),
            buildlogPath: output + "/logs", destination: "generic/platform=iOS",
            xcargs: .userDefined("MARKETING_VERSION=" + version + " CURRENT_PROJECT_VERSION=" + number),
            xcconfig: .userDefined(config), xcodebuildFormatter: "")
    }

    func betaUploadLane(withOptions options: [String: String]?) {
        desc("Upload an explicitly approved IPA without external distribution or notifications")
        require(options?["approved"] == "true", "Explicit release approval required: approved:true")
        let ipa = file(options?["ipa"], "ipa")
        require(getIpaInfoPlistValue(key: "CFBundleIdentifier", ipa: ipa) == appID, "IPA belongs to a different application")
        appleAuthentication()
        uploadToTestflight(appIdentifier: .userDefined(appID), ipa: .userDefined(ipa),
            skipSubmission: true, skipWaitingForBuildProcessing: true,
            distributeExternal: false, notifyExternalTesters: false)
    }

    func symbolsLane(withOptions options: [String: String]?) {
        desc("Upload approved dSYMs to the existing Sentry project without source inclusion")
        require(options?["approved"] == "true", "Explicit upload approval required: approved:true")
        let path = file(options?["path"], "path")
        let env = ProcessInfo.processInfo.environment
        _ = value(env["SENTRY_AUTH_TOKEN"], "SENTRY_AUTH_TOKEN")
        sentryDebugFilesUpload(orgSlug: .userDefined(value(env["SENTRY_ORG_SLUG"], "SENTRY_ORG_SLUG")),
            projectSlug: .userDefined(value(env["SENTRY_PROJECT_SLUG"], "SENTRY_PROJECT_SLUG")),
            path: .userDefined([path]), includeSources: false)
    }

    func screenshotsLane(withOptions options: [String: String]?) {
        desc("Capture synthetic or signed-out screens on a newly created simulator")
        prepareLane()
        let deviceType = options?["device_type"] ?? "com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro-Max"
        let runtimeJSON = sh(command: "xcrun simctl list runtimes --json", log: false)
        let runtimeList = ((try? JSONSerialization.jsonObject(with: Data(runtimeJSON.utf8))) as? [String: Any])?["runtimes"] as? [[String: Any]] ?? []
        let available = runtimeList.filter { ($0["isAvailable"] as? Bool) == true && ($0["identifier"] as? String ?? "").contains(".iOS-") }
        let runtime = options?["runtime"] ?? available.sorted { ($0["version"] as? String ?? "").compare($1["version"] as? String ?? "", options: .numeric) == .orderedDescending }.first?["identifier"] as? String ?? ""
        require(available.contains { ($0["identifier"] as? String) == runtime }, "Install an iOS simulator runtime in Xcode before capturing screenshots")
        require(runtime.hasPrefix("com.apple.CoreSimulator.SimRuntime.iOS-"), "An installed iOS runtime is required")
        let name = "Fastlane-DRX-" + UUID().uuidString
        let udid = sh(command: "xcrun simctl create " + quote(name) + " " + quote(deviceType) + " " + quote(runtime)).trimmingCharacters(in: .whitespacesAndNewlines)
        // Only delete the disposable simulator created by this lane, never an existing user's device.
        defer { sh(command: "xcrun simctl delete " + quote(udid)) }
        captureScreenshots(project: .userDefined(project), xcargs: "CODE_SIGNING_ALLOWED=NO",
            devices: .userDefined([name]), languages: ["en-US"], outputDirectory: output + "/screenshots/" + name,
            skipOpenSummary: true, clearPreviousScreenshots: false, eraseSimulator: false,
            overrideStatusBar: true, appIdentifier: .userDefined(appID), buildlogPath: output + "/snapshot-logs",
            configuration: "Debug", scheme: .userDefined(scheme + "Screenshots"),
            numberOfRetries: 0, stopAfterFirstError: true,
            derivedDataPath: .userDefined(output + "/ScreenshotDerivedData"), resultBundle: true,
            concurrentSimulators: false)
    }

    func privacyDraftLane() {
        desc("Answer the privacy questionnaire locally; upload and publication are disabled")
        let username = value(ProcessInfo.processInfo.environment["FASTLANE_USER"], "FASTLANE_USER for Apple-ID-only privacy questionnaire")
        uploadAppPrivacyDetailsToAppStore(username: username, appIdentifier: appID,
            outputJsonPath: output + "/app_privacy_details.draft.json", skipUpload: true, skipPublish: true)
    }
}
