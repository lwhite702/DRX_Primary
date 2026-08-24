#!/bin/zsh

set -euo pipefail

if [[ "${CONFIGURATION:-}" != "Release" && "${CI_XCODEBUILD_ACTION:-}" != "archive" ]]; then
  exit 0
fi

SCRIPT_DIR="${0:A:h}"
IOS_ROOT="${SCRIPT_DIR:h}"

# Ensure Telemetry config exists
if [[ ! -s "${IOS_ROOT}/Configuration/Telemetry.generated.xcconfig" &&
      ! -s "${CI_PRIMARY_REPOSITORY_PATH:-${PWD}}/apps/ios/Configuration/Telemetry.generated.xcconfig" &&
      ! -s "${PWD}/Configuration/Telemetry.generated.xcconfig" ]]; then
  "${SCRIPT_DIR}/sync_telemetry_xcconfig.sh" || true
fi

missing=()
for name in SENTRY_AUTH_TOKEN SENTRY_ORG SENTRY_PROJECT; do
  if [[ -z "${(P)name:-}" ]]; then
    missing+=("${name}")
  fi
done

if (( ${#missing[@]} > 0 )); then
  echo "warning: Missing Sentry upload variables: ${missing[*]}. Sentry dSYM symbol upload will be skipped for this build."
else
  echo "Release telemetry and Sentry symbol configuration is present."
fi
