import { PaletteKey, ShapeDefinition, ThemeId } from './types';

export interface PaletteEntry {
  color: string;
  gradient: [string, string];
  borderColor: string;
  shadowColor: string;
}

export const THEME_PALETTES: Record<ThemeId, Record<PaletteKey, PaletteEntry>> = {
  neon: {
    blue: {
      color: '#3d8bff',
      gradient: ['#69a6ff', '#1f65d6'],
      borderColor: '#9bc4ff',
      shadowColor: 'rgba(31, 101, 214, 0.4)',
    },
    cyan: {
      color: '#00e5ff',
      gradient: ['#62efff', '#00b4d8'],
      borderColor: '#a7f7ff',
      shadowColor: 'rgba(0, 180, 216, 0.4)',
    },
    emerald: {
      color: '#00e676',
      gradient: ['#66ffa6', '#00b348'],
      borderColor: '#b9ffd7',
      shadowColor: 'rgba(0, 179, 72, 0.4)',
    },
    lime: {
      color: '#aeea00',
      gradient: ['#cfff4f', '#82b800'],
      borderColor: '#e8ff9a',
      shadowColor: 'rgba(130, 184, 0, 0.4)',
    },
    gold: {
      color: '#ffd600',
      gradient: ['#ffea60', '#d49b00'],
      borderColor: '#fff5b0',
      shadowColor: 'rgba(212, 155, 0, 0.4)',
    },
    orange: {
      color: '#ff9100',
      gradient: ['#ffb74d', '#e65100'],
      borderColor: '#ffe0b2',
      shadowColor: 'rgba(230, 81, 0, 0.4)',
    },
    ruby: {
      color: '#ff1744',
      gradient: ['#ff616f', '#b20023'],
      borderColor: '#ffb3ba',
      shadowColor: 'rgba(178, 0, 35, 0.4)',
    },
    purple: {
      color: '#d500f9',
      gradient: ['#ea66ff', '#9500ae'],
      borderColor: '#f5b5ff',
      shadowColor: 'rgba(149, 0, 174, 0.4)',
    },
    pink: {
      color: '#ff4081',
      gradient: ['#ff79b0', '#c60055'],
      borderColor: '#ffc1d7',
      shadowColor: 'rgba(198, 0, 85, 0.4)',
    },
  },
  wood: {
    blue: {
      color: '#718096',
      gradient: ['#a0aec0', '#4a5568'],
      borderColor: '#e2e8f0',
      shadowColor: 'rgba(45, 55, 72, 0.4)',
    },
    cyan: {
      color: '#8b9bb4',
      gradient: ['#b0c4de', '#5f738e'],
      borderColor: '#dbe4ee',
      shadowColor: 'rgba(74, 85, 104, 0.4)',
    },
    emerald: {
      color: '#658b6f',
      gradient: ['#8db698', '#42614b'],
      borderColor: '#c0d9c7',
      shadowColor: 'rgba(47, 79, 56, 0.4)',
    },
    lime: {
      color: '#a3a847',
      gradient: ['#c9ce6e', '#7c8125'],
      borderColor: '#e5e8a9',
      shadowColor: 'rgba(94, 98, 25, 0.4)',
    },
    gold: {
      color: '#d4a373',
      gradient: ['#faedcd', '#b08968'],
      borderColor: '#fefae0',
      shadowColor: 'rgba(127, 85, 57, 0.4)',
    },
    orange: {
      color: '#c97a3e',
      gradient: ['#dda15e', '#9c5927'],
      borderColor: '#f3d3b1',
      shadowColor: 'rgba(130, 60, 20, 0.4)',
    },
    ruby: {
      color: '#a2484b',
      gradient: ['#c86d70', '#7a282b'],
      borderColor: '#e5abab',
      shadowColor: 'rgba(90, 25, 27, 0.4)',
    },
    purple: {
      color: '#6f5272',
      gradient: ['#99739d', '#4d3350'],
      borderColor: '#c6adc9',
      shadowColor: 'rgba(60, 35, 62, 0.4)',
    },
    pink: {
      color: '#b56576',
      gradient: ['#d68c9c', '#8a3c4d'],
      borderColor: '#ebd2d8',
      shadowColor: 'rgba(110, 40, 55, 0.4)',
    },
  },
  candy: {
    blue: {
      color: '#4cc9f0',
      gradient: ['#80e5ff', '#1ea3cc'],
      borderColor: '#c7f4ff',
      shadowColor: 'rgba(30, 163, 204, 0.4)',
    },
    cyan: {
      color: '#48bfe3',
      gradient: ['#72efdd', '#2a9bbd'],
      borderColor: '#b8f8ef',
      shadowColor: 'rgba(42, 155, 189, 0.4)',
    },
    emerald: {
      color: '#52b788',
      gradient: ['#74c69d', '#2d6a4f'],
      borderColor: '#b7e4c7',
      shadowColor: 'rgba(45, 106, 79, 0.4)',
    },
    lime: {
      color: '#9ef01a',
      gradient: ['#ccff33', '#70e000'],
      borderColor: '#eeff99',
      shadowColor: 'rgba(112, 224, 0, 0.4)',
    },
    gold: {
      color: '#fee440',
      gradient: ['#fff385', '#f3ca20'],
      borderColor: '#fffce0',
      shadowColor: 'rgba(243, 202, 32, 0.4)',
    },
    orange: {
      color: '#ff9e00',
      gradient: ['#ffb703', '#e85d04'],
      borderColor: '#ffe5a0',
      shadowColor: 'rgba(232, 93, 4, 0.4)',
    },
    ruby: {
      color: '#f72585',
      gradient: ['#ff4d9e', '#b5179e'],
      borderColor: '#ffcce3',
      shadowColor: 'rgba(247, 37, 133, 0.4)',
    },
    purple: {
      color: '#7209b7',
      gradient: ['#9d4edd', '#560bad'],
      borderColor: '#e0aaff',
      shadowColor: 'rgba(114, 9, 183, 0.4)',
    },
    pink: {
      color: '#ff70a6',
      gradient: ['#ff99c8', '#e03a7a'],
      borderColor: '#ffebf3',
      shadowColor: 'rgba(255, 112, 166, 0.4)',
    },
  },
};

