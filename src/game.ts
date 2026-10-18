import {
  ActiveInteractionMode,
  Achievement,
  BoardGrid,
  BoosterType,
  Cell,
  DailyChallengeInfo,
  DailyStreakState,
  DockPiece,
  GameMode,
  MoveHint,
  MoveSnapshot,
  PlacedBounce,
  ShapeDefinition,
  ThemeId,
  UserStats,
  VisualDominoCell,
} from './types';
import {
  dealWeightedHand,
  rotateMatrix,
  THEME_PALETTES,
  createMulberry32,
  hashStringToSeed,
  getShapesForTheme,
} from './shapes';
import { sound } from './audio';
import { haptics } from './haptics';
import { ParticleSystem } from './particles';

export const BOARD_SIZE = 8;
export const MAX_HELD_BOOSTERS = 5;

export const BOOSTER_PRICES = {
  rotate: 30,
  shuffle: 50,
  hammer: 80,
  megaPack: 200,
  undo: 20,
  hint: 15,
};

export const UNDO_COIN_PRICE = 20;
export const HINT_COIN_PRICE = 15;
export const FREE_TRIAL_MOVES_COUNT = 5;

export interface PlacementPreview {
  gridX: number;
  gridY: number;
  isValid: boolean;
  clearRows: number[];
  clearCols: number[];
}

export class BlockBlastGame {
  public grid: BoardGrid;
  public dock: (DockPiece | null)[] = [null, null, null];
  public score: number = 0;
  public bestScore: number = 0;
  public combo: number = 0;
  public comboGraceMoves: number = 0; // 3-move heartbeat window
  public maxCombo: number = 0;
  public linesClearedTotal: number = 0;
  public isGameOver: boolean = false;
  public canRevive: boolean = true;
  public isNewHighScore: boolean = false;
  public screenShake: number = 0;

  public theme: ThemeId = 'neon';
  public particles: ParticleSystem;

  // Active Mode: 'classic' or 'daily'
  public mode: GameMode = 'classic';
  public dailyInfo: DailyChallengeInfo;
  public dailyStreak: DailyStreakState;
  public dailyGoalMet: boolean = false;
  private dailyRng: (() => number) | null = null;

  // Active Drag State
  public draggedIndex: number | null = null;
  public dragX: number = 0;
  public dragY: number = 0;
  public preview: PlacementPreview | null = null;

  // Animations: Jelly bounce & Visual Domino Cascade
  public placedBounces: PlacedBounce[] = [];
  public visualDominoQueue: VisualDominoCell[] = [];

  // Coins & Economy
  public coins: number = 100;
  public boosters = { rotate: 3, shuffle: 3, hammer: 2 };
  public boosterUsageThisGame = { rotate: 0, shuffle: 0, hammer: 0 };
  public boosterLimitsPerGame = { rotate: 5, shuffle: 5, hammer: 3 };
  public activeMode: ActiveInteractionMode = 'none';

  // Rescue System when stuck (No moves left)
  public isStuck: boolean = false;
  public freeAdRescueUsed: boolean = false;
  public onStuckCallback: (() => void) | null = null;
  public onDailyVictoryCallback: (() => void) | null = null;

  // Stats & Achievements
  public stats: UserStats;
  public achievements: Achievement[];
  public newlyUnlockedAchievements: Achievement[] = [];

  // Senior & Accessibility Assist System (Free trial for first moves, then coin monetization)
  public lastMoveSnapshot: MoveSnapshot | null = null;
  public activeHint: MoveHint | null = null;
  public idleSeconds: number = 0;
  public comfortMode: boolean = true;
  public movesCountThisGame: number = 0;
  public undoFreeTrialRemaining: number = FREE_TRIAL_MOVES_COUNT;
  public hintFreeTrialRemaining: number = FREE_TRIAL_MOVES_COUNT;

  constructor() {
    this.particles = new ParticleSystem();
    this.grid = this.createEmptyGrid();
    this.bestScore = parseInt(localStorage.getItem('blockblast_best_score') || '0', 10);
    this.theme = (localStorage.getItem('blockblast_theme') as ThemeId) || 'neon';
    this.comfortMode = localStorage.getItem('blockblast_comfort_mode') !== 'false';
    sound.setTheme(this.theme);

    // Load coins
    const savedCoins = localStorage.getItem('blockblast_coins');
    this.coins = savedCoins !== null ? parseInt(savedCoins, 10) : 100;

    // Load boosters (capped at MAX_HELD_BOOSTERS)
    const savedBoosters = localStorage.getItem('blockblast_boosters');
    if (savedBoosters) {
      try {
        const parsed = JSON.parse(savedBoosters);
        this.boosters = {
          rotate: Math.min(MAX_HELD_BOOSTERS, Math.max(0, parsed.rotate ?? 3)),
          shuffle: Math.min(MAX_HELD_BOOSTERS, Math.max(0, parsed.shuffle ?? 3)),
          hammer: Math.min(MAX_HELD_BOOSTERS, Math.max(0, parsed.hammer ?? 2)),
        };
      } catch {}
    }

    // Load Daily Streak & Challenge
    this.dailyStreak = this.loadDailyStreak();
    this.dailyInfo = this.getTodayDailyChallenge();

    // Load stats & achievements
    this.stats = this.loadStats();
    this.achievements = this.initAchievements();
    this.loadAchievements();

    this.startNewGame('classic');
  }

  public createEmptyGrid(): BoardGrid {
    return Array.from({ length: BOARD_SIZE }, () =>
      Array.from({ length: BOARD_SIZE }, () => null)
    );
  }

