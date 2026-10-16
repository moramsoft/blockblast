import './style.css';
import confetti from 'canvas-confetti';
import { BlockBlastGame, BOOSTER_PRICES, MAX_HELD_BOOSTERS } from './game';
import { GameRenderer } from './renderer';
import { sound } from './audio';
import { haptics } from './haptics';
import { ThemeId } from './types';

// DOM Elements
const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const soundBtn = document.getElementById('soundBtn') as HTMLButtonElement;
const restartBtn = document.getElementById('restartBtn') as HTMLButtonElement;
const themeBtn = document.getElementById('themeBtn') as HTMLButtonElement;
const themeTag = document.getElementById('themeTag') as HTMLSpanElement;
const modeTag = document.getElementById('modeTag') as HTMLSpanElement;
const dailyBtn = document.getElementById('dailyBtn') as HTMLButtonElement;
const shopBtn = document.getElementById('shopBtn') as HTMLButtonElement;
const statsBtn = document.getElementById('statsBtn') as HTMLButtonElement;

const bestScoreText = document.getElementById('bestScoreText') as HTMLDivElement;
const currentScoreText = document.getElementById('currentScoreText') as HTMLDivElement;
const headerCoinsText = document.getElementById('headerCoinsText') as HTMLDivElement;
const headerCoinCard = document.getElementById('headerCoinCard') as HTMLDivElement;

const boosterBar = document.getElementById('boosterBar') as HTMLDivElement;
const rotateBoosterBtn = document.getElementById('rotateBoosterBtn') as HTMLButtonElement;
const shuffleBoosterBtn = document.getElementById('shuffleBoosterBtn') as HTMLButtonElement;
const hammerBoosterBtn = document.getElementById('hammerBoosterBtn') as HTMLButtonElement;
const rotateCountBadge = document.getElementById('rotateCountBadge') as HTMLSpanElement;
const shuffleCountBadge = document.getElementById('shuffleCountBadge') as HTMLSpanElement;
const hammerCountBadge = document.getElementById('hammerCountBadge') as HTMLSpanElement;

const dailyBanner = document.getElementById('dailyBanner') as HTMLDivElement;
const dailyBannerText = document.getElementById('dailyBannerText') as HTMLSpanElement;
const modeBanner = document.getElementById('modeBanner') as HTMLDivElement;
const modeBannerText = document.getElementById('modeBannerText') as HTMLSpanElement;
const comboBanner = document.getElementById('comboBanner') as HTMLDivElement;
const comboText = document.getElementById('comboText') as HTMLSpanElement;
const comboHearts = document.getElementById('comboHearts') as HTMLSpanElement;

// Stuck / Rescue Modal Elements
const stuckModal = document.getElementById('stuckModal') as HTMLDialogElement;
const rescueHammerBtn = document.getElementById('rescueHammerBtn') as HTMLButtonElement;
const rescueHammerSub = document.getElementById('rescueHammerSub') as HTMLDivElement;
const rescueShuffleBtn = document.getElementById('rescueShuffleBtn') as HTMLButtonElement;
const rescueShuffleSub = document.getElementById('rescueShuffleSub') as HTMLDivElement;
const rescueRotateBtn = document.getElementById('rescueRotateBtn') as HTMLButtonElement;
const rescueRotateSub = document.getElementById('rescueRotateSub') as HTMLDivElement;
const rescueAdBtn = document.getElementById('rescueAdBtn') as HTMLButtonElement;
const stuckGiveUpBtn = document.getElementById('stuckGiveUpBtn') as HTMLButtonElement;

// Daily Challenge Modal Elements
const dailyModal = document.getElementById('dailyModal') as HTMLDialogElement;
const dailyStreakBadge = document.getElementById('dailyStreakBadge') as HTMLDivElement;
const dailyMissionTitle = document.getElementById('dailyMissionTitle') as HTMLDivElement;
const dailyRewardText = document.getElementById('dailyRewardText') as HTMLDivElement;
const calendarMonthHeader = document.getElementById('calendarMonthHeader') as HTMLDivElement;
const calendarDaysGrid = document.getElementById('calendarDaysGrid') as HTMLDivElement;
const startDailyBtn = document.getElementById('startDailyBtn') as HTMLButtonElement;
const closeDailyBtn = document.getElementById('closeDailyBtn') as HTMLButtonElement;