export const PALETTE = THEME_PALETTES.neon;

export interface RawShapeTemplate {
  id: string;
  name: string;
  matrix: number[][];
  colorKey: PaletteKey;
  tier: 1 | 2 | 3;
}

export const RAW_SHAPES: RawShapeTemplate[] = [
  // --- TIER 1: Builder & Friendly Shapes (Clean fit, combo setup) ---
  { id: 'dot_1', name: '1x1 Dot', matrix: [[1]], colorKey: 'gold', tier: 1 },
  { id: 'line_2_h', name: '1x2 Line', matrix: [[1, 1]], colorKey: 'cyan', tier: 1 },
  { id: 'line_2_v', name: '2x1 Line', matrix: [[1], [1]], colorKey: 'cyan', tier: 1 },
  { id: 'line_3_h', name: '1x3 Line', matrix: [[1, 1, 1]], colorKey: 'blue', tier: 1 },
  { id: 'line_3_v', name: '3x1 Line', matrix: [[1], [1], [1]], colorKey: 'blue', tier: 1 },
  { id: 'square_2', name: '2x2 Square', matrix: [[1, 1], [1, 1]], colorKey: 'orange', tier: 1 },
  { id: 'corner_tl', name: 'Corner TL', matrix: [[1, 1], [1, 0]], colorKey: 'pink', tier: 1 },
  { id: 'corner_tr', name: 'Corner TR', matrix: [[1, 1], [0, 1]], colorKey: 'pink', tier: 1 },
  { id: 'corner_bl', name: 'Corner BL', matrix: [[1, 0], [1, 1]], colorKey: 'pink', tier: 1 },
  { id: 'corner_br', name: 'Corner BR', matrix: [[0, 1], [1, 1]], colorKey: 'pink', tier: 1 },

  // --- TIER 2: Standard Strategic Shapes (Multi-line clearing power) ---
  { id: 'line_4_h', name: '1x4 Line', matrix: [[1, 1, 1, 1]], colorKey: 'emerald', tier: 2 },
  { id: 'line_4_v', name: '4x1 Line', matrix: [[1], [1], [1], [1]], colorKey: 'emerald', tier: 2 },
  { id: 'rect_2x3', name: '2x3 Rectangle', matrix: [[1, 1, 1], [1, 1, 1]], colorKey: 'gold', tier: 2 },
  { id: 'rect_3x2', name: '3x2 Rectangle', matrix: [[1, 1], [1, 1], [1, 1]], colorKey: 'gold', tier: 2 },
  { id: 'tetris_l_1', name: 'Tetris L 1', matrix: [[1, 0], [1, 0], [1, 1]], colorKey: 'orange', tier: 2 },
  { id: 'tetris_l_2', name: 'Tetris L 2', matrix: [[0, 1], [0, 1], [1, 1]], colorKey: 'orange', tier: 2 },
  { id: 'tetris_l_3', name: 'Tetris L 3', matrix: [[1, 1, 1], [1, 0, 0]], colorKey: 'orange', tier: 2 },
  { id: 'tetris_l_4', name: 'Tetris L 4', matrix: [[1, 1, 1], [0, 0, 1]], colorKey: 'orange', tier: 2 },
  { id: 'tetris_j_1', name: 'Tetris J 1', matrix: [[1, 1], [1, 0], [1, 0]], colorKey: 'blue', tier: 2 },
  { id: 'tetris_j_2', name: 'Tetris J 2', matrix: [[1, 1], [0, 1], [0, 1]], colorKey: 'blue', tier: 2 },
  { id: 'tetris_j_3', name: 'Tetris J 3', matrix: [[0, 0, 1], [1, 1, 1]], colorKey: 'blue', tier: 2 },
  { id: 'tetris_j_4', name: 'Tetris J 4', matrix: [[1, 0, 0], [1, 1, 1]], colorKey: 'blue', tier: 2 },
  { id: 't_shape_up', name: 'T-Shape Up', matrix: [[0, 1, 0], [1, 1, 1]], colorKey: 'purple', tier: 2 },
  { id: 't_shape_down', name: 'T-Shape Down', matrix: [[1, 1, 1], [0, 1, 0]], colorKey: 'purple', tier: 2 },
  { id: 't_shape_left', name: 'T-Shape Left', matrix: [[0, 1], [1, 1], [0, 1]], colorKey: 'purple', tier: 2 },
  { id: 't_shape_right', name: 'T-Shape Right', matrix: [[1, 0], [1, 1], [1, 0]], colorKey: 'purple', tier: 2 },
  { id: 's_shape_h', name: 'S-Shape H', matrix: [[0, 1, 1], [1, 1, 0]], colorKey: 'lime', tier: 2 },
  { id: 's_shape_v', name: 'S-Shape V', matrix: [[1, 0], [1, 1], [0, 1]], colorKey: 'lime', tier: 2 },
  { id: 'z_shape_h', name: 'Z-Shape H', matrix: [[1, 1, 0], [0, 1, 1]], colorKey: 'ruby', tier: 2 },
  { id: 'z_shape_v', name: 'Z-Shape V', matrix: [[0, 1], [1, 1], [1, 0]], colorKey: 'ruby', tier: 2 },

  // --- TIER 3: Heavy & Giant Challenge Shapes (High risk, high tension) ---
  { id: 'square_3', name: '3x3 Square', matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], colorKey: 'ruby', tier: 3 },
  { id: 'line_5_h', name: '1x5 Line', matrix: [[1, 1, 1, 1, 1]], colorKey: 'ruby', tier: 3 },
  { id: 'line_5_v', name: '5x1 Line', matrix: [[1], [1], [1], [1], [1]], colorKey: 'ruby', tier: 3 },
  { id: 'big_corner_tl', name: 'Big Corner TL', matrix: [[1, 1, 1], [1, 0, 0], [1, 0, 0]], colorKey: 'purple', tier: 3 },
  { id: 'big_corner_tr', name: 'Big Corner TR', matrix: [[1, 1, 1], [0, 0, 1], [0, 0, 1]], colorKey: 'purple', tier: 3 },
  { id: 'big_corner_bl', name: 'Big Corner BL', matrix: [[1, 0, 0], [1, 0, 0], [1, 1, 1]], colorKey: 'purple', tier: 3 },
  { id: 'big_corner_br', name: 'Big Corner BR', matrix: [[0, 0, 1], [0, 0, 1], [1, 1, 1]], colorKey: 'purple', tier: 3 },
  { id: 'cross_plus', name: 'Cross Plus', matrix: [[0, 1, 0], [1, 1, 1], [0, 1, 0]], colorKey: 'emerald', tier: 3 },
  { id: 'diag_2_a', name: 'Diagonal A', matrix: [[1, 0], [0, 1]], colorKey: 'pink', tier: 3 },
  { id: 'diag_2_b', name: 'Diagonal B', matrix: [[0, 1], [1, 0]], colorKey: 'pink', tier: 3 },
];

