#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

plutil -lint SweetRun.xcodeproj/project.pbxproj >/dev/null
plutil -lint SweetRun/Info.plist >/dev/null
if command -v xmllint >/dev/null 2>&1; then
  xmllint --noout SweetRun.xcodeproj/xcshareddata/xcschemes/SweetRun.xcscheme
else
  grep -q "<Scheme" SweetRun.xcodeproj/xcshareddata/xcschemes/SweetRun.xcscheme
fi

if command -v xcrun >/dev/null 2>&1; then
  while IFS= read -r file; do
    xcrun swiftc -parse "$file" >/dev/null
  done < <(find SweetRun -name '*.swift' -type f | sort)
fi

echo "Sweet Run iOS project static checks OK."
