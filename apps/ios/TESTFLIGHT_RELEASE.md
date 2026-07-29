# Manual TestFlight Release Checklist

TestFlight group membership is the only beta admission mechanism. PostHog and Sentry provide observability and do not decide who can use the app.

1. Confirm the Release configuration uses production Clerk, API, PostHog, and Sentry values supplied through Xcode Cloud/Doppler.
2. Run unit and UI tests, build the Release configuration, and archive in Xcode Cloud.
3. Verify the uploaded build has symbol files and that a deliberate test error is symbolicated in Sentry with the correct release and build.
4. Sign in as a provisioned Clerk operator and verify all modules allowed by normal roles and permissions are reachable without a PostHog decision.
5. Confirm PostHog lifecycle and screen events use the same Clerk user ID as the web app and include `distribution_channel=testflight`.
6. Sign out, switch users, and confirm both PostHog and Sentry identity are cleared before the next user is identified.
7. Inspect telemetry for customer, payment, token, cookie, authorization, form, and request-body data before expanding distribution.
8. Add the build to the selected internal TestFlight group, complete smoke testing, then manually add the same approved build to the selected external group.

Do not automate TestFlight group promotion or rollback. After an incident, resolve it, upload a new build if needed, and manually adjust group membership.
