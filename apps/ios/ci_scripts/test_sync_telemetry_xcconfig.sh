#!/bin/zsh

set -euo pipefail

SCRIPT_DIR="${0:A:h}"
SYNC_SCRIPT="${SCRIPT_DIR}/sync_telemetry_xcconfig.sh"
TEST_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/drx-telemetry.XXXXXX")"
trap 'rm -rf -- "${TEST_ROOT}"' EXIT

run_sync() {
  local output="$1"
  shift
  env -i \
    PATH="/usr/bin:/bin:/usr/sbin:/sbin" \
    DRX_TELEMETRY_XCCONFIG_OUTPUT="${output}" \
    "$@" \
    /bin/zsh "${SYNC_SCRIPT}" --require-all >/dev/null 2>&1
}

local_output="${TEST_ROOT}/local.xcconfig"
env -i \
  PATH="/usr/bin:/bin:/usr/sbin:/sbin" \
  DRX_TELEMETRY_XCCONFIG_OUTPUT="${local_output}" \
  /bin/zsh "${SYNC_SCRIPT}" >/dev/null

grep -q '^POSTHOG_API_KEY = DISABLED$' "${local_output}"
grep -q '^SENTRY_DSN = $' "${local_output}"

missing_output="${TEST_ROOT}/missing.xcconfig"
if run_sync "${missing_output}"; then
  echo "Expected strict telemetry generation to reject missing values"
  exit 1
fi
[[ ! -e "${missing_output}" ]]

invalid_output="${TEST_ROOT}/invalid.xcconfig"
if run_sync "${invalid_output}" \
  POSTHOG_API_KEY="invalid" \
  POSTHOG_HOST="http://example.test" \
  SENTRY_DSN="http://public@example.test/1"; then
  echo "Expected strict telemetry generation to reject malformed values"
  exit 1
fi
[[ ! -e "${invalid_output}" ]]

valid_output="${TEST_ROOT}/valid.xcconfig"
run_sync "${valid_output}" \
  POSTHOG_API_KEY="phc_example" \
  POSTHOG_HOST="https://us.i.posthog.com" \
  SENTRY_DSN="https://public@example.test/1"

grep -q '^POSTHOG_API_KEY = phc_example$' "${valid_output}"
grep -q '^POSTHOG_HOST = https:/\$()/us.i.posthog.com$' "${valid_output}"
grep -q '^SENTRY_DSN = https:/\$()/public@example.test/1$' "${valid_output}"

echo "Native telemetry configuration checks passed"
