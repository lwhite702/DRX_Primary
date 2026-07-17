#!/bin/zsh

set -euo pipefail

if [[ "${CONFIGURATION:-}" != "Release" && "${CI_XCODEBUILD_ACTION:-}" != "archive" ]]; then
  exit 0
fi

missing=()
for name in POSTHOG_API_KEY SENTRY_DSN SENTRY_AUTH_TOKEN; do
  if [[ -z "${(P)name:-}" ]]; then
    missing+=("${name}")
  fi
done

if (( ${#missing[@]} > 0 )); then
  echo "error: Missing required Xcode Cloud environment variables: ${missing[*]}"
  exit 1
fi

echo "Release telemetry configuration is present (values intentionally hidden)."
