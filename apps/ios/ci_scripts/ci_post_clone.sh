#!/bin/zsh

set -euo pipefail

SCRIPT_DIR="${0:A:h}"
IOS_ROOT="${SCRIPT_DIR:h}"

echo "Preparing Deelrx CRM for Xcode Cloud"
echo "Repository: ${CI_PRIMARY_REPOSITORY_PATH:-unknown}"
echo "Xcode: $(xcodebuild -version | tr '\n' ' ')"

export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_INSTALL_CLEANUP=1

if ! command -v xcodegen >/dev/null 2>&1; then
  echo "Installing XcodeGen"
  brew install xcodegen || true
fi

if ! command -v sentry-cli >/dev/null 2>&1; then
  echo "Installing sentry-cli for release symbol upload"
  curl -sL https://sentry.io/get-cli/ | bash || brew install getsentry/tools/sentry-cli || true
fi

cd "${IOS_ROOT}"
"${SCRIPT_DIR}/sync_telemetry_xcconfig.sh"
xcodegen generate --spec project.yml

xcodebuild \
  -resolvePackageDependencies \
  -project DRXApp.xcodeproj \
  -scheme DRXApp

echo "Deelrx CRM project generation and package resolution completed"