// Daily Victory Modal Elements
const dailyVictoryModal = document.getElementById('dailyVictoryModal') as HTMLDialogElement;
const dailyVictoryStreakText = document.getElementById('dailyVictoryStreakText') as HTMLDivElement;
const dailyContinueBtn = document.getElementById('dailyContinueBtn') as HTMLButtonElement;
const dailyFinishBtn = document.getElementById('dailyFinishBtn') as HTMLButtonElement;

// Shop Modal Elements
const shopModal = document.getElementById('shopModal') as HTMLDialogElement;
const shopCoinBalanceText = document.getElementById('shopCoinBalanceText') as HTMLElement;
const buyRotateBtn = document.getElementById('buyRotateBtn') as HTMLButtonElement;
const buyShuffleBtn = document.getElementById('buyShuffleBtn') as HTMLButtonElement;
const buyHammerBtn = document.getElementById('buyHammerBtn') as HTMLButtonElement;
const buyMegaPackBtn = document.getElementById('buyMegaPackBtn') as HTMLButtonElement;
const claimAdCoinsBtn = document.getElementById('claimAdCoinsBtn') as HTMLButtonElement;
const closeShopBtn = document.getElementById('closeShopBtn') as HTMLButtonElement;

// Stats & Achievements Modal Elements
const statsModal = document.getElementById('statsModal') as HTMLDialogElement;
const closeStatsBtn = document.getElementById('closeStatsBtn') as HTMLButtonElement;
const statGames = document.getElementById('statGames') as HTMLDivElement;
const statBest = document.getElementById('statBest') as HTMLDivElement;
const statCombo = document.getElementById('statCombo') as HTMLDivElement;
const statLines = document.getElementById('statLines') as HTMLDivElement;
const achievementsList = document.getElementById('achievementsList') as HTMLDivElement;

// Game Over Modal Elements
const gameOverModal = document.getElementById('gameOverModal') as HTMLDialogElement;
const modalFinalScore = document.getElementById('modalFinalScore') as HTMLDivElement;
const modalMaxCombo = document.getElementById('modalMaxCombo') as HTMLElement;
const modalLines = document.getElementById('modalLines') as HTMLElement;
const highScoreBadge = document.getElementById('highScoreBadge') as HTMLDivElement;
const reviveBtn = document.getElementById('reviveBtn') as HTMLButtonElement;
const shareScoreCardBtn = document.getElementById('shareScoreCardBtn') as HTMLButtonElement;
const playAgainBtn = document.getElementById('playAgainBtn') as HTMLButtonElement;

// Share Modal Elements
const shareModal = document.getElementById('shareModal') as HTMLDialogElement;
const shareCardCanvas = document.getElementById('shareCardCanvas') as HTMLCanvasElement;
const downloadShareCardBtn = document.getElementById('downloadShareCardBtn') as HTMLButtonElement;
const closeShareBtn = document.getElementById('closeShareBtn') as HTMLButtonElement;

// Initialize Game & Renderer
const game = new BlockBlastGame();
const renderer = new GameRenderer(canvas);

// Rolling Score Display state
let displayedScore = 0;

// Register Callbacks
game.onStuckCallback = () => {
  openStuckModal();
};

game.onDailyVictoryCallback = () => {
  dailyVictoryStreakText.textContent = `🔥 Streak: ${game.dailyStreak.currentStreak} Day${game.dailyStreak.currentStreak > 1 ? 's' : ''}`;
  confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
  dailyVictoryModal.showModal();
};

// Set initial theme on body
document.body.className = `theme-${game.theme}`;
themeTag.textContent = game.theme.toUpperCase();

// Pointer Drag state
let activePointerId: number | null = null;
let touchVerticalOffset = 0;

function handleResize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  renderer.resize(rect.width, rect.height, dpr);
}

