#!/bin/zsh

set -u

echo "Deelrx CRM Xcode Cloud action completed"
echo "Product: ${CI_PRODUCT:-unknown}"
echo "Platform: ${CI_PRODUCT_PLATFORM:-unknown}"
echo "Build number: ${CI_BUILD_NUMBER:-local}"

if [[ -n "${CI_XCODEBUILD_EXIT_CODE:-}" ]]; then
  echo "xcodebuild exit code: ${CI_XCODEBUILD_EXIT_CODE}"
fi
