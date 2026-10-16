export type ThemeId = 'neon' | 'wood' | 'candy';

export type BoosterType = 'rotate' | 'shuffle' | 'hammer';

export type ActiveInteractionMode = 'none' | 'hammer' | 'rotate';

export type GameMode = 'classic' | 'daily';

export type PaletteKey =
  | 'blue'
  | 'cyan'
  | 'emerald'
  | 'lime'
  | 'gold'
  | 'orange'
  | 'ruby'
  | 'purple'
  | 'pink';

export interface Cell {
  color: string;
  gradient: [string, string];
  borderColor: string;
  shadowColor: string;
  colorKey?: PaletteKey;
  hasGem?: boolean;
}

export type BoardGrid = (Cell | null)[][];

export interface ShapeDefinition {
  id: string;
  name: string;
  matrix: number[][]; // 2D binary grid (1 for block, 0 for empty)
  colorKey: PaletteKey;
  color: string;
  gradient: [string, string];
  borderColor: string;
  shadowColor: string;
}

export interface DockPiece {
  id: string;
  shape: ShapeDefinition;
  canPlace: boolean;
  scale: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  rotation: number;
  vRot: number;
  life: number;
  maxLife: number;
  isStar?: boolean;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface FloatingText {
  id: number;
  text: string;
  subText?: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  scale: number;
  vy: number;
  life: number;
  maxLife: number;
}

export interface PlacedBounce {
  r: number;
  c: number;
  time: number;
  duration: number;
}

export interface VisualDominoCell {
  c: number;
  r: number;
  delay: number;
  timer: number;
  popped: boolean;
  cell: Cell;
}

export interface UserStats {
  gamesPlayed: number;
  highScore: number;
  maxCombo: number;
  linesCleared: number;
  blocksPlaced: number;
  boostersUsed: number;
  coinsEarned: number;
  dailyCompleted: number;
  allClears: number;
}

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
}

export interface DailyChallengeInfo {
  dateKey: string; // YYYY-MM-DD
  targetType: 'lines' | 'score' | 'gems';
  targetValue: number;
  completed: boolean;
  rewardCoins: number;
  gemsCollected: number;
}

export interface DailyStreakState {
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate: string;
  completedDates: string[]; // Set of YYYY-MM-DD strings
}