window.addEventListener('resize', handleResize);
handleResize();

function updateSoundIcon() {
  soundBtn.textContent = sound.getMuted() ? '🔇' : '🔊';
}
updateSoundIcon();

soundBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  sound.toggleMute();
  updateSoundIcon();
  haptics.tick();
});

// Theme cycle button
themeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const themes: ThemeId[] = ['neon', 'wood', 'candy'];
  const nextIdx = (themes.indexOf(game.theme) + 1) % themes.length;
  const newTheme = themes[nextIdx];
  game.setTheme(newTheme);
  document.body.className = `theme-${newTheme}`;
  themeTag.textContent = newTheme.toUpperCase();
  haptics.tick();
});

// Restart Game
restartBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (confirm('Start a new game?')) {
    game.startNewGame(game.mode);
    displayedScore = 0;
    syncUI();
    haptics.tick();
  }
});

// Boosters Listeners
rotateBoosterBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!game.isBoosterAllowed()) return;
  if (game.boosters.rotate <= 0) {
    openShopModal();
    return;
  }
  game.toggleRotateMode();
  haptics.tick();
  syncUI();
});

shuffleBoosterBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!game.isBoosterAllowed()) return;
  if (game.boosters.shuffle <= 0) {
    openShopModal();
    return;
  }
  game.useShuffle();
  syncUI();
});

hammerBoosterBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!game.isBoosterAllowed()) return;
  if (game.boosters.hammer <= 0) {
    openShopModal();
    return;
  }
  game.toggleHammerMode();
  haptics.tick();
  syncUI();
});

// Daily Challenge Modal
dailyBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  haptics.tick();
  renderDailyModal();
  dailyModal.showModal();
});

closeDailyBtn.addEventListener('click', () => {
  dailyModal.close();
});

startDailyBtn.addEventListener('click', () => {
  dailyModal.close();
  game.startNewGame('daily');
  displayedScore = 0;
  syncUI();
  haptics.lineClear();
});

// Daily Victory Modal Buttons
dailyContinueBtn.addEventListener('click', () => {
  dailyVictoryModal.close();
  haptics.tick();
});

dailyFinishBtn.addEventListener('click', () => {
  dailyVictoryModal.close();
  game.startNewGame('classic');
  displayedScore = 0;
  syncUI();
  haptics.tick();
});

function renderDailyModal() {
  const challenge = game.getTodayDailyChallenge();
  dailyStreakBadge.textContent = `🔥 ${game.dailyStreak.currentStreak} Day Streak`;

  if (challenge.targetType === 'gems') {
    dailyMissionTitle.textContent = `Collect ${challenge.targetValue} Gems 💎`;
  } else if (challenge.targetType === 'lines') {
    dailyMissionTitle.textContent = `Clear ${challenge.targetValue} Lines 🧹`;
  } else {
    dailyMissionTitle.textContent = `Reach ${challenge.targetValue.toLocaleString()} Points 🎯`;
  }

  dailyRewardText.textContent = challenge.completed
    ? '✅ Completed for Today! (+100 🪙 Claimed)'
    : `Reward: +${challenge.rewardCoins} 🪙 & Golden Star`;

  startDailyBtn.textContent = challenge.completed
    ? '🔄 Replay Today’s Challenge'
    : '▶ Play Today’s Challenge';

  // Render Full Month Calendar Grid
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  calendarMonthHeader.textContent = monthName;

  calendarDaysGrid.innerHTML = '';

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayDateNum = now.getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = d === todayDateNum;
    const isCompleted = game.dailyStreak.completedDates.includes(dateStr);

    const cell = document.createElement('div');
    cell.className = `calendar-day-cell ${isToday ? 'today' : ''} ${isCompleted ? 'completed' : ''}`;
    cell.innerHTML = `
      <span>${d}</span>
      <span style="font-size: 10px;">${isCompleted ? '⭐' : isToday ? '🎯' : '•'}</span>
    `;
    calendarDaysGrid.appendChild(cell);
  }
}

