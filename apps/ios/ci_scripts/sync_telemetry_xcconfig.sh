#!/bin/zsh

set -euo pipefail

SCRIPT_DIR="${0:A:h}"
IOS_ROOT="${SCRIPT_DIR:h}"
OUTPUT="${IOS_ROOT}/Configuration/Telemetry.generated.xcconfig"

posthog_key="${POSTHOG_API_KEY:-${NEXT_PUBLIC_POSTHOG_KEY:-${EXPO_PUBLIC_POSTHOG_API_KEY:-}}}"
posthog_host="${POSTHOG_HOST:-${NEXT_PUBLIC_POSTHOG_HOST:-${EXPO_PUBLIC_POSTHOG_HOST:-https://us.i.posthog.com}}}"
sentry_dsn="${SENTRY_IOS_DSN:-${SENTRY_DSN:-${NEXT_PUBLIC_SENTRY_DSN:-}}}"

missing=()
[[ -z "${posthog_key}" ]] && missing+=("POSTHOG_API_KEY/NEXT_PUBLIC_POSTHOG_KEY")
[[ -z "${posthog_host}" ]] && missing+=("POSTHOG_HOST/NEXT_PUBLIC_POSTHOG_HOST")
[[ -z "${sentry_dsn}" ]] && missing+=("SENTRY_IOS_DSN/SENTRY_DSN")

if (( ${#missing[@]} > 0 )); then
  echo "error: Missing native telemetry values: ${missing[*]}"
  exit 1
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
