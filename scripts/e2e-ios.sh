#!/usr/bin/env bash
set -euo pipefail

echo "🍎 [iOS Native E2E] Starting iOS build & simulator verification..."
APP_ID="com.blockblast.star"
DERIVED_DATA="ios/App/build"

# 1. Sync & Build iOS App with deterministic DerivedData path
npm run cap:sync:ios
xcodebuild -project ios/App/App.xcodeproj \
  -scheme App \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath "$DERIVED_DATA" \
  build CODE_SIGNING_ALLOWED=NO -quiet

APP_BUNDLE="$DERIVED_DATA/Build/Products/Debug-iphonesimulator/App.app"
if [ ! -d "$APP_BUNDLE" ]; then
  echo "❌ Built App.app not found at $APP_BUNDLE"
  exit 1
fi

# 2. Find or Boot iPhone Simulator
SIM_UDID=$(xcrun simctl list devices available | grep -E "iPhone.*\(Booted\)" | head -n 1 | sed -E 's/.*\(([0-9A-F-]+)\).*/\1/' || true)
if [ -z "$SIM_UDID" ]; then
  SIM_UDID=$(xcrun simctl list devices available | grep -E "iPhone" | head -n 1 | sed -E 's/.*\(([0-9A-F-]+)\).*/\1/')
  if [ -z "$SIM_UDID" ]; then
    echo "❌ No available iPhone Simulator found!"
    exit 1
  fi
  echo "🚀 Booting iOS Simulator ($SIM_UDID)..."
  xcrun simctl boot "$SIM_UDID"
  xcrun simctl bootstatus "$SIM_UDID" -b
fi

# 3. Install & Launch App
xcrun simctl terminate "$SIM_UDID" "$APP_ID" >/dev/null 2>&1 || true
xcrun simctl uninstall "$SIM_UDID" "$APP_ID" >/dev/null 2>&1 || true
xcrun simctl install "$SIM_UDID" "$APP_BUNDLE"
LAUNCH_OUT=$(xcrun simctl launch "$SIM_UDID" "$APP_ID")
echo "Launched: $LAUNCH_OUT"
sleep 5

# 4. Check Simulator Logs for WebKit / JS Crashes
IOS_ERRORS=$(xcrun simctl spawn "$SIM_UDID" log show --predicate 'process == "App" and (composedMessage contains "Uncaught" or composedMessage contains "Fatal error")' --last 1m | grep -E "Uncaught|Fatal error" || true)
if [ -n "$IOS_ERRORS" ]; then
  echo "❌ iOS runtime errors detected:"
  echo "$IOS_ERRORS"
  exit 1
fi

# 5. Capture & Verify Screenshot (prevents blank white screen & safe-area regressions)
mkdir -p build-artifacts/test-reports
xcrun simctl io "$SIM_UDID" screenshot build-artifacts/test-reports/ios_e2e_smoke.png
node scripts/verify-screenshot.mjs build-artifacts/test-reports/ios_e2e_smoke.png

echo "✅ [iOS Native E2E] All checks passed!"