// Shop Modal
shopBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  haptics.tick();
  openShopModal();
});

headerCoinCard.addEventListener('click', (e) => {
  e.stopPropagation();
  haptics.tick();
  openShopModal();
});

function openShopModal() {
  shopCoinBalanceText.textContent = game.coins.toLocaleString();
  updateShopButtons();
  shopModal.showModal();
}

closeShopBtn.addEventListener('click', () => {
  shopModal.close();
});

function updateShopButtons() {
  shopCoinBalanceText.textContent = game.coins.toLocaleString();
  buyRotateBtn.textContent = `${BOOSTER_PRICES.rotate} 🪙 (${game.boosters.rotate}/${MAX_HELD_BOOSTERS})`;
  buyShuffleBtn.textContent = `${BOOSTER_PRICES.shuffle} 🪙 (${game.boosters.shuffle}/${MAX_HELD_BOOSTERS})`;
  buyHammerBtn.textContent = `${BOOSTER_PRICES.hammer} 🪙 (${game.boosters.hammer}/${MAX_HELD_BOOSTERS})`;
}

buyRotateBtn.addEventListener('click', () => {
  if (game.buyBooster('rotate')) {
    updateShopButtons();
    syncUI();
  }
});

buyShuffleBtn.addEventListener('click', () => {
  if (game.buyBooster('shuffle')) {
    updateShopButtons();
    syncUI();
  }
});

buyHammerBtn.addEventListener('click', () => {
  if (game.buyBooster('hammer')) {
    updateShopButtons();
    syncUI();
  }
});

buyMegaPackBtn.addEventListener('click', () => {
  if (game.buyMegaPack()) {
    updateShopButtons();
    syncUI();
  }
});

claimAdCoinsBtn.addEventListener('click', () => {
  claimAdCoinsBtn.disabled = true;
  claimAdCoinsBtn.textContent = 'Watching Ad...';
  setTimeout(() => {
    game.addCoins(50);
    sound.playAchievement();
    haptics.lineClear();
    claimAdCoinsBtn.disabled = false;
    claimAdCoinsBtn.textContent = '+50 🪙 Free';
    updateShopButtons();
    syncUI();
  }, 1200);
});

// Stuck Rescue Modal Flow (Safe & Validated)
function openStuckModal() {
  // Update button subtitles
  rescueHammerSub.textContent =
    game.boosters.hammer > 0
      ? `Use 1 3x3 Hammer (${game.boosters.hammer} left)`
      : `Buy & Smash (${BOOSTER_PRICES.hammer} 🪙)`;

  rescueShuffleSub.textContent =
    game.boosters.shuffle > 0
      ? `Use 1 Shuffle (${game.boosters.shuffle} left)`
      : `Buy & Shuffle (${BOOSTER_PRICES.shuffle} 🪙)`;

  const canRotateHelp = game.canRotateRescueHelp();
  if (canRotateHelp) {
    rescueRotateBtn.disabled = false;
    rescueRotateBtn.style.opacity = '1';
    rescueRotateSub.textContent =
      game.boosters.rotate > 0
        ? `Use 1 Rotate (${game.boosters.rotate} left)`
        : `Buy & Rotate (${BOOSTER_PRICES.rotate} 🪙)`;
  } else {
    rescueRotateBtn.disabled = true;
    rescueRotateBtn.style.opacity = '0.4';
    rescueRotateSub.textContent = 'No valid rotation fits';
  }

  if (game.freeAdRescueUsed) {
    rescueAdBtn.disabled = true;
    rescueAdBtn.style.opacity = '0.5';
  } else {
    rescueAdBtn.disabled = false;
    rescueAdBtn.style.opacity = '1';
  }

  stuckModal.showModal();
}

rescueHammerBtn.addEventListener('click', () => {
  if (game.boosters.hammer > 0 || game.buyBooster('hammer')) {
    stuckModal.close();
    game.toggleHammerMode();
    syncUI();
  }
});

rescueShuffleBtn.addEventListener('click', () => {
  if (game.boosters.shuffle > 0 || game.buyBooster('shuffle')) {
    stuckModal.close();
    game.useShuffle();
    syncUI();
  }
});

