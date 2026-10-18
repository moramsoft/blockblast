#!/usr/bin/env bash
set -euo pipefail

IPAD_UDID="00008132-000919623E39001C"
DERIVED_DATA="ios/App/build"
APP_BUNDLE="$DERIVED_DATA/Build/Products/Debug-iphoneos/App.app"

echo "🍎 [iPad Installer] Syncing latest web assets to iOS..."
npm run cap:sync:ios

echo "🔨 [iPad Installer] Building signed iOS/iPadOS binary (Team: 2KH45M6H2B)..."
# Try building with com.blockblast.star first; if Personal Team 3-profile limit blocks new App ID,
# fall back to the active provisioned slot (com.moramsoft.morningporch.uitests) for Seunghwan's iPad.
if xcodebuild -project ios/App/App.xcodeproj \
  -scheme App \
  -destination 'generic/platform=iOS' \
  -derivedDataPath "$DERIVED_DATA" \
  -allowProvisioningUpdates \
  build -quiet 2>/dev/null; then
  BUNDLE_ID="com.blockblast.star"
  echo "✅ Signed with primary bundle ID: $BUNDLE_ID"
else
  BUNDLE_ID="com.moramsoft.morningporch.uitests"
  echo "ℹ️  Using active provisioned profile slot ($BUNDLE_ID) for Seunghwan's iPad..."
  xcodebuild -project ios/App/App.xcodeproj \
    -scheme App \
    -destination 'generic/platform=iOS' \
    -derivedDataPath "$DERIVED_DATA" \
    PRODUCT_BUNDLE_IDENTIFIER="$BUNDLE_ID" \
    build -quiet
  echo "✅ Signed physical device binary at: $APP_BUNDLE"
fi

echo "📲 [iPad Installer] Checking connection to Seunghwan's iPad ($IPAD_UDID)..."
DEVICE_STATE=$(xcrun devicectl list devices | grep "$IPAD_UDID" | awk '{print $4}' || true)

if [ "$DEVICE_STATE" = "unavailable" ] || [ -z "$DEVICE_STATE" ]; then
  echo "⚠️  Seunghwan's iPad ($IPAD_UDID) is currently 'unavailable' (offline/unplugged/locked)."
  echo "👉 아이패드 USB 케이블을 맥미니에 연결하고 화면 잠금을 해제한 뒤 다시 'npm run install:ipad'를 실행해 주세요!"
  exit 1
fi

echo "🚀 Installing Block Blast Star onto Seunghwan's iPad..."
rm -rf /tmp/BlockBlastStar.app
cp -R "$APP_BUNDLE" /tmp/BlockBlastStar.app
xcrun devicectl device install app --device "$IPAD_UDID" /tmp/BlockBlastStar.app
xcrun devicectl device process launch --device "$IPAD_UDID" "$BUNDLE_ID" || echo "ℹ️  아이패드 설정 > 일반 > VPN 및 기기 관리 > 개발자 앱(cromit@gmail.com)에서 '신뢰(Trust)'를 한 번 눌러주시면 바로 실행됩니다!"
echo "🎉 Block Blast Star has been installed on your iPad!"
