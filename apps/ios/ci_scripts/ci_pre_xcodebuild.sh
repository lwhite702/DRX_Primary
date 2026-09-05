#!/bin/zsh

set -euo pipefail

if [[ "${CONFIGURATION:-}" != "Release" && "${CI_XCODEBUILD_ACTION:-}" != "archive" ]]; then
  exit 0
fi

SCRIPT_DIR="${0:A:h}"

# A distributable build must never inherit the local-development telemetry
# stubs produced during project generation.
"${SCRIPT_DIR}/sync_telemetry_xcconfig.sh" --require-all

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