rescueRotateBtn.addEventListener('click', () => {
  if (game.boosters.rotate > 0 || game.buyBooster('rotate')) {
    stuckModal.close();
    game.toggleRotateMode();
    syncUI();
  }
});

rescueAdBtn.addEventListener('click', () => {
  rescueAdBtn.disabled = true;
  rescueAdBtn.textContent = 'Watching Sponsor Ad...';
  setTimeout(() => {
    stuckModal.close();
    game.claimFreeEmergencyRescue();
    syncUI();
  }, 1200);
});

stuckGiveUpBtn.addEventListener('click', () => {
  stuckModal.close();
  game.dismissStuckAndGameOver();
  syncUI();
  setTimeout(showGameOver, 300);
});

// Stats Modal
statsBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  haptics.tick();
  renderStatsModal();
  statsModal.showModal();
});

closeStatsBtn.addEventListener('click', () => {
  statsModal.close();
});

function renderStatsModal() {
  statGames.textContent = game.stats.gamesPlayed.toLocaleString();
  statBest.textContent = game.stats.highScore.toLocaleString();
  statCombo.textContent = game.stats.maxCombo.toLocaleString();
  statLines.textContent = game.stats.linesCleared.toLocaleString();

  achievementsList.innerHTML = '';
  game.achievements.forEach((ach) => {
    const row = document.createElement('div');
    row.className = `achievement-row ${ach.unlocked ? 'unlocked' : ''}`;
    const pct = Math.min(100, Math.round((ach.progress / ach.maxProgress) * 100));

    row.innerHTML = `
      <div class="ach-icon">${ach.icon}</div>
      <div class="ach-info">
        <div class="ach-title">${ach.title}</div>
        <div class="ach-desc">${ach.desc} (${ach.progress}/${ach.maxProgress})</div>
        <div class="ach-progress-bar-bg">
          <div class="ach-progress-bar-fill" style="width: ${pct}%"></div>
        </div>
      </div>
      <div class="ach-status">${ach.unlocked ? '✅ Done' : pct + '%'}</div>
    `;
    achievementsList.appendChild(row);
  });
}

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if (e.key === 'm' || e.key === 'M') {
    sound.toggleMute();
    updateSoundIcon();
  } else if (e.key === 'r' || e.key === 'R') {
    if (!game.isGameOver) {
      if (confirm('Start a new game?')) {
        game.startNewGame(game.mode);
        displayedScore = 0;
        syncUI();
      }
    }
  } else if (e.key === '1') {
    rotateBoosterBtn.click();
  } else if (e.key === '2') {
    shuffleBoosterBtn.click();
  } else if (e.key === '3') {
    hammerBoosterBtn.click();
  } else if (e.key === 't' || e.key === 'T') {
    themeBtn.click();
  }
});

