#!/bin/zsh

set -euo pipefail

SCRIPT_DIR="${0:A:h}"
IOS_ROOT="${SCRIPT_DIR:h}"

cd "${IOS_ROOT}"

if [[ -n "${CI_BUILD_NUMBER:-}" ]]; then
  echo "Applying Xcode Cloud build number ${CI_BUILD_NUMBER}"
  xcrun agvtool new-version -all "${CI_BUILD_NUMBER}"
fi

if ! grep -q "CLERK_PUBLISHABLE_KEY = pk_" Configuration/Release.xcconfig; then
  echo "Release Clerk publishable key is missing" >&2
  exit 1
fi

if ! grep -q "DRX_API_BASE_URL = https:" Configuration/Shared.xcconfig; then
  echo "Production API base URL is missing" >&2
  exit 1
fi

echo "Deelrx CRM release configuration validated"