export function getShapesForTheme(theme: ThemeId): ShapeDefinition[] {
  const palette = THEME_PALETTES[theme] || THEME_PALETTES.neon;
  return RAW_SHAPES.map((item) => ({
    id: item.id,
    name: item.name,
    matrix: item.matrix,
    colorKey: item.colorKey,
    ...palette[item.colorKey],
  }));
}

export const SHAPE_TEMPLATES: ShapeDefinition[] = getShapesForTheme('neon');

// 90-degree clockwise rotation helper
export function rotateMatrix(matrix: number[][]): number[][] {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const result: number[][] = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      result[c][rows - 1 - r] = matrix[r][c];
    }
  }
  return result;
}

// Deterministic Pseudo-Random Number Generator (Mulberry32)
export function createMulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStringToSeed(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Deal 3 shapes using intelligent tier weighting and diversity rules.
 * Hand Diversity Constraints:
 * 1. Maximum 1 Tier-3 (Heavy) piece per hand of 3 (prevents unfair board locks).
 * 2. No 3 identical piece IDs in the same hand.
 * 3. Dynamic pacing: early score introduces gentle builder shapes.
 */
export function dealWeightedHand(
  theme: ThemeId,
  score: number = 0,
  rng: () => number = Math.random
): ShapeDefinition[] {
  const palette = THEME_PALETTES[theme] || THEME_PALETTES.neon;

  const tier1Shapes = RAW_SHAPES.filter((s) => s.tier === 1);
  const tier2Shapes = RAW_SHAPES.filter((s) => s.tier === 2);
  const tier3Shapes = RAW_SHAPES.filter((s) => s.tier === 3);

  // Dynamic Tier Probabilities based on Score
  let pTier1 = 0.45;
  let pTier2 = 0.40;
  if (score < 600) {
    pTier1 = 0.60;
    pTier2 = 0.35;
  } else if (score < 2500) {
    pTier1 = 0.45;
    pTier2 = 0.40;
  } else {
    pTier1 = 0.35;
    pTier2 = 0.45;
  }

  const hand: RawShapeTemplate[] = [];
  let heavyCount = 0;

  for (let i = 0; i < 3; i++) {
    let chosen: RawShapeTemplate | null = null;
    let attempts = 0;

    while (!chosen && attempts < 20) {
      attempts++;
      const roll = rng();

      // If heavy cap already reached for this hand, force tier 1 or 2
      let selectedTier = 1;
      if (heavyCount >= 1) {
        selectedTier = roll < (pTier1 / (pTier1 + pTier2)) ? 1 : 2;
      } else {
        if (roll < pTier1) {
          selectedTier = 1;
        } else if (roll < pTier1 + pTier2) {
          selectedTier = 2;
        } else {
          selectedTier = 3;
        }
      }

      const pool =
        selectedTier === 1 ? tier1Shapes : selectedTier === 2 ? tier2Shapes : tier3Shapes;
      const candidate = pool[Math.floor(rng() * pool.length)];

      // Diversity rule: Don't allow 3 identical IDs in a single hand
      if (hand.length === 2 && hand[0].id === candidate.id && hand[1].id === candidate.id) {
        continue;
      }

      chosen = candidate;
    }

    if (!chosen) {
      chosen = tier1Shapes[Math.floor(rng() * tier1Shapes.length)];
    }

    if (chosen.tier === 3) {
      heavyCount++;
    }
    hand.push(chosen);
  }

  return hand.map((item) => ({
    id: item.id,
    name: item.name,
    matrix: item.matrix,
    colorKey: item.colorKey,
    ...palette[item.colorKey],
  }));
}