// Sync UI Score, Badges, and Modes
function syncUI() {
  bestScoreText.textContent = game.bestScore.toLocaleString();
  headerCoinsText.textContent = game.coins.toLocaleString();

  // Mode Tag & Banner
  if (game.mode === 'daily') {
    modeTag.classList.remove('hidden');
    dailyBanner.classList.remove('hidden');
    boosterBar.classList.add('disabled');

    const challenge = game.dailyInfo;
    let goalProgress = '';
    if (challenge.targetType === 'gems') {
      goalProgress = `Gems: ${challenge.gemsCollected || 0}/${challenge.targetValue} 💎`;
    } else if (challenge.targetType === 'lines') {
      goalProgress = `Lines: ${game.linesClearedTotal}/${challenge.targetValue}`;
    } else {
      goalProgress = `Score: ${game.score.toLocaleString()}/${challenge.targetValue.toLocaleString()}`;
    }

    dailyBannerText.textContent = game.dailyGoalMet
      ? `⭐ TODAY'S CHALLENGE COMPLETED! (+100 🪙)`
      : `📅 DAILY MISSION: ${goalProgress} (Pure Skill)`;
  } else {
    modeTag.classList.add('hidden');
    dailyBanner.classList.add('hidden');
    boosterBar.classList.remove('disabled');
  }

  // Booster Badges
  rotateCountBadge.textContent = String(game.boosters.rotate);
  shuffleCountBadge.textContent = String(game.boosters.shuffle);
  hammerCountBadge.textContent = String(game.boosters.hammer);

  // Active Booster Highlighting
  rotateBoosterBtn.classList.toggle('active-mode', game.activeMode === 'rotate');
  hammerBoosterBtn.classList.toggle('active-mode', game.activeMode === 'hammer');

  // Mode Banner
  if (game.activeMode === 'hammer') {
    modeBanner.classList.remove('hidden');
    modeBannerText.textContent = '🔨 Tap a block on board to blast 3x3! (Tap 3x3 Blast to cancel)';
  } else if (game.activeMode === 'rotate') {
    modeBanner.classList.remove('hidden');
    modeBannerText.textContent = '🔄 Tap a dock piece below to rotate 90°! (Tap Rotate to cancel)';
  } else {
    modeBanner.classList.add('hidden');
  }

  // Combo Banner with 3-Move Heartbeat Indicator
  if (game.combo >= 1) {
    comboBanner.classList.remove('hidden');
    comboText.textContent = `COMBO x${game.combo}`;
    comboHearts.textContent = '🔥'.repeat(game.comboGraceMoves) + '⚪'.repeat(Math.max(0, 3 - game.comboGraceMoves));

    if (game.comboGraceMoves === 1) {
      comboBanner.classList.add('warning');
    } else {
      comboBanner.classList.remove('warning');
    }
  } else {
    comboBanner.classList.add('hidden');
    comboBanner.classList.remove('warning');
  }
}

// Show Game Over Dialog
function showGameOver() {
  modalFinalScore.textContent = game.score.toLocaleString();
  modalMaxCombo.textContent = String(game.maxCombo);
  modalLines.textContent = String(game.linesClearedTotal);

  if (game.isNewHighScore && game.mode === 'classic') {
    highScoreBadge.style.display = 'inline-block';
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.5 },
    });
    sound.playHighScore();
  } else {
    highScoreBadge.style.display = 'none';
  }

  if (game.canRevive) {
    reviveBtn.style.display = 'block';
  } else {
    reviveBtn.style.display = 'none';
  }

  gameOverModal.showModal();
}

// Modal Buttons
reviveBtn.addEventListener('click', () => {
  gameOverModal.close();
  game.revive((c, r) => renderer.getCellCoord(c, r));
  syncUI();
});

playAgainBtn.addEventListener('click', () => {
  gameOverModal.close();
  game.startNewGame(game.mode);
  displayedScore = 0;
  syncUI();
});

// Share Score Card Generator
shareScoreCardBtn.addEventListener('click', () => {
  renderShareCard();
  shareModal.showModal();
});

closeShareBtn.addEventListener('click', () => {
  shareModal.close();
});

function renderShareCard() {
  const ctx = shareCardCanvas.getContext('2d')!;
  const w = shareCardCanvas.width;
  const h = shareCardCanvas.height;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(0.5, '#1e1b4b');
  grad.addColorStop(1, '#090d16');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Border frame
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  // Header Title
  ctx.textAlign = 'center';
  ctx.font = '900 28px -apple-system, sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText('BLOCK BLAST STAR', w / 2, 70);

  ctx.font = '700 14px -apple-system, sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('🏆 BRAIN PUZZLE IQ REPORT', w / 2, 100);

  // Score Box
  ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
  ctx.beginPath();
  ctx.roundRect(40, 130, w - 80, 140, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = '800 13px -apple-system, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('FINAL SCORE', w / 2, 165);

  ctx.font = '900 52px -apple-system, sans-serif';
  ctx.fillStyle = '#ffd600';
  ctx.fillText(game.score.toLocaleString(), w / 2, 225);

  // Stats Grid
  const rank = game.score > 2500 ? 'Top 1% Grandmaster' : game.score > 1000 ? 'Top 5% Master' : 'Puzzle Expert';
  ctx.font = '800 18px -apple-system, sans-serif';
  ctx.fillStyle = '#a855f7';
  ctx.fillText(`Rank: ${rank}`, w / 2, 310);

  ctx.font = '600 15px -apple-system, sans-serif';
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(`Max Combo: ${game.maxCombo}x  •  Lines Cleared: ${game.linesClearedTotal}`, w / 2, 345);

  // Date and Watermark
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  ctx.font = '500 13px -apple-system, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText(`Certified on ${today} • Play on Android & Web`, w / 2, 440);
}

downloadShareCardBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = `block-blast-score-${game.score}.png`;
  link.href = shareCardCanvas.toDataURL('image/png');
  link.click();
});

