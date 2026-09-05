#!/bin/zsh

set -euo pipefail

SCRIPT_DIR="${0:A:h}"
IOS_ROOT="${SCRIPT_DIR:h}"
OUTPUT="${DRX_TELEMETRY_XCCONFIG_OUTPUT:-${IOS_ROOT}/Configuration/Telemetry.generated.xcconfig}"

require_all=false
if [[ "${1:-}" == "--require-all" ]]; then
  require_all=true
elif [[ -n "${1:-}" ]]; then
  echo "error: Usage: sync_telemetry_xcconfig.sh [--require-all]"
  exit 2
fi

posthog_key="${POSTHOG_API_KEY:-${NEXT_PUBLIC_POSTHOG_KEY:-${EXPO_PUBLIC_POSTHOG_API_KEY:-}}}"
posthog_host="${POSTHOG_HOST:-${NEXT_PUBLIC_POSTHOG_HOST:-${EXPO_PUBLIC_POSTHOG_HOST:-https://us.i.posthog.com}}}"
sentry_dsn="${SENTRY_IOS_DSN:-${SENTRY_DSN:-${NEXT_PUBLIC_SENTRY_DSN:-}}}"

missing=()
[[ -z "${posthog_key}" ]] && missing+=("POSTHOG_API_KEY/NEXT_PUBLIC_POSTHOG_KEY")
[[ -z "${posthog_host}" ]] && missing+=("POSTHOG_HOST/NEXT_PUBLIC_POSTHOG_HOST")
[[ -z "${sentry_dsn}" ]] && missing+=("SENTRY_IOS_DSN/SENTRY_DSN")

invalid=()
[[ -n "${posthog_key}" && "${posthog_key}" != phc_* ]] && invalid+=("POSTHOG_API_KEY")
[[ -n "${posthog_host}" && ! "${posthog_host}" =~ '^https://[^/[:space:]]+(/.*)?$' ]] && invalid+=("POSTHOG_HOST")
[[ -n "${sentry_dsn}" && ! "${sentry_dsn}" =~ '^https://[^/[:space:]]+(/.*)?$' ]] && invalid+=("SENTRY_IOS_DSN/SENTRY_DSN")

if [[ "${require_all}" == true && (( ${#missing[@]} > 0 || ${#invalid[@]} > 0 )) ]]; then
  (( ${#missing[@]} > 0 )) && echo "error: Missing required native telemetry variables: ${missing[*]}"
  (( ${#invalid[@]} > 0 )) && echo "error: Invalid required native telemetry variables: ${invalid[*]}"
  echo "error: Refusing to prepare a release/archive with disabled telemetry."
  exit 1
fi

if (( ${#missing[@]} > 0 || ${#invalid[@]} > 0 )); then
  (( ${#missing[@]} > 0 )) && echo "warning: Missing native telemetry env vars: ${missing[*]}"
  (( ${#invalid[@]} > 0 )) && echo "warning: Invalid native telemetry env vars: ${invalid[*]}"
  echo "warning: Analytics/crash reporting will be disabled in this build."
  # Write safe stubs so local development can proceed without initializing SDKs.
  posthog_key="DISABLED"
  posthog_host="${posthog_host:-https://us.i.posthog.com}"
  sentry_dsn=""
fi

escape_url_for_xcconfig() {
  print -r -- "$1" | sed 's#://#:/\$()/#'
}

umask 077
temporary="${OUTPUT}.tmp"
{
  print -r -- "// Generated from the build environment. Do not commit."
  print -r -- "POSTHOG_API_KEY = ${posthog_key}"
  print -r -- "POSTHOG_HOST = $(escape_url_for_xcconfig "${posthog_host}")"
  print -r -- "SENTRY_DSN = $(escape_url_for_xcconfig "${sentry_dsn}")"
} > "${temporary}"
mv "${temporary}" "${OUTPUT}"

echo "Generated native Sentry/PostHog build settings (values hidden)."
