# Deelrx CRM Xcode Cloud and TestFlight

## Repository configuration

- App name: `Deelrx CRM`
- Bundle ID: `com.wrelik.drx`
- Scheme: `DRXApp`
- Project: `apps/ios/DRXApp.xcodeproj`
- Release configuration: `Release`
- Minimum iOS version: iOS 17
- Signing: Automatic, Apple team `L8R42BJ54K`
- Version: `0.5.7`
- Build number: Xcode Cloud `CI_BUILD_NUMBER`

Xcode Cloud runs the scripts in `apps/ios/ci_scripts`. The post-clone script
installs XcodeGen when needed, writes an ignored
`Telemetry.generated.xcconfig` from the build environment, regenerates the
project, and resolves Swift packages. The pre-build script validates telemetry
and symbol-upload configuration.

## One-time App Store Connect setup

1. In App Store Connect, create or confirm an iOS app named **Deelrx CRM** with
   bundle ID `com.wrelik.drx`.
2. In Xcode, open `apps/ios/DRXApp.xcodeproj` and select the `DRXApp` scheme.
3. Open the Report navigator, select the Cloud tab, and choose **Get Started**.
4. Select the Deelrx CRM product and connect the `lwhite702/DRX_Primary`
   repository.
5. Set the project path to `apps/ios/DRXApp.xcodeproj` if Xcode does not detect
   it automatically.

## Workflow: Deelrx CRM TestFlight

Configure the workflow with these values:

- Start condition: branch changes on `main`.
- Environment: latest released macOS and Xcode versions.
- Scheme: `DRXApp`.
- Test action: iOS Simulator, latest available iPhone, `DRXAppTests` and
  `DRXAppUITests`.
- Archive action: iOS, scheme `DRXApp`.
- Deployment preparation: **TestFlight and App Store**.
- Post-action: distribute to the internal TestFlight group.

Do not enable automatic external distribution until Beta App Review details,
privacy answers, export compliance, and tester notes are complete.

## Required Xcode Cloud environment variables

Sync these from Doppler's `drx/prd` configuration and mark them secret:

- `SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT` (must be the project that issued `SENTRY_DSN`)
- `POSTHOG_API_KEY`
- `POSTHOG_HOST`

For a local Release build, generate the same ignored file first:

```sh
doppler run --project drx --config prd -- apps/ios/ci_scripts/sync_telemetry_xcconfig.sh
```

The Clerk publishable key is public client configuration and is already supplied
by the Release xcconfig. Never add `CLERK_SECRET_KEY`, database credentials, or
server-only API keys to the iOS build.

## Verification before external testing

1. Confirm the Xcode Cloud Test action passes.
2. Confirm the Archive action reports successful signing and upload.
3. Wait for App Store Connect build processing to finish.
4. Open TestFlight, complete export-compliance prompts, and add internal testers.
5. Install the build on a physical iPhone and verify Clerk sign-in, session
   bootstrap, sign-out, and relaunch session restoration.