// Pointer & Drag Interaction with Ergonomic Clearance & Magnetic Snap
function getCanvasCoords(e: PointerEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

canvas.addEventListener('pointerdown', (e) => {
  if (game.isGameOver) return;
  const { x, y } = getCanvasCoords(e);
  const { boardX, boardY, cellSize, cellGap, dockSlots } = renderer.layout;

  // Handle 3x3 Blast Hammer Mode
  if (game.activeMode === 'hammer') {
    const step = cellSize + cellGap;
    const c = Math.floor((x - boardX) / step);
    const r = Math.floor((y - boardY) / step);

    if (c >= 0 && c < 8 && r >= 0 && r < 8) {
      game.useHammerOnCell(c, r, (col, row) => renderer.getCellCoord(col, row));
      syncUI();
      return;
    }
  }

  // Handle Rotate Mode
  if (game.activeMode === 'rotate') {
    for (let i = 0; i < 3; i++) {
      const slot = dockSlots[i];
      if (
        x >= slot.x &&
        x <= slot.x + slot.width &&
        y >= slot.y &&
        y <= slot.y + slot.height
      ) {
        if (game.dock[i]) {
          game.rotateDockPiece(i);
          syncUI();
          return;
        }
      }
    }
  }

  // Normal Drag and Drop
  for (let i = 0; i < 3; i++) {
    const slot = dockSlots[i];
    if (
      x >= slot.x &&
      x <= slot.x + slot.width &&
      y >= slot.y &&
      y <= slot.y + slot.height
    ) {
      const piece = game.dock[i];
      if (!piece) continue;

      // Start drag
      activePointerId = e.pointerId;
      canvas.setPointerCapture(e.pointerId);

      game.draggedIndex = i;

      // Dynamic Ergonomic Touch Offset:
      // Guarantees piece base always stays comfortably 42px above touch finger!
      const matrix = piece.shape.matrix;
      const pieceHeight = matrix.length * cellSize + (matrix.length - 1) * cellGap;
      touchVerticalOffset = e.pointerType === 'touch' ? Math.max(68, pieceHeight / 2 + 42) : 0;

      game.dragX = x;
      game.dragY = y - touchVerticalOffset;
      game.preview = null;

      sound.playPick();
      haptics.tick();
      updateDragPreview();
      break;
    }
  }
});

function updateDragPreview() {
  if (game.draggedIndex === null) return;
  const piece = game.dock[game.draggedIndex];
  if (!piece) return;

  const { boardX, boardY, cellSize, cellGap } = renderer.layout;
  const matrix = piece.shape.matrix;
  const rows = matrix.length;
  const cols = matrix[0].length;

  const totalW = cols * cellSize + (cols - 1) * cellGap;
  const totalH = rows * cellSize + (rows - 1) * cellGap;

  const pieceStartX = game.dragX - totalW / 2;
  const pieceStartY = game.dragY - totalH / 2;

  const step = cellSize + cellGap;

  // Raw grid position with boundary tolerance clamping
  let gridX = Math.round((pieceStartX - boardX) / step);
  let gridY = Math.round((pieceStartY - boardY) / step);

  // Soft edge clamping (±0.6 cell tolerance)
  const floatX = (pieceStartX - boardX) / step;
  const floatY = (pieceStartY - boardY) / step;

  if (floatX >= -0.6 && floatX < 0) gridX = 0;
  if (floatX + cols <= 8.6 && floatX + cols > 8) gridX = 8 - cols;
  if (floatY >= -0.6 && floatY < 0) gridY = 0;
  if (floatY + rows <= 8.6 && floatY + rows > 8) gridY = 8 - rows;

  // Magnetic Assist: If direct spot is invalid, check ±1 adjacent spots if within 0.45 cell radius
  if (!game.canPlaceAt(matrix, gridX, gridY)) {
    let closestValid: { x: number; y: number; dist: number } | null = null;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const candidateX = gridX + dx;
        const candidateY = gridY + dy;
        if (game.canPlaceAt(matrix, candidateX, candidateY)) {
          const dist = Math.hypot(candidateX - floatX, candidateY - floatY);
          if (dist < 0.85 && (!closestValid || dist < closestValid.dist)) {
            closestValid = { x: candidateX, y: candidateY, dist };
          }
        }
      }
    }
    if (closestValid) {
      gridX = closestValid.x;
      gridY = closestValid.y;
    }
  }

  if (
    gridX >= 0 &&
    gridX + cols <= 8 &&
    gridY >= 0 &&
    gridY + rows <= 8
  ) {
    const oldPreviewValid = game.preview?.isValid;
    game.preview = game.computePreview(piece.shape, gridX, gridY);
    if (!oldPreviewValid && game.preview.isValid) {
      haptics.tick();
    }
  } else {
    game.preview = null;
  }
}

