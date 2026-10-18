#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-all}" # all | android | ios | quick

echo "========================================================"
echo "🛡️  BLOCK BLAST STAR — MANDATORY RELEASE GATE HARNESS"
echo "========================================================"

echo "▶ [Gate 1/4] TypeScript Typecheck, Build & Core Unit Tests..."
npx tsc --noEmit
npm run build
npm run test:unit

echo "▶ [Gate 2/4] Cross-Platform E2E Suite (Android Pixel 7 & iOS iPhone 15 Pro)..."
npx playwright test

if [ "$MODE" = "all" ] || [ "$MODE" = "android" ]; then
  echo "▶ [Gate 3/4] Android Native Emulator E2E Verification..."
  bash scripts/e2e-android.sh
fi

if [ "$MODE" = "all" ] || [ "$MODE" = "ios" ]; then
  echo "▶ [Gate 4/4] iOS Native Simulator E2E Verification..."
  bash scripts/e2e-ios.sh
fi

echo "========================================================"
echo "✅  ALL RELEASE GATES PASSED! SAFE TO RELEASE."
echo "========================================================"
