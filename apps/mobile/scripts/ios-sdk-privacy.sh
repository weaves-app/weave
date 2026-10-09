#!/bin/sh
set -eu
MOBILE_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
LOGGER_SOURCE=${1:-"$MOBILE_ROOT/vendor/clerk-ios/Sources/ClerkKit/Logging/ClerkLogger.swift"}
PROBE_DIR=$(mktemp -d "${TMPDIR:-/tmp}/weave-ios-privacy.XXXXXX")
trap 'rm -rf "$PROBE_DIR"' EXIT
swiftc -package-name WeavePrivacy -D WEAVE_LOGGER_PROBE -parse-as-library -module-cache-path "$PROBE_DIR/cache" \
  "$LOGGER_SOURCE" \
  "$MOBILE_ROOT/ios/WeaveTests/ClerkLoggingPrivacyProbe.swift" -o "$PROBE_DIR/privacy-probe"
"$PROBE_DIR/privacy-probe"
