# DRX native iOS Fastlane

Configuration: `fastlane/Fastfile.swift` (Fastlane.swift beta, explicitly selected by the product owner).

Tracking: [WRE-116](https://linear.app/wrelik/issue/WRE-116). Release impact: none. Roadmap impact: none.

Uses `apps/ios/DRXApp.xcodeproj`, scheme `DRXApp`, bundle `com.wrelik.drx`, and existing Apple team `L8R42BJ54K`. The existing CI remains the release authority. This setup does not deploy a backend or change app versions.

## Install and run

Homebrew Fastlane is already installed. The launcher uses Homebrew Ruby, the Homebrew Fastlane gems, and the user's Fastlane gem directory. `Gemfile.lock` pins Fastlane 2.239.0, Sentry 2.6.3 and transitive dependencies. Homebrew upgrades do not silently change the project bundle; run install after an upgrade if needed. No system Ruby or sudo is used. `install` also generates the ignored Swift runner project and plugin bindings from the pinned Fastlane gem; these generated files are reproducible and are not a second source of lane configuration. Edit `fastlane/Fastfile.swift` directly or open `fastlane/swift/FastlaneSwiftRunner/FastlaneSwiftRunner.xcodeproj`. Run lanes through the launcher so project paths and dependencies are set correctly. The three projects use distinct Swift bridge ports (2116, 2117, 2118); override `FASTLANE_SWIFT_PORT` for simultaneous runs of the same project. The launcher escapes option values at the Swift bridge shell boundary, including paths with spaces.

From this worktree's root:

```sh
./scripts/ios-fastlane install
./scripts/ios-fastlane lanes
./scripts/ios-fastlane check
./scripts/ios-fastlane build
./scripts/ios-fastlane test 'destination:platform=iOS Simulator,id=YOUR_SIMULATOR_UDID'
```

`check` verifies the application target, bundle identifiers, screenshot target/source references/shared scheme, and loaded plugin. `build` compiles an unsigned simulator app. `test` executes the project's configured native tests on the specified simulator. Use `xcrun simctl list devices available` to find a UDID. Outputs and logs are in ignored `build/fastlane/`. Review logs locally before sharing.

Sporkd preparation generates its project with the installed XcodeGen CLI. DRX and Klutr use their checked-in projects; regenerate DRX with `xcodegen generate --spec apps/ios/project.yml` only when intentionally changing its project specification.

## Screenshot automation

The built-in `captureScreenshots` action runs a dedicated screenshot UI-test target and shared scheme. `SnapshotHelper.swift` is copied unchanged from pinned Fastlane 2.239.0. No screenshot plugin or image decoration dependency is needed.

```sh
./scripts/ios-fastlane screenshots
# Optional: choose another supported device type and installed runtime
./scripts/ios-fastlane screenshots device_type:com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro-Max runtime:com.apple.CoreSimulator.SimRuntime.iOS-27-0
```

The lane selects the latest installed iOS runtime by default, creates a uniquely named fresh simulator, and deletes only that task-owned simulator after a successful run. Existing simulators and app data are not erased or reinstalled. A failed Swift bridge may leave the disposable simulator behind; its Fastlane-prefixed name and UDID are printed during creation for targeted cleanup. Images go to a unique `build/fastlane/screenshots/` run directory, with a local HTML overview. No images are uploaded.

Capture scope: DRX welcome/sign-in/create-account screens; Klutr's three onboarding pages; Sporkd Today/Library/Shop/Cook with its existing in-memory `-visual-fixtures` recipe. Assertions wait for visible landmarks before capture. These are review artifacts from this branch, not claims that features are released. English is the initial supported capture language. Signed-in customer workflows are not captured.

An installed iOS simulator runtime is required. During setup, no runtime was installed and Xcode's download failed for insufficient internal disk space (at least 8.05 GB required). Actual screenshot execution remains unverified until that prerequisite is fixed.

## Local archive

First resolve the marketing version and next build number against the canonical repository version and current App Store Connect history. Supply the approved release runtime settings through an external xcconfig, using the existing platform configuration keys. Keep that file outside Git and use the approved secret manager. Fastlane does not synthesize production credentials or copy Xcode Cloud defaults.

```sh
./scripts/ios-fastlane archive version:X.Y.Z build_number:NUMBER xcconfig:/absolute/private/Release.xcconfig
```

This builds and exports locally using existing signing certificates/profiles. It does not create signing assets or enable provisioning updates. The build number/version are build overrides; tracked project files are not incremented. The xcconfig must configure the actual approved backend, authentication, and telemetry for this build. Archive/export success alone does not validate these service settings, privacy, signed-device behavior, or launch readiness.

The local lanes disable automatic Sentry build-phase uploads. Symbol upload is an explicit separate action. Existing CI behavior is unchanged.

## Explicit uploads

Complete the repository release gates, authenticated/device checks, archive configuration validation, and obtain action-time release approval first. `approved:true` records the operator's explicit invocation; it is not a replacement for those checks.

Inject `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, and `APP_STORE_CONNECT_KEY_FILE` (an external .p8 path) from the approved secret manager. The IPA bundle identifier is checked before any Apple authentication.

```sh
./scripts/ios-fastlane betaupload approved:true ipa:/absolute/path/DRXApp-NUMBER.ipa
```

This only uploads the IPA; it does not submit for review or distribute to external groups, and does not send external tester notifications. Processing is not awaited: verify processing and tester availability separately in App Store Connect.

For Sentry, inject `SENTRY_AUTH_TOKEN`, `SENTRY_ORG_SLUG`, and `SENTRY_PROJECT_SLUG` for the existing DRX project. Project slugs are explicit to avoid routing symbols to another app.

```sh
./scripts/ios-fastlane symbols approved:true path:/absolute/path/archive.xcarchive/dSYMs
```

The plugin uploads debugging symbols with source-file inclusion disabled. Do not point it at a repository, captures, recipes, customer records, or an unrestricted artifact directory. No Sentry project creation, release publication, or build distribution is configured.

## App Store Connect authentication and privacy details

[API-key authentication](https://docs.fastlane.tools/app-store-connect-api/) is used for TestFlight. Key creation, role changes and signing-asset creation are outside this setup. Use the existing least-privilege key for the intended app. The Swift `appStoreConnectApiKey` action stores the key in Fastlane's lane context; `uploadToTestflight` consumes that shared value.

The [privacy-details action](https://docs.fastlane.tools/uploading-app-privacy-details/) does **not** support API keys. It requires Apple-ID authentication with sufficient privileges even when saving a draft. After configuring `FASTLANE_USER`, an operator can answer the questionnaire:

```sh
./scripts/ios-fastlane privacydraft
```

This authenticates and reads the app, then saves `build/fastlane/app_privacy_details.draft.json` with `skipUpload` and `skipPublish` fixed to true. No answers are prefilled, and no privacy upload lane is provided. Review actual data collection, SDK behavior, manifests and approved policy before separately authorizing any declaration upload. Installing this workflow does not change privacy disclosures.

## Plugin selection

Researched 2026-09-06 00:47 ET against the [available plugin catalog](https://docs.fastlane.tools/plugins/available-plugins/), upstream repositories and RubyGems metadata.

| Candidate | Decision | Reason |
| --- | --- | --- |
| [Official Sentry](https://github.com/getsentry/sentry-fastlane-plugin) | Install 2.6.3 | Existing Sentry integration needs reproducible dSYM upload; vendor maintained, released September 3, 2026. |
| [XcodeGen plugin](https://github.com/NovatecConsulting/fastlane-plugin-xcodegen) | Do not install | Upstream archived July 31, 2025. Call existing XcodeGen CLI directly where required. |
| Versioning plugins | Do not install | Repository version authority and Apple build counters already exist; independent increments could desynchronize platforms. |
| Firebase App Distribution / App Center | Do not install | These projects use Apple distribution; adding a second provider is outside their approved workflow. |
| Badge / screenshot decoration | Do not install | No current need; icon mutation would add brand and artifact changes. |
| Additional test runners | Defer | Native tests can run through Fastlane's built-in `run_tests`; no verified need for another runner. |

The [built-in actions catalog](https://docs.fastlane.tools/actions/) supplies builds, tests, screenshots, API authentication and TestFlight upload. The [Swift guide](https://docs.fastlane.tools/getting-started/ios/fastlane-swift/) confirms built-in and plugin support while labeling the Swift runner beta. The [beta deployment guide](https://docs.fastlane.tools/getting-started/ios/beta-deployment/) informs the archive/upload split and provider-derived build-number prerequisite. Plugins are managed through [Pluginfile and Bundler](https://docs.fastlane.tools/plugins/using-plugins/).

## Rollback and verification

Remove the scoped Fastlane/Gemfile/launcher/docs and screenshot target/scheme changes from the feature branch to roll back. Preserve existing native source and signing settings. The global user gem may remain installed harmlessly; this setup does not change Homebrew's managed installation.

The Swift lane overrides `onError` to stop immediately after action failures. Fastlane 2.239.0 may append a socket-disconnect stack trace after the original validation error; the lane exits nonzero and does not continue into authentication or upload. Automatic GitHub error lookup is disabled in the launcher. A small project-local Ruby entrypoint raises the beta bridge connection timeout from five to thirty seconds to tolerate slow process startup on external volumes. Homebrew and generated runner source remain unchanged.

See the linked Linear issue for executed checks and unresolved gates. No production, TestFlight, Sentry upload, notification, or signed-device result is claimed by installing the tooling.
