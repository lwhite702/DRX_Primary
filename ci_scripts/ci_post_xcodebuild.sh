#!/bin/zsh
set -euo pipefail
SCRIPT_DIR="${0:A:h}"
REPO_ROOT="${SCRIPT_DIR:h}"
exec "${REPO_ROOT}/apps/ios/ci_scripts/ci_post_xcodebuild.sh" "$@"
