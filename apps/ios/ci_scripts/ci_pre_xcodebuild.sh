#!/bin/zsh

set -euo pipefail

if [[ "${CONFIGURATION:-}" != "Release" && "${CI_XCODEBUILD_ACTION:-}" != "archive" ]]; then
  exit 0
fi

missing=()
for name in SENTRY_AUTH_TOKEN SENTRY_ORG SENTRY_PROJECT; do
  if [[ -z "${(P)name:-}" ]]; then
    missing+=("${name}")
  fi
done

if [[ ! -s "${CI_PRIMARY_REPOSITORY_PATH:-${PWD}}/apps/ios/Configuration/Telemetry.generated.xcconfig" &&
      ! -s "${PWD}/Configuration/Telemetry.generated.xcconfig" ]]; then
  missing+=("Telemetry.generated.xcconfig")
fi

if (( ${#missing[@]} > 0 )); then
  echo "error: Missing required Xcode Cloud environment variables: ${missing[*]}"
  exit 1
fi

echo "Release telemetry configuration is present (values intentionally hidden)."
