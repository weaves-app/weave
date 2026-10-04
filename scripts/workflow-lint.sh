#!/usr/bin/env bash
set -euo pipefail
archive=$(mktemp)
directory=$(mktemp -d)
trap 'rm -f "$archive"; rm -rf "$directory"' EXIT
case "$(uname -s)-$(uname -m)" in
  Linux-x86_64) platform=linux_amd64; checksum=8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8 ;;
  Linux-aarch64|Linux-arm64) platform=linux_arm64; checksum=325e971b6ba9bfa504672e29be93c24981eeb1c07576d730e9f7c8805afff0c6 ;;
  Darwin-arm64) platform=darwin_arm64; checksum=aba9ced2dee8d27fecca3dc7feb1a7f9a52caefa1eb46f3271ea66b6e0e6953f ;;
  Darwin-x86_64) platform=darwin_amd64; checksum=5b44c3bc2255115c9b69e30efc0fecdf498fdb63c5d58e17084fd5f16324c644 ;;
  *) echo 'Unsupported workflow-lint platform' >&2; exit 1 ;;
esac
curl --fail --silent --show-error --location "https://github.com/rhysd/actionlint/releases/download/v1.7.12/actionlint_1.7.12_${platform}.tar.gz" --output "$archive"
if command -v sha256sum >/dev/null 2>&1; then
  actual=$(sha256sum "$archive")
else
  actual=$(shasum -a 256 "$archive")
fi
if [[ "${actual%% *}" != "$checksum" ]]; then
  echo 'actionlint archive checksum mismatch' >&2; exit 1
fi
tar -xzf "$archive" -C "$directory" actionlint
"$directory/actionlint"
uvx 'zizmor@1.30.1' --offline --format=github .github
