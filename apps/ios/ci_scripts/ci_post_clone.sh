#!/bin/zsh

set -euo pipefail

SCRIPT_DIR="${0:A:h}"
IOS_ROOT="${SCRIPT_DIR:h}"

echo "Preparing Deelrx CRM for Xcode Cloud"
echo "Repository: ${CI_PRIMARY_REPOSITORY_PATH:-unknown}"
echo "Xcode: $(xcodebuild -version | tr '\n' ' ')"

if ! command -v xcodegen >/dev/null 2>&1; then
  echo "Installing XcodeGen"
  brew install xcodegen
fi

cd "${IOS_ROOT}"
xcodegen generate

xcodebuild \
  -resolvePackageDependencies \
  -project DRXApp.xcodeproj \
  -scheme DRXApp

echo "Deelrx CRM project generation and package resolution completed"
