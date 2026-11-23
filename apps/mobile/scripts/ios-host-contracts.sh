#!/bin/sh
set -eu
MOBILE_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
CONTRACT_BUILD_PATH=${WEAVE_IOS_CONTRACT_BUILD_PATH:-"$MOBILE_ROOT/ios/build/host-contracts"}
export CLANG_MODULE_CACHE_PATH="$CONTRACT_BUILD_PATH/clang-cache"
export SWIFTPM_MODULECACHE_OVERRIDE="$CONTRACT_BUILD_PATH/swift-cache"
swift test --disable-sandbox --force-resolved-versions --package-path "$MOBILE_ROOT/ios" --scratch-path "$CONTRACT_BUILD_PATH"