  public getOccupiedCellCount(): number {
    let count = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (this.grid[r][c] !== null) count++;
      }
    }
    return count;
  }

  public isBoardDanger(): boolean {
    return this.getOccupiedCellCount() >= 48; // 75% filled
  }

  public setTheme(newTheme: ThemeId) {
    this.theme = newTheme;
    localStorage.setItem('blockblast_theme', newTheme);
    sound.setTheme(newTheme);

    const palette = THEME_PALETTES[newTheme];

    // Preserve original colorKey for dock pieces
    for (const piece of this.dock) {
      if (piece) {
        const entry = palette[piece.shape.colorKey];
        piece.shape.color = entry.color;
        piece.shape.gradient = entry.gradient;
        piece.shape.borderColor = entry.borderColor;
        piece.shape.shadowColor = entry.shadowColor;
      }
    }

    // Preserve original colorKey for board cells
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const cell = this.grid[r][c];
        if (cell) {
          const colorKey = cell.colorKey || 'gold';
          const entry = palette[colorKey];
          cell.color = entry.color;
          cell.gradient = entry.gradient;
          cell.borderColor = entry.borderColor;
          cell.shadowColor = entry.shadowColor;
        }
      }
    }
  }

  public saveBoosters() {
    localStorage.setItem('blockblast_boosters', JSON.stringify(this.boosters));
  }

  public saveCoins() {
    localStorage.setItem('blockblast_coins', String(this.coins));
  }

  public addCoins(amount: number) {
    this.coins += amount;
    this.stats.coinsEarned += amount;
    this.saveCoins();
    this.saveStats();
  }

  public spendCoins(amount: number): boolean {
    if (this.coins < amount) return false;
    this.coins -= amount;
    this.saveCoins();
    return true;
  }

  public toggleComfortMode(): boolean {
    this.comfortMode = !this.comfortMode;
    localStorage.setItem('blockblast_comfort_mode', String(this.comfortMode));
    return this.comfortMode;
  }

  public startNewGame(mode: GameMode = 'classic') {
    this.mode = mode;
    this.grid = this.createEmptyGrid();
    this.score = 0;
    this.combo = 0;
    this.comboGraceMoves = 0;
    this.maxCombo = 0;
    this.linesClearedTotal = 0;
    this.isGameOver = false;
    this.isStuck = false;
    this.canRevive = true;
    this.isNewHighScore = false;
    this.screenShake = 0;
    this.draggedIndex = null;
    this.preview = null;
    this.activeMode = 'none';
    this.placedBounces = [];
    this.visualDominoQueue = [];
    this.freeAdRescueUsed = false;
    this.dailyGoalMet = false;
    this.boosterUsageThisGame = { rotate: 0, shuffle: 0, hammer: 0 };
    this.particles.clear();

    // Reset Senior & Assist state
    this.lastMoveSnapshot = null;
    this.activeHint = null;
    this.idleSeconds = 0;
    this.movesCountThisGame = 0;
    this.undoFreeTrialRemaining = FREE_TRIAL_MOVES_COUNT;
    this.hintFreeTrialRemaining = FREE_TRIAL_MOVES_COUNT;
    if (mode === 'relaxed') {
      this.comfortMode = true;
    }

    if (mode === 'daily') {
      const todayKey = this.getTodayDateKey();
      const seed = hashStringToSeed(todayKey);
      this.dailyRng = createMulberry32(seed);
      this.dailyInfo = this.getTodayDailyChallenge();
      this.dailyInfo.gemsCollected = 0;
      this.setupDailyBoardPattern(this.dailyRng);
    } else {
      this.dailyRng = null;
    }

    this.stats.gamesPlayed++;
    this.saveStats();
    this.checkAchievements();

    this.dealNewShapes();
  }

  // Generate a symmetrical aesthetic challenge board pattern for Daily Mode
  private setupDailyBoardPattern(rng: () => number) {
    const palette = THEME_PALETTES[this.theme];
    const colorKeys: (keyof typeof palette)[] = ['gold', 'cyan', 'emerald', 'ruby', 'purple'];

    // Pick 1 of 4 symmetrical layout archetypes
    const archetype = Math.floor(rng() * 4);
    const patternCells: { r: number; c: number; gem: boolean }[] = [];

    if (archetype === 0) {
      // 4 corners + 4 center pins
      const coords = [
        [1, 1], [1, 6], [6, 1], [6, 6],
        [2, 2], [2, 5], [5, 2], [5, 5],
        [3, 3], [3, 4], [4, 3], [4, 4]
      ];
      coords.forEach(([r, c], i) => patternCells.push({ r, c, gem: i % 2 === 0 }));
    } else if (archetype === 1) {
      // Diamond ring
      const coords = [
        [1, 3], [1, 4], [6, 3], [6, 4],
        [3, 1], [4, 1], [3, 6], [4, 6],
        [2, 2], [2, 5], [5, 2], [5, 5]
      ];
      coords.forEach(([r, c], i) => patternCells.push({ r, c, gem: i % 3 === 0 }));
    } else if (archetype === 2) {
      // Cross constellation
      const coords = [
        [2, 3], [2, 4], [5, 3], [5, 4],
        [3, 2], [4, 2], [3, 5], [4, 5],
        [0, 3], [0, 4], [7, 3], [7, 4]
      ];
      coords.forEach(([r, c], i) => patternCells.push({ r, c, gem: i % 2 === 1 }));
    } else {
      // Symmetrical fortress corners
      const coords = [
        [0, 0], [0, 1], [1, 0],
        [0, 7], [0, 6], [1, 7],
        [7, 0], [7, 1], [6, 0],
        [7, 7], [7, 6], [6, 7],
        [3, 3], [4, 4]
      ];
      coords.forEach(([r, c], i) => patternCells.push({ r, c, gem: i < 8 && i % 2 === 0 }));
    }

    for (const item of patternCells) {
      const colorKey = colorKeys[Math.floor(rng() * colorKeys.length)];
      const entry = palette[colorKey];
      this.grid[item.r][item.c] = {
        color: entry.color,
        gradient: entry.gradient,
        borderColor: entry.borderColor,
        shadowColor: entry.shadowColor,
        colorKey,
        hasGem: item.gem,
      };
    }
  }

  // Weighted hand deal with diversity rules and smart difficulty pacing
  public dealNewShapes() {
    const rng = this.mode === 'daily' && this.dailyRng ? this.dailyRng : Math.random;
    const hand = dealWeightedHand(this.theme, this.score, rng);

    this.dock = hand.map((shape, i) => ({
      id: `piece_${Date.now()}_${i}_${Math.random()}`,
      shape,
      canPlace: true,
      scale: 1,
    }));

    this.updateDockPlaceableStatus();

    // In relaxed mode, if no pieces fit, automatically adjust with guaranteed placeable pieces
    if (this.mode === 'relaxed' && !this.dock.some((p) => p && p.canPlace)) {
      this.dealGuaranteedPlaceableShapes();
    }
  }

  // 100% Guaranteed Placeable Shapes Dealing (For Emergency Ad Rescue, Shuffle, and Revive)
  public dealGuaranteedPlaceableShapes() {
    const allShapes = getShapesForTheme(this.theme);
    let fittingShapes = allShapes.filter((s) => this.canFitAnywhere(s.matrix));

    // If completely choked (no piece in catalog fits), clear center 2x2 pocket to guarantee fit
    if (fittingShapes.length === 0) {
      for (let r = 3; r <= 4; r++) {
        for (let c = 3; c <= 4; c++) {
          this.grid[r][c] = null;
        }
      }
      fittingShapes = allShapes.filter((s) => this.canFitAnywhere(s.matrix));
    }

    // Identify shapes that can immediately trigger a line clear
    const clearingShapes = fittingShapes.filter((s) => {
      const rows = s.matrix.length;
      const cols = s.matrix[0].length;
      for (let r = 0; r <= BOARD_SIZE - rows; r++) {
        for (let c = 0; c <= BOARD_SIZE - cols; c++) {
          const prev = this.computePreview(s, c, r);
          if (prev.isValid && prev.clearRows.length + prev.clearCols.length > 0) {
            return true;
          }
        }
      }
      return false;
    });

    const selected: ShapeDefinition[] = [];
    // Slot 0: Prioritize a line-clearing savior shape if available, else standard fitting
    const firstPool = clearingShapes.length > 0 ? clearingShapes : fittingShapes;
    const firstPick = firstPool[Math.floor(Math.random() * firstPool.length)];
    selected.push({
      ...firstPick,
      matrix: firstPick.matrix.map((row) => [...row]),
    });

    // Slots 1 & 2: Fill with shapes that guaranteed fit
    for (let i = 1; i < 3; i++) {
      const pick = fittingShapes[Math.floor(Math.random() * fittingShapes.length)];
      selected.push({
        ...pick,
        matrix: pick.matrix.map((row) => [...row]),
      });
    }

    this.dock = selected.map((shape, i) => ({
      id: `rescue_piece_${Date.now()}_${i}_${Math.random()}`,
      shape,
      canPlace: true,
      scale: 1,
    }));

    this.isStuck = false;
    this.activeHint = null;
    this.idleSeconds = 0;
    this.updateDockPlaceableStatus();
  }

  public canFitAnywhere(matrix: number[][]): boolean {
    const mRows = matrix.length;
    const mCols = matrix[0].length;

    for (let r = 0; r <= BOARD_SIZE - mRows; r++) {
      for (let c = 0; c <= BOARD_SIZE - mCols; c++) {
        if (this.canPlaceAt(matrix, c, r)) {
          return true;
        }
      }
    }
    return false;
  }

  public canPlaceAt(matrix: number[][], gridX: number, gridY: number): boolean {
    const mRows = matrix.length;
    const mCols = matrix[0].length;

    if (gridX < 0 || gridY < 0 || gridX + mCols > BOARD_SIZE || gridY + mRows > BOARD_SIZE) {
      return false;
    }

    for (let r = 0; r < mRows; r++) {
      for (let c = 0; c < mCols; c++) {
        if (matrix[r][c] === 1) {
          if (this.grid[gridY + r][gridX + c] !== null) {
            return false;
          }
        }
      }
    }
    return true;
  }

  public updateDockPlaceableStatus() {
    let anyCanPlace = false;
    let remainingPiecesCount = 0;

    for (const piece of this.dock) {
      if (piece) {
        remainingPiecesCount++;
        piece.canPlace = this.canFitAnywhere(piece.shape.matrix);
        if (piece.canPlace) {
          anyCanPlace = true;
        }
      }
    }

    if (anyCanPlace) {
      this.isStuck = false;
    }

    // If all dock pieces used, deal new 3
    if (remainingPiecesCount === 0) {
      this.dealNewShapes();
      return;
    }

    // If no piece can be placed:
    if (!anyCanPlace && remainingPiecesCount > 0) {
      if ((this.mode === 'classic' || this.mode === 'relaxed') && !this.isStuck && this.hasRescueAvailable()) {
        this.isStuck = true;
        if (this.onStuckCallback) {
          this.onStuckCallback();
        }
      } else if (!this.isStuck) {
        this.triggerGameOver();
      }
    }
  }

  // Pre-check if rotating any current dock piece would allow it to fit
  public canRotateRescueHelp(): boolean {
    for (const piece of this.dock) {
      if (!piece) continue;
      const rotated = rotateMatrix(piece.shape.matrix);
      if (this.canFitAnywhere(rotated)) {
        return true;
      }
    }
    return false;
  }

  public hasRescueAvailable(): boolean {
    return (
      this.boosters.rotate > 0 ||
      this.boosters.shuffle > 0 ||
      this.boosters.hammer > 0 ||
      this.coins >= BOOSTER_PRICES.rotate ||
      !this.freeAdRescueUsed
    );
  }

  public computePreview(shape: ShapeDefinition, gridX: number, gridY: number): PlacementPreview {
    const matrix = shape.matrix;
    const isValid = this.canPlaceAt(matrix, gridX, gridY);

    if (!isValid) {
      return { gridX, gridY, isValid: false, clearRows: [], clearCols: [] };
    }

    const mRows = matrix.length;
    const mCols = matrix[0].length;

    const clearRows: number[] = [];
    const clearCols: number[] = [];

    // Check rows
    for (let r = 0; r < BOARD_SIZE; r++) {
      let full = true;
      for (let c = 0; c < BOARD_SIZE; c++) {
        const isPartOfPiece =
          r >= gridY && r < gridY + mRows && c >= gridX && c < gridX + mCols && matrix[r - gridY][c - gridX] === 1;
        const hasExisting = this.grid[r][c] !== null;

        if (!isPartOfPiece && !hasExisting) {
          full = false;
          break;
        }
      }
      if (full) clearRows.push(r);
    }

    // Check cols
    for (let c = 0; c < BOARD_SIZE; c++) {
      let full = true;
      for (let r = 0; r < BOARD_SIZE; r++) {
        const isPartOfPiece =
          r >= gridY && r < gridY + mRows && c >= gridX && c < gridX + mCols && matrix[r - gridY][c - gridX] === 1;
        const hasExisting = this.grid[r][c] !== null;

        if (!isPartOfPiece && !hasExisting) {
          full = false;
          break;
        }
      }
      if (full) clearCols.push(c);
    }

    return { gridX, gridY, isValid: true, clearRows, clearCols };
  }

  // Attempt to place active dragged piece at (gridX, gridY)
  // ZERO-LATENCY: grid clears immediately, visual cascade runs asynchronously without input lock!
  public placePiece(
    dockIndex: number,
    gridX: number,
    gridY: number,
    getCellCoord: (c: number, r: number) => { x: number; y: number; size: number }
  ): boolean {
    if (this.isStuck) return false;
    const piece = this.dock[dockIndex];
    if (!piece) return false;

    const matrix = piece.shape.matrix;
    if (!this.canPlaceAt(matrix, gridX, gridY)) {
      sound.playInvalid();
      return false;
    }

    const mRows = matrix.length;
    const mCols = matrix[0].length;

    // Save snapshot for 1-Step Undo before modifying grid
    this.lastMoveSnapshot = {
      grid: this.grid.map((row) => row.map((cell) => (cell ? { ...cell } : null))),
      dock: this.dock.map((p) =>
        p
          ? {
              ...p,
              shape: {
                ...p.shape,
                matrix: p.shape.matrix.map((row) => [...row]),
              },
            }
          : null
      ),
      score: this.score,
      combo: this.combo,
      comboGraceMoves: this.comboGraceMoves,
      linesClearedTotal: this.linesClearedTotal,
      coins: this.coins,
    };
    this.movesCountThisGame++;
    this.idleSeconds = 0;
    this.activeHint = null;

    let tileCount = 0;
    const cellData: Cell = {
      color: piece.shape.color,
      gradient: piece.shape.gradient,
      borderColor: piece.shape.borderColor,
      shadowColor: piece.shape.shadowColor,
      colorKey: piece.shape.colorKey,
    };

    // Place tiles & trigger Jelly Bounce
    for (let r = 0; r < mRows; r++) {
      for (let c = 0; c < mCols; c++) {
        if (matrix[r][c] === 1) {
          this.grid[gridY + r][gridX + c] = { ...cellData };
          this.placedBounces.push({
            r: gridY + r,
            c: gridX + c,
            time: 0,
            duration: 0.28,
          });
          tileCount++;
        }
      }
    }

    this.stats.blocksPlaced += tileCount;

    // Remove from dock
    this.dock[dockIndex] = null;
    sound.playPlace();
    haptics.place();

    // Check line clears
    const rowsToClear: number[] = [];
    const colsToClear: number[] = [];

    for (let r = 0; r < BOARD_SIZE; r++) {
      if (this.grid[r].every((cell) => cell !== null)) {
        rowsToClear.push(r);
      }
    }

    for (let c = 0; c < BOARD_SIZE; c++) {
      let colFull = true;
      for (let r = 0; r < BOARD_SIZE; r++) {
        if (this.grid[r][c] === null) {
          colFull = false;
          break;
        }
      }
      if (colFull) colsToClear.push(c);
    }

    const totalLines = rowsToClear.length + colsToClear.length;

    if (totalLines > 0) {
      // 1. Upgrade Combo with 3-Move Grace Window!
      this.combo++;
      this.comboGraceMoves = 3; // Fully charge 3-move heartbeat
      if (this.combo > this.maxCombo) {
        this.maxCombo = this.combo;
      }
      if (this.combo > this.stats.maxCombo) {
        this.stats.maxCombo = this.combo;
      }
      this.linesClearedTotal += totalLines;
      this.stats.linesCleared += totalLines;

      // Unique cleared cells
      const clearedMap = new Map<string, { c: number; r: number }>();
      rowsToClear.forEach((r) => {
        for (let c = 0; c < BOARD_SIZE; c++) clearedMap.set(`${c},${r}`, { c, r });
      });
      colsToClear.forEach((c) => {
        for (let r = 0; r < BOARD_SIZE; r++) clearedMap.set(`${c},${r}`, { c, r });
      });

      // Sort cells for snappy wave cascade (0.014s step)
      const sortedCoords = Array.from(clearedMap.values()).sort((a, b) => a.r + a.c - (b.r + b.c));

      // Calculate centroid of cleared cells for floating text
      let sumX = 0;
      let sumY = 0;
      let gemsInThisClear = 0;

      for (let i = 0; i < sortedCoords.length; i++) {
        const pos = sortedCoords[i];
        const cell = this.grid[pos.r][pos.c]!;
        if (cell.hasGem) {
          gemsInThisClear++;
        }

        const coord = getCellCoord(pos.c, pos.r);
        sumX += coord.x + coord.size / 2;
        sumY += coord.y + coord.size / 2;

        this.visualDominoQueue.push({
          c: pos.c,
          r: pos.r,
          delay: i * 0.014, // Ultra-fast wave: max 0.22s total
          timer: 0,
          popped: false,
          cell,
        });

        // ZERO LATENCY: Clear grid cell immediately!
        this.grid[pos.r][pos.c] = null;
      }

      if (gemsInThisClear > 0) {
        this.dailyInfo.gemsCollected = (this.dailyInfo.gemsCollected || 0) + gemsInThisClear;
      }

      const centroidX = sumX / sortedCoords.length;
      const centroidY = sumY / sortedCoords.length;

      // Score calculation
      let multiLineBonus = 0;
      if (totalLines === 2) multiLineBonus = 25;
      else if (totalLines === 3) multiLineBonus = 70;
      else if (totalLines >= 4) multiLineBonus = 140;

      const linePoints = (totalLines * 10 + multiLineBonus) * (1 + (this.combo - 1) * 0.5);
      const earned = Math.round(tileCount + linePoints);
      this.score += earned;

      // Base: 10 coins per line + combo bonus
      const coinsEarned = totalLines * 10 + (this.combo > 1 ? this.combo * 5 : 0);
      this.addCoins(coinsEarned);

      // Milestone score check (earn +50 coins every 500 score points)
      if (Math.floor(this.score / 500) > Math.floor((this.score - earned) / 500)) {
        this.addCoins(50);
        this.particles.addFloatingText('+50 COINS!', 'MILESTONE!', centroidX, centroidY - 40, '#ffd600');
      }

      // Check for ALL CLEAR (64 cells completely clean!)
      let isAllClear = true;
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (this.grid[r][c] !== null) {
            isAllClear = false;
            break;
          }
        }
        if (!isAllClear) break;
      }

      if (isAllClear) {
        const allClearBonus = 300;
        const allClearCoins = 100;
        this.score += allClearBonus;
        this.addCoins(allClearCoins);
        this.stats.allClears = (this.stats.allClears || 0) + 1;
        sound.playAllClear();
        haptics.combo(6);
        this.screenShake = 16 * (this.comfortMode ? 0.35 : 1.0);
        this.particles.addShockwave(centroidX, centroidY, 260, '#ffd600');
        this.particles.addFloatingText('🌟 ALL CLEAR! 🌟', `+${allClearBonus} PTS & +${allClearCoins} 🪙`, centroidX, centroidY - 20, '#ffd600');
      } else {
        // Immediate audio and floating text response
        sound.playClear(totalLines);
        if (this.combo >= 2) {
          sound.playCombo(this.combo);
          haptics.combo(this.combo);
        } else {
          haptics.lineClear();
        }

        this.screenShake = Math.min(3 + totalLines * 2.5 + (this.combo > 2 ? 3 : 0), 14) * (this.comfortMode ? 0.35 : 1.0);

        let shout = 'COOL!';
        if (totalLines === 2) shout = 'GREAT!';
        else if (totalLines === 3) shout = 'CLEVER!';
        else if (totalLines === 4) shout = 'SUPERB!';
        else if (totalLines >= 5) shout = 'UNBELIEVABLE!';

        if (this.combo >= 2) {
          this.particles.addFloatingText(
            `COMBO x${this.combo}`,
            `${shout} +${earned} (+${coinsEarned} 🪙)`,
            centroidX,
            centroidY,
            '#ffd600'
          );
        } else {
          this.particles.addFloatingText(
            shout,
            `+${earned} (+${coinsEarned} 🪙)`,
            centroidX,
            centroidY,
            '#00e5ff'
          );
        }
      }

      // Check Daily Goal
      if (this.mode === 'daily' && !this.dailyGoalMet) {
        if (
          (this.dailyInfo.targetType === 'lines' && this.linesClearedTotal >= this.dailyInfo.targetValue) ||
          (this.dailyInfo.targetType === 'score' && this.score >= this.dailyInfo.targetValue) ||
          (this.dailyInfo.targetType === 'gems' && (this.dailyInfo.gemsCollected || 0) >= this.dailyInfo.targetValue)
        ) {
          this.triggerDailyGoalMet();
        }
      }

      this.checkAchievements(totalLines);
      this.updateDockPlaceableStatus();
    } else {
      // 2. Non-clearing move: Decrement 3-move combo grace window
      if (this.combo > 0) {
        this.comboGraceMoves--;
        if (this.comboGraceMoves <= 0) {
          this.combo = 0;
          this.comboGraceMoves = 0;
          sound.playComboLost();
        }
      }
      this.score += tileCount;
      this.updateDockPlaceableStatus();
    }

    // High score check in classic mode
    if (this.mode === 'classic') {
      if (this.score > this.bestScore) {
        this.bestScore = this.score;
        localStorage.setItem('blockblast_best_score', String(this.bestScore));
        if (!this.isNewHighScore && this.score >= 100) {
          this.isNewHighScore = true;
        }
      }
      if (this.score > this.stats.highScore) {
        this.stats.highScore = this.score;
      }
    }

    this.saveStats();
    this.checkAchievements();
    return true;
  }

  // --- BOOSTER ACTIONS & SHOP ---

  public isBoosterAllowed(): boolean {
    return this.mode === 'classic' || this.mode === 'relaxed';
  }

  // 1. Shuffle Booster
  public useShuffle(): boolean {
    if (!this.isBoosterAllowed()) return false;
    if (this.boosterUsageThisGame.shuffle >= this.boosterLimitsPerGame.shuffle) {
      sound.playInvalid();
      return false;
    }
    if (this.boosters.shuffle <= 0) return false;

    this.boosters.shuffle--;
    this.boosterUsageThisGame.shuffle++;
    this.saveBoosters();

    this.dealGuaranteedPlaceableShapes();
    sound.playShuffle();
    haptics.place();
    this.stats.boostersUsed++;
    this.saveStats();
    this.checkAchievements();
    this.isStuck = false;
    return true;
  }

  // 2. Rotate Booster Toggle / Action
  public toggleRotateMode(): ActiveInteractionMode {
    if (!this.isBoosterAllowed()) return 'none';
    if (this.boosterUsageThisGame.rotate >= this.boosterLimitsPerGame.rotate) {
      sound.playInvalid();
      return 'none';
    }

    if (this.activeMode === 'rotate') {
      this.activeMode = 'none';
    } else if (this.boosters.rotate > 0) {
      this.activeMode = 'rotate';
      this.isStuck = false; // Allow interaction
      sound.playPick();
    }
    return this.activeMode;
  }

  public rotateDockPiece(index: number): boolean {
    if (!this.isBoosterAllowed()) return false;
    if (this.activeMode !== 'rotate' || this.boosters.rotate <= 0) return false;
    if (this.boosterUsageThisGame.rotate >= this.boosterLimitsPerGame.rotate) return false;

    const piece = this.dock[index];
    if (!piece) return false;

    piece.shape.matrix = rotateMatrix(piece.shape.matrix);
    this.boosters.rotate--;
    this.boosterUsageThisGame.rotate++;
    this.saveBoosters();
    this.activeMode = 'none';

    sound.playRotate();
    haptics.tick();
    this.stats.boostersUsed++;
    this.saveStats();
    this.updateDockPlaceableStatus();
    this.checkAchievements();
    return true;
  }

  // 3. 3x3 Blast Hammer Booster Toggle / Action
  public toggleHammerMode(): ActiveInteractionMode {
    if (!this.isBoosterAllowed()) return 'none';
    if (this.boosterUsageThisGame.hammer >= this.boosterLimitsPerGame.hammer) {
      sound.playInvalid();
      return 'none';
    }

    if (this.activeMode === 'hammer') {
      this.activeMode = 'none';
    } else if (this.boosters.hammer > 0) {
      this.activeMode = 'hammer';
      this.isStuck = false; // Allow board interaction!
      sound.playPick();
    }
    return this.activeMode;
  }

  // UPGRADED: 3x3 Blast Hammer obliterates the targeted 3x3 area!
  public useHammerOnCell(
    centerC: number,
    centerR: number,
    getCellCoord: (c: number, r: number) => { x: number; y: number; size: number }
  ): boolean {
    if (!this.isBoosterAllowed()) return false;
    if (this.activeMode !== 'hammer' || this.boosters.hammer <= 0) return false;
    if (this.boosterUsageThisGame.hammer >= this.boosterLimitsPerGame.hammer) return false;

    let destroyedCount = 0;
    const centerPos = getCellCoord(centerC, centerR);

    // Blast 3x3 range
    for (let r = centerR - 1; r <= centerR + 1; r++) {
      for (let c = centerC - 1; c <= centerC + 1; c++) {
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
          const cell = this.grid[r][c];
          if (cell) {
            this.grid[r][c] = null;
            destroyedCount++;
            const pos = getCellCoord(c, r);
            this.particles.explodeBlock(pos.x, pos.y, cell.color, pos.size);
          }
        }
      }
    }

    if (destroyedCount === 0) {
      sound.playInvalid();
      return false;
    }

    this.boosters.hammer--;
    this.boosterUsageThisGame.hammer++;
    this.saveBoosters();
    this.activeMode = 'none';

    sound.playHammer();
    sound.playTNT();
    haptics.lineClear();
    this.screenShake = 14;

    this.particles.addShockwave(centerPos.x + centerPos.size / 2, centerPos.y + centerPos.size / 2, 160, '#ef4444');
    this.particles.addFloatingText('3x3 BLAST!', `-${destroyedCount} BLOCKS`, centerPos.x + centerPos.size / 2, centerPos.y, '#f59e0b');

    this.stats.boostersUsed++;
    this.saveStats();
    this.updateDockPlaceableStatus();
    this.checkAchievements();
    return true;
  }

  // --- SHOP & PURCHASES ---

  public buyBooster(type: BoosterType): boolean {
    const cost = BOOSTER_PRICES[type];
    if (this.coins < cost) {
      sound.playInvalid();
      return false;
    }
    if (this.boosters[type] >= MAX_HELD_BOOSTERS) {
      sound.playInvalid();
      return false;
    }

    this.spendCoins(cost);
    this.boosters[type]++;
    this.saveBoosters();
    sound.playAchievement();
    haptics.lineClear();
    return true;
  }

  public buyMegaPack(): boolean {
    if (this.coins < BOOSTER_PRICES.megaPack) {
      sound.playInvalid();
      return false;
    }
    this.spendCoins(BOOSTER_PRICES.megaPack);
    this.boosters.rotate = Math.min(MAX_HELD_BOOSTERS, this.boosters.rotate + 2);
    this.boosters.shuffle = Math.min(MAX_HELD_BOOSTERS, this.boosters.shuffle + 2);
    this.boosters.hammer = Math.min(MAX_HELD_BOOSTERS, this.boosters.hammer + 1);
    this.saveBoosters();
    sound.playAchievement();
    haptics.lineClear();
    return true;
  }

  // Claim Free Emergency Booster Rescue (Simulated Rewarded Ad)
  public claimFreeEmergencyRescue(): boolean {
    if (this.freeAdRescueUsed) return false;
    this.freeAdRescueUsed = true;
    this.boosters.shuffle = Math.min(MAX_HELD_BOOSTERS, this.boosters.shuffle + 1);
    this.saveBoosters();
    this.useShuffle();
    return true;
  }

  // Revive: Clears center 4x4 + Refills dock pieces to guarantee fit!
  public revive(getCellCoord: (c: number, r: number) => { x: number; y: number; size: number }): boolean {
    if (!this.canRevive) return false;

    this.canRevive = false;
    this.isGameOver = false;
    this.isStuck = false;

    for (let r = 2; r <= 5; r++) {
      for (let c = 2; c <= 5; c++) {
        const cell = this.grid[r][c];
        if (cell) {
          const pos = getCellCoord(c, r);
          this.particles.explodeBlock(pos.x, pos.y, cell.color, pos.size);
          this.grid[r][c] = null;
        }
      }
    }

    // Refresh dock with fresh placeable shapes guaranteed to fit
    this.dealGuaranteedPlaceableShapes();

    sound.playRevive();
    haptics.lineClear();
    this.updateDockPlaceableStatus();
    return true;
  }

  public dismissStuckAndGameOver() {
    this.isStuck = false;
    this.triggerGameOver();
  }

  private triggerGameOver() {
    this.isGameOver = true;
    sound.playGameOver();
    haptics.gameOver();
  }

  // --- DAILY CHALLENGE & STREAKS ---

  public getTodayDateKey(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  public getYesterdayDateKey(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  public getTodayDailyChallenge(): DailyChallengeInfo {
    const dateKey = this.getTodayDateKey();
    const completed = this.dailyStreak.completedDates.includes(dateKey);
    const seed = hashStringToSeed(dateKey);
    const prng = createMulberry32(seed);

    const typeRoll = Math.floor(prng() * 3);
    const targetType: 'lines' | 'score' | 'gems' =
      typeRoll === 0 ? 'gems' : typeRoll === 1 ? 'lines' : 'score';

    let targetValue = 10;
    if (targetType === 'gems') {
      targetValue = 6 + Math.floor(prng() * 6); // 6-11 gems
    } else if (targetType === 'lines') {
      targetValue = 12 + Math.floor(prng() * 8); // 12-19 lines
    } else {
      targetValue = 1200 + Math.floor(prng() * 8) * 100; // 1200-1900 pts
    }

    return {
      dateKey,
      targetType,
      targetValue,
      completed,
      rewardCoins: 100,
      gemsCollected: 0,
    };
  }

  private loadDailyStreak(): DailyStreakState {
    const raw = localStorage.getItem('blockblast_daily_streak');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        // Verify streak freshness: if last completed was before yesterday, streak resets to 0
        const yesterday = this.getYesterdayDateKey();
        const today = this.getTodayDateKey();
        const last = parsed.lastCompletedDate;
        let streak = parsed.currentStreak || 0;
        if (last && last !== yesterday && last !== today) {
          streak = 0;
        }

        return {
          currentStreak: streak,
          bestStreak: parsed.bestStreak || streak,
          lastCompletedDate: last || '',
          completedDates: parsed.completedDates || [],
        };
      } catch {}
    }
    return {
      currentStreak: 0,
      bestStreak: 0,
      lastCompletedDate: '',
      completedDates: [],
    };
  }

  public saveDailyStreak() {
    localStorage.setItem('blockblast_daily_streak', JSON.stringify(this.dailyStreak));
  }

  public triggerDailyGoalMet() {
    this.dailyGoalMet = true;
    this.dailyInfo.completed = true;

    const today = this.getTodayDateKey();
    if (!this.dailyStreak.completedDates.includes(today)) {
      this.dailyStreak.completedDates.push(today);
      this.dailyStreak.lastCompletedDate = today;
      this.dailyStreak.currentStreak++;
      if (this.dailyStreak.currentStreak > this.dailyStreak.bestStreak) {
        this.dailyStreak.bestStreak = this.dailyStreak.currentStreak;
      }
      this.saveDailyStreak();

      // Award bonus coins!
      this.addCoins(this.dailyInfo.rewardCoins);
      this.stats.dailyCompleted++;
      this.saveStats();
      this.checkAchievements();

      if (this.onDailyVictoryCallback) {
        this.onDailyVictoryCallback();
      }
    }
  }

  // --- STATS & ACHIEVEMENTS ---

  private loadStats(): UserStats {
    const raw = localStorage.getItem('blockblast_stats');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return {
          gamesPlayed: parsed.gamesPlayed || 0,
          highScore: parsed.highScore || this.bestScore,
          maxCombo: parsed.maxCombo || 0,
          linesCleared: parsed.linesCleared || 0,
          blocksPlaced: parsed.blocksPlaced || 0,
          boostersUsed: parsed.boostersUsed || 0,
          coinsEarned: parsed.coinsEarned || 0,
          dailyCompleted: parsed.dailyCompleted || 0,
          allClears: parsed.allClears || 0,
        };
      } catch {}
    }
    return {
      gamesPlayed: 0,
      highScore: this.bestScore,
      maxCombo: 0,
      linesCleared: 0,
      blocksPlaced: 0,
      boostersUsed: 0,
      coinsEarned: 0,
      dailyCompleted: 0,
      allClears: 0,
    };
  }

  public saveStats() {
    localStorage.setItem('blockblast_stats', JSON.stringify(this.stats));
  }

  private initAchievements(): Achievement[] {
    return [
      {
        id: 'first_game',
        title: 'First Step',
        desc: 'Complete your first game',
        icon: '🐣',
        unlocked: false,
        progress: 0,
        maxProgress: 1,
      },
      {
        id: 'combo_3',
        title: 'Combo Starter',
        desc: 'Achieve a 3x combo streak',
        icon: '⚡',
        unlocked: false,
        progress: 0,
        maxProgress: 3,
      },
      {
        id: 'combo_5',
        title: 'Combo Master',
        desc: 'Achieve a 5x combo streak',
        icon: '🔥',
        unlocked: false,
        progress: 0,
        maxProgress: 5,
      },
      {
        id: 'combo_7',
        title: 'Combo Legend',
        desc: 'Achieve an epic 7x combo streak',
        icon: '🌟',
        unlocked: false,
        progress: 0,
        maxProgress: 7,
      },
      {
        id: 'triple_clear',
        title: 'Triple Blast',
        desc: 'Clear 3 lines in a single placement',
        icon: '💥',
        unlocked: false,
        progress: 0,
        maxProgress: 3,
      },
      {
        id: 'all_clear',
        title: 'Clean Sweep',
        desc: 'Completely clear the entire 8x8 board',
        icon: '🧹',
        unlocked: false,
        progress: 0,
        maxProgress: 1,
      },
      {
        id: 'score_1000',
        title: 'Score Hunter',
        desc: 'Reach 1,000 points in one game',
        icon: '🎯',
        unlocked: false,
        progress: 0,
        maxProgress: 1000,
      },
      {
        id: 'score_5000',
        title: 'Puzzle Champion',
        desc: 'Reach 5,000 points in one game',
        icon: '👑',
        unlocked: false,
        progress: 0,
        maxProgress: 5000,
      },
      {
        id: 'booster_fan',
        title: 'Tool Specialist',
        desc: 'Use in-game boosters 5 times',
        icon: '🔨',
        unlocked: false,
        progress: 0,
        maxProgress: 5,
      },
      {
        id: 'lines_50',
        title: 'Line Sweeper',
        desc: 'Clear 50 total lines',
        icon: '🧱',
        unlocked: false,
        progress: 0,
        maxProgress: 50,
      },
      {
        id: 'daily_first',
        title: 'Daily Challenger',
        desc: 'Complete your first Daily Challenge',
        icon: '📅',
        unlocked: false,
        progress: 0,
        maxProgress: 1,
      },
    ];
  }

  private loadAchievements() {
    const raw = localStorage.getItem('blockblast_achievements');
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        for (const item of this.achievements) {
          const match = saved.find((s: Achievement) => s.id === item.id);
          if (match) {
            item.unlocked = match.unlocked;
            item.progress = match.progress;
          }
        }
      } catch {}
    }
  }

  public saveAchievements() {
    localStorage.setItem('blockblast_achievements', JSON.stringify(this.achievements));
  }

  public checkAchievements(justClearedLines: number = 0) {
    this.newlyUnlockedAchievements = [];

    for (const ach of this.achievements) {
      if (ach.unlocked) continue;
      let shouldUnlock = false;

      switch (ach.id) {
        case 'first_game':
          ach.progress = this.stats.gamesPlayed;
          if (this.stats.gamesPlayed >= 1) shouldUnlock = true;
          break;
        case 'combo_3':
          ach.progress = Math.max(ach.progress, this.combo);
          if (this.combo >= 3) shouldUnlock = true;
          break;
        case 'combo_5':
          ach.progress = Math.max(ach.progress, this.combo);
          if (this.combo >= 5) shouldUnlock = true;
          break;
        case 'combo_7':
          ach.progress = Math.max(ach.progress, this.combo);
          if (this.combo >= 7) shouldUnlock = true;
          break;
        case 'triple_clear':
          if (justClearedLines >= 3) {
            ach.progress = 3;
            shouldUnlock = true;
          }
          break;
        case 'all_clear':
          ach.progress = this.stats.allClears || 0;
          if ((this.stats.allClears || 0) >= 1) shouldUnlock = true;
          break;
        case 'score_1000':
          ach.progress = Math.max(ach.progress, this.score);
          if (this.score >= 1000) shouldUnlock = true;
          break;
        case 'score_5000':
          ach.progress = Math.max(ach.progress, this.score);
          if (this.score >= 5000) shouldUnlock = true;
          break;
        case 'booster_fan':
          ach.progress = this.stats.boostersUsed;
          if (this.stats.boostersUsed >= 5) shouldUnlock = true;
          break;
        case 'lines_50':
          ach.progress = this.stats.linesCleared;
          if (this.stats.linesCleared >= 50) shouldUnlock = true;
          break;
        case 'daily_first':
          ach.progress = this.stats.dailyCompleted;
          if (this.stats.dailyCompleted >= 1) shouldUnlock = true;
          break;
      }

      if (shouldUnlock) {
        ach.unlocked = true;
        this.newlyUnlockedAchievements.push(ach);
        this.addCoins(50);
        sound.playAchievement();
      }
    }

    if (this.newlyUnlockedAchievements.length > 0) {
      this.saveAchievements();
    }
  }

  // --- SENIOR & NON-GAMER ASSIST (UNDO & HINT) ---

  public canUndo(): { allowed: boolean; isFree: boolean; cost: number; reason?: string } {
    if (this.isGameOver) {
      return { allowed: false, isFree: false, cost: UNDO_COIN_PRICE, reason: 'Game over' };
    }
    if (!this.lastMoveSnapshot) {
      return { allowed: false, isFree: false, cost: UNDO_COIN_PRICE, reason: 'No move to undo' };
    }

    const isFree = this.mode === 'relaxed' || this.undoFreeTrialRemaining > 0;
    if (isFree) {
      return { allowed: true, isFree: true, cost: 0 };
    }

    if (this.coins >= UNDO_COIN_PRICE) {
      return { allowed: true, isFree: false, cost: UNDO_COIN_PRICE };
    }

    return {
      allowed: false,
      isFree: false,
      cost: UNDO_COIN_PRICE,
      reason: `Need ${UNDO_COIN_PRICE} coins`,
    };
  }

  public undoLastMove(): boolean {
    const status = this.canUndo();
    if (!status.allowed || !this.lastMoveSnapshot) {
      sound.playInvalid();
      return false;
    }

    if (!status.isFree) {
      this.spendCoins(status.cost);
    } else if (this.mode !== 'relaxed') {
      this.undoFreeTrialRemaining = Math.max(0, this.undoFreeTrialRemaining - 1);
    }

    const snap = this.lastMoveSnapshot;
    this.grid = snap.grid.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
    this.dock = snap.dock.map((p) =>
      p
        ? {
            ...p,
            shape: {
              ...p.shape,
              matrix: p.shape.matrix.map((row) => [...row]),
            },
          }
        : null
    );
    this.score = snap.score;
    this.combo = snap.combo;
    this.comboGraceMoves = snap.comboGraceMoves;
    this.linesClearedTotal = snap.linesClearedTotal;

    this.lastMoveSnapshot = null;
    this.activeHint = null;
    this.idleSeconds = 0;
    this.isStuck = false;
    this.updateDockPlaceableStatus();

    sound.playShuffle();
    haptics.tick();
    return true;
  }

  public canGetHint(): { allowed: boolean; isFree: boolean; cost: number; reason?: string } {
    if (this.isGameOver) {
      return { allowed: false, isFree: false, cost: HINT_COIN_PRICE, reason: 'Game over' };
    }
    const hasPlaceable = this.dock.some((p) => p && p.canPlace);
    if (!hasPlaceable) {
      return { allowed: false, isFree: false, cost: HINT_COIN_PRICE, reason: 'No placeable pieces' };
    }

    const isFree = this.mode === 'relaxed' || this.hintFreeTrialRemaining > 0;
    if (isFree) {
      return { allowed: true, isFree: true, cost: 0 };
    }

    if (this.coins >= HINT_COIN_PRICE) {
      return { allowed: true, isFree: false, cost: HINT_COIN_PRICE };
    }

    return {
      allowed: false,
      isFree: false,
      cost: HINT_COIN_PRICE,
      reason: `Need ${HINT_COIN_PRICE} coins`,
    };
  }

  public requestHint(): boolean {
    const status = this.canGetHint();
    if (!status.allowed) {
      sound.playInvalid();
      return false;
    }

    const hint = this.findBestMoveHint();
    if (!hint) {
      sound.playInvalid();
      return false;
    }

    if (!status.isFree) {
      this.spendCoins(status.cost);
    } else if (this.mode !== 'relaxed') {
      this.hintFreeTrialRemaining = Math.max(0, this.hintFreeTrialRemaining - 1);
    }

    this.activeHint = hint;
    sound.playPick();
    haptics.tick();
    return true;
  }

  public findBestMoveHint(): MoveHint | null {
    let bestHint: MoveHint | null = null;
    let highestScore = -Infinity;

    for (let dockIndex = 0; dockIndex < this.dock.length; dockIndex++) {
      const piece = this.dock[dockIndex];
      if (!piece || !piece.canPlace) continue;

      const rows = piece.shape.matrix.length;
      const cols = piece.shape.matrix[0].length;

      for (let r = 0; r <= BOARD_SIZE - rows; r++) {
        for (let c = 0; c <= BOARD_SIZE - cols; c++) {
          const preview = this.computePreview(piece.shape, c, r);
          if (!preview.isValid) continue;

          const linesCleared = preview.clearRows.length + preview.clearCols.length;
          let evalScore = linesCleared * 1000;
          if (r === 0 || r + rows === BOARD_SIZE) evalScore += 15;
          if (c === 0 || c + cols === BOARD_SIZE) evalScore += 15;
          evalScore -= dockIndex * 2;

          if (evalScore > highestScore) {
            highestScore = evalScore;
            bestHint = {
              dockIndex,
              gridX: c,
              gridY: r,
              clearsLines: linesCleared,
            };
          }
        }
      }
    }

    return bestHint;
  }

  // --- GAME TICK & VISUAL CASCADE UPDATE ---

  public update(dt: number, getCellCoord?: (c: number, r: number) => { x: number; y: number; size: number }) {
    this.particles.update(dt);

    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 25);
    }

    // 7-second Auto-Hint for Seniors / Beginners
    if (!this.isGameOver && !this.isStuck && !this.activeHint) {
      this.idleSeconds += dt;
      if (this.idleSeconds >= 7) {
        if (this.mode === 'relaxed' || this.hintFreeTrialRemaining > 0) {
          const hint = this.findBestMoveHint();
          if (hint) {
            this.activeHint = hint;
          }
        }
      }
    }

    // Update Jelly Bounce animations
    for (let i = this.placedBounces.length - 1; i >= 0; i--) {
      const b = this.placedBounces[i];
      b.time += dt;
      if (b.time >= b.duration) {
        this.placedBounces.splice(i, 1);
      }
    }

    // Update Visual Domino Cascade wave (purely decorative, doesn't lock board inputs!)
    if (this.visualDominoQueue.length > 0 && getCellCoord) {
      const totalInWave = this.visualDominoQueue.length;
      for (let i = this.visualDominoQueue.length - 1; i >= 0; i--) {
        const item = this.visualDominoQueue[i];
        if (item.popped) {
          // Fade popped visual
          this.visualDominoQueue.splice(i, 1);
          continue;
        }

        item.timer += dt;
        if (item.timer >= item.delay) {
          item.popped = true;
          const pos = getCellCoord(item.c, item.r);
          this.particles.explodeBlock(pos.x, pos.y, item.cell.color, pos.size);
          sound.playDominoPop(i, totalInWave);
          haptics.tick();
        }
      }
    }
  }
}
