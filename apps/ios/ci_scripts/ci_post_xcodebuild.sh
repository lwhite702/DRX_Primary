#!/bin/zsh

set -euo pipefail

echo "Deelrx CRM Xcode Cloud action completed"
echo "Product: ${CI_PRODUCT:-unknown}"
echo "Platform: ${CI_PRODUCT_PLATFORM:-unknown}"
echo "Build number: ${CI_BUILD_NUMBER:-local}"

if [[ -n "${CI_XCODEBUILD_EXIT_CODE:-}" ]]; then
  echo "xcodebuild exit code: ${CI_XCODEBUILD_EXIT_CODE}"
fi

if [[ "${CI_XCODEBUILD_EXIT_CODE:-0}" != "0" || -z "${CI_ARCHIVE_PATH:-}" ]]; then
  exit 0
fi

if [[ -z "${SENTRY_AUTH_TOKEN:-}" ]]; then
  echo "error: SENTRY_AUTH_TOKEN is required to upload release symbols"
  exit 1
fi

export SENTRY_ORG="${SENTRY_ORG:-wrelik-0y}"
export SENTRY_PROJECT="${SENTRY_PROJECT:-deelrx-mobile}"
release="com.wrelik.drx@${MARKETING_VERSION:-0.0.0}+${CURRENT_PROJECT_VERSION:-${CI_BUILD_NUMBER:-0}}"

sentry-cli releases new "${release}" || true
sentry-cli debug-files upload --include-sources "${CI_ARCHIVE_PATH}/dSYMs"
sentry-cli releases finalize "${release}"
sentry-cli releases deploys "${release}" new -e "${DRX_APP_ENVIRONMENT:-production}"

echo "Uploaded Sentry symbols for ${release} (${SENTRY_ORG}/${SENTRY_PROJECT})"
