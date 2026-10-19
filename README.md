# Brain Bloom (Block Blast Star) 🌸⭐

> **Current Version**: `v1.0.1` (Android `versionCode: 2` / iOS `CURRENT_PROJECT_VERSION: 2`)  
> **Default Language**: English (Global Casual & Active Senior Friendly UX)

**Brain Bloom (Block Blast Star)**는 남녀노소 누구나—특히 액티브 시니어와 캐주얼 게이머도—직관적이고 편안하게 즐길 수 있도록 설계된 **8×8 블록 퍼즐 & 두뇌 트레이닝 게임**입니다. 웹 브라우저뿐만 아니라 Capacitor 기반의 **iOS / iPadOS 및 Android 네이티브 앱**으로 완벽하게 동작합니다.

---

## 🎮 게임 모드 (3 Game Modes)

1. **🍵 Relaxed Mode (추천 / 힐링 모드)**:
   - 시간 제한과 게임 오버 압박이 없는 무스트레스 힐링 모드입니다.
   - **Undo(되돌리기)** 및 **Hint(최적 위치 추천)**가 무제한 무료(`Free`)로 제공됩니다.
   - 놓을 수 있는 블록이 없을 경우 자동으로 배치 가능한 블록으로 보정해주며, 모든 부스터(Shuffle, Hammer, Rotate)도 자유롭게 사용할 수 있습니다.
2. **🏆 Classic Mode (하이스코어 챌린지)**:
   - 전통적인 8×8 블록 퍼즐 모드로, 연속 콤보와 올클리어 보너스를 통해 최고 점수에 도전합니다.
   - 위기 상황 시 보유한 코인과 부스터를 전략적으로 활용하여 기록을 경신합니다.
3. **📅 Daily Puzzle (오늘의 퍼즐)**:
   - 매일 고유한 시드(Seed)로 생성되는 맞춤형 보드에서 보석(Gem) 수집 목표를 달성하는 일일 챌린지입니다.
   - 공정한 도전을 위해 부스터가 잠금 처리되며, 클리어 시 일일 스트릭(Streak)과 코인 보상을 획득합니다.

---

## ✨ 핵심 메커니즘 & 시니어 친화 UX

### 1. 3-Move 콤보 그레이스 윈도우 (Combo Grace Window)
- 라인을 클리어하지 못하는 블록을 놓더라도 즉시 콤보가 끊기지 않고 **3턴의 유예 기회(🔥🔥🔥)**가 유지됩니다.
- 유예 기회가 1턴 남았을 때는 심장박동 경고 애니메이션(`warning`)으로 직관적인 피드백을 주며, 라인 클리어 성공 시 즉시 3턴으로 재충전됩니다.
- **올클리어 보너스 (All-Clear)**: 8×8 보드의 모든 블록을 비우면 **+300점 & +100 코인** 보너스가 지급됩니다.

### 2. 하단 5종 3D 메달리온 도구 & 부스터 바 (Long-Press 설명 툴팁 지원)
하단 엄지 영역(Thumb Zone)에 배치된 5개의 입체 3D 토이 메달리온 버튼을 제공합니다.  
어느 버튼이든 **약 450ms 동안 꾹 누르고 있으면(Long-Press)** 아이템이 소모되지 않고 해당 아이콘의 3D 이미지·배지·영문 설명이 담긴 **말풍선 팝업 카드(`#boosterTooltip`)**가 나타납니다.

| 아이콘 | 이름 | 기능 설명 |
| :--- | :--- | :--- |
| ⏳ | **1-Step Undo** | 직전 블록 배치를 되돌립니다. (클래식 첫 5회 무료 / 릴랙스 무제한 무료, 이후 20🪙) |
| 💡 | **Smart Hint** | 라인 클리어 및 공간 효율이 가장 높은 최적의 배치 위치를 계산해 보드 위에 하이라이트합니다. |
| 🎲 | **Shuffle Hand** | 현재 독(Dock)의 블록 3개를 **100% 배치 가능한 블록 조합**으로 즉시 다시 뽑습니다. |
| 🔨 | **3×3 Blast Hammer** | 보드의 원하는 칸을 탭하면 주변 **3×3 영역(9칸)**의 블록을 시원하게 분쇄합니다. |
| 🧭 | **Rotate 90°** | 독(Dock)에 있는 블록을 탭하여 시계 방향으로 90° 회전시킵니다. |