canvas.addEventListener('pointermove', (e) => {
  const { x, y } = getCanvasCoords(e);

  // In Hammer mode, update targeting coordinates for 3x3 laser crosshair preview
  if (game.activeMode === 'hammer') {
    const { boardX, boardY, cellSize, cellGap } = renderer.layout;
    const step = cellSize + cellGap;
    const c = Math.floor((x - boardX) / step);
    const r = Math.floor((y - boardY) / step);
    if (c >= 0 && c < 8 && r >= 0 && r < 8) {
      renderer.hammerHoverCoords = { c, r };
    }
  }

  if (activePointerId !== e.pointerId || game.draggedIndex === null) return;
  game.dragX = x;
  game.dragY = y - touchVerticalOffset;
  updateDragPreview();
});

function endDrag(e: PointerEvent) {
  if (activePointerId !== e.pointerId || game.draggedIndex === null) return;

  if (game.preview && game.preview.isValid) {
    game.placePiece(
      game.draggedIndex,
      game.preview.gridX,
      game.preview.gridY,
      (c, r) => renderer.getCellCoord(c, r)
    );
    syncUI();

    if (game.isGameOver) {
      setTimeout(showGameOver, 450);
    }
  }

  game.draggedIndex = null;
  game.preview = null;
  activePointerId = null;

  try {
    canvas.releasePointerCapture(e.pointerId);
  } catch {}
}

canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

// Main Game Loop (60/120fps) with Rolling Score Odometer
let lastTime = performance.now();
function gameLoop(now: number) {
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  // Rolling score animation
  if (displayedScore < game.score) {
    const diff = game.score - displayedScore;
    const step = Math.max(1, Math.ceil(diff * 0.18));
    displayedScore = Math.min(game.score, displayedScore + step);
    currentScoreText.textContent = displayedScore.toLocaleString();
  } else if (displayedScore > game.score) {
    displayedScore = game.score;
    currentScoreText.textContent = displayedScore.toLocaleString();
  }

  game.update(dt, (c, r) => renderer.getCellCoord(c, r));
  renderer.render(game, dt);

  // Check achievement popup banners
  if (game.newlyUnlockedAchievements.length > 0) {
    for (const ach of game.newlyUnlockedAchievements) {
      confetti({ particleCount: 60, spread: 65, origin: { y: 0.5 } });
      game.particles.addFloatingText('🏆 ' + ach.title, 'Achievement Unlocked! (+50 🪙)', 240, 240, '#facc15');
    }
    game.newlyUnlockedAchievements = [];
    syncUI();
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
syncUI();
