#!/usr/bin/env bash
set -euo pipefail

echo "🤖 [Android Native E2E] Starting Android build & emulator verification..."
export JAVA_HOME="/opt/homebrew/opt/openjdk@21"
ADB="$HOME/Library/Android/sdk/platform-tools/adb"
EMULATOR="$HOME/Library/Android/sdk/emulator/emulator"
APP_ID="com.blockblast.star"

# 1. Sync & Build Debug APK
npm run cap:sync
(cd android && ./gradlew assembleDebug)
APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"

# 2. Boot Emulator if not running
if ! "$ADB" get-state >/dev/null 2>&1; then
  AVD=$("$EMULATOR" -list-avds | head -n 1)
  if [ -z "$AVD" ]; then
    echo "❌ No Android AVD found!"
    exit 1
  fi
  echo "🚀 Booting Android AVD: $AVD..."
  nohup "$EMULATOR" -avd "$AVD" -no-audio -no-boot-anim >/dev/null 2>&1 &
  "$ADB" wait-for-device
  while [ "$("$ADB" shell getprop sys.boot_completed | tr -d '\r')" != "1" ]; do
    sleep 2
  done
fi

# 3. Install & Launch App
"$ADB" logcat -c
"$ADB" install -r "$APK_PATH"
"$ADB" shell pm clear "$APP_ID"
"$ADB" shell am start -W -n "$APP_ID/.MainActivity"
sleep 4

# 4. Verify Process is Alive
PID=$("$ADB" shell pidof "$APP_ID" | tr -d '\r' || true)
if [ -z "$PID" ]; then
  echo "❌ Android app process failed to start or crashed!"
  exit 1
fi

# 5. Simulate Touch Drag from Dock to Board & Modal Taps
"$ADB" shell input swipe 540 1900 540 1100 350
sleep 2

# 6. Check Logcat for Fatal Crashes or Uncaught JS Errors
CRASH_LOGS=$("$ADB" logcat -d | grep -E "FATAL EXCEPTION|Uncaught TypeError|Uncaught ReferenceError" || true)
if [ -n "$CRASH_LOGS" ]; then
  echo "❌ Fatal or Uncaught errors detected in logcat:"
  echo "$CRASH_LOGS"
  exit 1
fi

# 7. Capture & Verify Screenshot
mkdir -p build-artifacts/test-reports
"$ADB" exec-out screencap -p > build-artifacts/test-reports/android_e2e_smoke.png
node scripts/verify-screenshot.mjs build-artifacts/test-reports/android_e2e_smoke.png

echo "✅ [Android Native E2E] All checks passed!"