### 3. 스마트 위기 구제 시스템 ("No Moves Left!" Rescue Flow)
- 더 이상 블록을 놓을 자리가 없을 때 플레이어가 보드 상황을 눈으로 먼저 인지할 수 있도록 **약 850ms의 상황 파악 딜레이**를 제공합니다.
- 이후 탄성 있는 스프링 팝업 애니메이션(`modalPopIn`)과 함께 익살스러운 만화풍 실망 효과음(**"뾰요용~"** 슬라이드 휘슬, Web Audio API 실시간 합성) 및 경고 햅틱이 재생됩니다.
- 회전 시 배치가 가능한지 사전 검증(`canRotateRescueHelp`)하여 코인 낭비를 방지하며, 100% 배치 가능한 블록을 지급하는 무료 응급 구제(Emergency Rescue) 및 부활(Revive) 기능을 지원합니다.

### 4. 반응형 레이아웃 & 비주얼 테마
- **수학적 정중앙 정렬 HUD**: 좌우 상단 버튼 개수와 무관하게 점수(`👑 최고점수`, `🪙 코인`, 메인 스코어)와 콤보/상태 배너, 8×8 보드 중앙축이 1px 오차 없이 수직 정렬됩니다.
- **아이폰 vs 아이패드 비례 스케일링**: 태블릿(`min-width: 600px`) 환경에서는 아이콘, 폰트, 메달리온 버튼이 약 1.4~1.55배 비례 확대되어 심미성과 터치 편의성을 극대화합니다.
- **3종 가든/감성 테마**: `NEON` (Midnight Garden), `WOOD` (Warm Wood), `CANDY` (Sweet Pastel) 테마 전환 시 기존 배치된 블록 색상도 즉시 테마에 맞춰 보존·변환됩니다.

---

## 🚀 개발 및 빌드 명령어

### 1. 로컬 개발 및 프로덕션 웹 빌드
```bash
# 로컬 개발 서버 실행 (http://localhost:5173)
npm run dev

# 프로덕션 빌드 및 프리뷰
npm run build
npm run preview
```

### 2. 자동화 테스트 & 릴리즈 게이트 (Release Gate)
```bash
# 코어 게임 로직 단위 테스트 (15개 스위트)
npm run test:unit

# 크로스 플랫폼 E2E 테스트 (Playwright: iOS & Android 뷰포트 30개 테스트)
npm run test:e2e:web

# 아이폰 vs 아이패드 비례 스케일링 및 정중앙 정렬 비주얼 검증
npm run test:visual

# 전체 릴리즈 게이트 실행
bash scripts/release-gate.sh quick
npm run release:gate
```

### 3. 버전 업데이트 (웹 / Android / iOS 통합 동기화)
업데이트 시 아래 명령어를 실행하면 `package.json`, `src/version.ts`, `index.html`, Android `versionCode` / `versionName`, iOS `CURRENT_PROJECT_VERSION` / `MARKETING_VERSION`이 한 번에 올라갑니다:
```bash
# 패치 버전 자동 증가 (예: 1.0.1 -> 1.0.2, Android versionCode +1)
npm run version:bump

# 마이너/메이저 또는 특정 버전 지정
node scripts/bump-version.mjs minor
node scripts/bump-version.mjs 1.1.0
```

### 4. iPad / iOS 및 Android 실기기 배포
```bash
# 연결된 물리 iPad Pro에 서명 빌드 및 즉시 설치
npm run install:ipad

# Android 웹 에셋 동기화 및 APK / AAB 빌드
npm run cap:sync
npm run build:apk
npm run build:aab
```
