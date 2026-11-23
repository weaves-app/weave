#!/bin/sh
set -eu
MOBILE_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
"$MOBILE_ROOT/scripts/ios-sdk-privacy.sh"
if [ -z "${WEAVE_IOS_TEST_DESTINATION:-}" ]; then
  SIMULATOR_ID=$(xcrun simctl list devices available -j | python3 -c 'import json,sys; devices=[d for group in json.load(sys.stdin)["devices"].values() for d in group if d.get("isAvailable") and "iPhone" in d["name"]]; devices.sort(key=lambda d:d["state"]!="Booted"); print(devices[0]["udid"] if devices else "")')
  if [ -z "$SIMULATOR_ID" ]; then
    echo 'No installed available iPhone simulator; set WEAVE_IOS_TEST_DESTINATION.' >&2
    exit 1
  fi
  WEAVE_IOS_TEST_DESTINATION="platform=iOS Simulator,id=$SIMULATOR_ID"
fi
RESULT_PATH="$MOBILE_ROOT/ios/build/native-contracts.xcresult"
rm -rf "$RESULT_PATH"
xcodebuild -workspace "$MOBILE_ROOT/ios/Weave.xcworkspace" -scheme Weave \
  -configuration Debug -destination "$WEAVE_IOS_TEST_DESTINATION" \
  -derivedDataPath "$MOBILE_ROOT/ios/build" -resultBundlePath "$RESULT_PATH" \
  -disableAutomaticPackageResolution -onlyUsePackageVersionsFromResolvedFile \
  CODE_SIGNING_ALLOWED=NO test
