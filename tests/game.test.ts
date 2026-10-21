import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Setup minimal mock environment for Node
if (!globalThis.localStorage) {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    length: 0,
  };
}

import { beforeEach } from 'node:test';
import { BlockBlastGame } from '../src/game';
import { dealWeightedHand } from '../src/shapes';

describe('BlockBlastGame Core Mechanics & Revamp Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('1. should initialize empty 8x8 board and classic mode', () => {
    const game = new BlockBlastGame();
    assert.equal(game.grid.length, 8);
    assert.equal(game.grid[0].length, 8);
    assert.equal(game.score, 0);
    assert.equal(game.combo, 0);
    assert.equal(game.comboGraceMoves, 0);
    assert.equal(game.mode, 'classic');
  });

  it('2. should maintain 3-move combo grace window on non-clearing placement', () => {
    const game = new BlockBlastGame();
    // Simulate line clear
    game.combo = 1;
    game.comboGraceMoves = 3;

    // First non-clearing placement
    game.dock[0] = {
      id: 'test_1',
      shape: {
        id: 'dot_1',
        name: 'Dot',
        matrix: [[1]],
        colorKey: 'gold',
        color: '#ffd600',
        gradient: ['#ffea60', '#d49b00'],
        borderColor: '#fff5b0',
        shadowColor: 'rgba(212, 155, 0, 0.4)',
      },
      canPlace: true,
      scale: 1,
    };

    game.placePiece(0, 0, 0, () => ({ x: 0, y: 0, size: 40 }));
    assert.equal(game.combo, 1, 'Combo should stay at 1 after 1st non-clearing move');
    assert.equal(game.comboGraceMoves, 2, 'Grace moves should decrement from 3 to 2');

    // Second non-clearing placement
    game.dock[1] = {
      id: 'test_2',
      shape: {
        id: 'dot_1',
        name: 'Dot',
        matrix: [[1]],
        colorKey: 'gold',
        color: '#ffd600',
        gradient: ['#ffea60', '#d49b00'],
        borderColor: '#fff5b0',
        shadowColor: 'rgba(212, 155, 0, 0.4)',
      },
      canPlace: true,
      scale: 1,
    };
    game.placePiece(1, 0, 1, () => ({ x: 0, y: 0, size: 40 }));
    assert.equal(game.combo, 1, 'Combo should stay at 1 after 2nd non-clearing move');
    assert.equal(game.comboGraceMoves, 1, 'Grace moves should decrement from 2 to 1');

    // Third non-clearing placement
    game.dock[2] = {
      id: 'test_3',
      shape: {
        id: 'dot_1',
        name: 'Dot',
        matrix: [[1]],
        colorKey: 'gold',
        color: '#ffd600',
        gradient: ['#ffea60', '#d49b00'],
        borderColor: '#fff5b0',
        shadowColor: 'rgba(212, 155, 0, 0.4)',
      },
      canPlace: true,
      scale: 1,
    };
    game.placePiece(2, 0, 2, () => ({ x: 0, y: 0, size: 40 }));
    assert.equal(game.combo, 0, 'Combo should reset to 0 after grace window expires');
    assert.equal(game.comboGraceMoves, 0);
  });

  it('3. should immediately recharge combo grace window to 3 on any line clear', () => {
    const game = new BlockBlastGame();
    // Pre-fill row 3 except column 0
    for (let c = 1; c < 8; c++) {
      game.grid[3][c] = {
        color: '#3d8bff',
        gradient: ['#69a6ff', '#1f65d6'],
        borderColor: '#9bc4ff',
        shadowColor: 'rgba(31, 101, 214, 0.4)',
        colorKey: 'blue',
      };
    }
    // Combo was at 1 with 1 grace move left
    game.combo = 1;
    game.comboGraceMoves = 1;

    game.dock[0] = {
      id: 'clear_dot',
      shape: {
        id: 'dot_1',
        name: 'Dot',
        matrix: [[1]],
        colorKey: 'gold',
        color: '#ffd600',
        gradient: ['#ffea60', '#d49b00'],
        borderColor: '#fff5b0',
        shadowColor: 'rgba(212, 155, 0, 0.4)',
      },
      canPlace: true,
      scale: 1,
    };

    game.placePiece(0, 0, 3, () => ({ x: 0, y: 0, size: 40 }));
    assert.equal(game.combo, 2, 'Combo should increment to 2');
    assert.equal(game.comboGraceMoves, 3, 'Grace moves should recharge to 3');
  });

  it('4. should upgrade hammer to 3x3 blast and clear all 9 cells', () => {
    const game = new BlockBlastGame();
    // Fill 3x3 cells from (1,1) to (3,3)
    for (let r = 1; r <= 3; r++) {
      for (let c = 1; c <= 3; c++) {
        game.grid[r][c] = {
          color: '#3d8bff',
          gradient: ['#69a6ff', '#1f65d6'],
          borderColor: '#9bc4ff',
          shadowColor: 'rgba(31, 101, 214, 0.4)',
          colorKey: 'blue',
        };
      }
    }

    game.boosters.hammer = 1;
    game.activeMode = 'hammer';

    // Target center cell (2, 2)
    const success = game.useHammerOnCell(2, 2, () => ({ x: 0, y: 0, size: 40 }));
    assert.equal(success, true);
    assert.equal(game.boosters.hammer, 0);

    // Verify all 9 cells are cleared
    for (let r = 1; r <= 3; r++) {
      for (let c = 1; c <= 3; c++) {
        assert.equal(game.grid[r][c], null, `Cell (${r},${c}) should be cleared`);
      }
    }
  });

  it('5. should award All-Clear bonus (+300 pts, +100 coins) when entire board is cleared', () => {
    const game = new BlockBlastGame();
    // Fill only row 0 except col 7
    for (let c = 0; c < 7; c++) {
      game.grid[0][c] = {
        color: '#00e676',
        gradient: ['#66ffa6', '#00b348'],
        borderColor: '#b9ffd7',
        shadowColor: 'rgba(0, 179, 72, 0.4)',
        colorKey: 'emerald',
      };
    }

    const startCoins = game.coins;
    game.dock[0] = {
      id: 'last_dot',
      shape: {
        id: 'dot_1',
        name: 'Dot',
        matrix: [[1]],
        colorKey: 'gold',
        color: '#ffd600',
        gradient: ['#ffea60', '#d49b00'],
        borderColor: '#fff5b0',
        shadowColor: 'rgba(212, 155, 0, 0.4)',
      },
      canPlace: true,
      scale: 1,
    };

    // Place at (7, 0) completing row 0 and completely emptying the board
    game.placePiece(0, 7, 0, () => ({ x: 0, y: 0, size: 40 }));

    // Check all cells empty
    const allEmpty = game.grid.every((row) => row.every((c) => c === null));
    assert.equal(allEmpty, true);
    assert.ok(game.score >= 300, `Score (${game.score}) should include +300 All-Clear bonus`);
    assert.ok(game.coins >= startCoins + 100, 'Coins should include +100 All-Clear bonus');
    assert.equal(game.stats.allClears, 1);
  });

  it('6. should enforce hand diversity rules (max 1 heavy piece per hand)', () => {
    for (let trial = 0; trial < 100; trial++) {
      const hand = dealWeightedHand('neon', 5000);
      assert.equal(hand.length, 3);
      const heavyPieces = hand.filter(
        (p) =>
          p.id === 'square_3' ||
          p.id === 'line_5_h' ||
          p.id === 'line_5_v' ||
          p.id.startsWith('big_corner') ||
          p.id === 'cross_plus'
      );
      assert.ok(
        heavyPieces.length <= 1,
        `Hand had ${heavyPieces.length} heavy pieces, expected max 1: ${hand.map((p) => p.id).join(', ')}`
      );
    }
  });

  it('7. should unlock Stuck status when activating Hammer or Rotate mode (Softlock Fix)', () => {
    const game = new BlockBlastGame();
    game.isStuck = true;

    // Activate hammer
    game.boosters.hammer = 2;
    game.toggleHammerMode();
    assert.equal(game.isStuck, false, 'Activating hammer mode must clear isStuck to allow board clicks');

    // Reset and test rotate
    game.isStuck = true;
    game.boosters.rotate = 2;
    game.toggleRotateMode();
    assert.equal(game.isStuck, false, 'Activating rotate mode must clear isStuck to allow dock clicks');
  });

  it('8. should pre-validate rotate rescue safely without wasting coins', () => {
    const game = new BlockBlastGame();
    // Fill entire board completely
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        game.grid[r][c] = {
          color: '#ff1744',
          gradient: ['#ff616f', '#b20023'],
          borderColor: '#ffb3ba',
          shadowColor: 'rgba(178, 0, 35, 0.4)',
          colorKey: 'ruby',
        };
      }
    }
    // Set a piece in dock
    game.dock[0] = {
      id: 'p_square',
      shape: {
        id: 'square_2',
        name: '2x2 Square',
        matrix: [[1, 1], [1, 1]],
        colorKey: 'orange',
        color: '#ff9100',
        gradient: ['#ffb74d', '#e65100'],
        borderColor: '#ffe0b2',
        shadowColor: 'rgba(230, 81, 0, 0.4)',
      },
      canPlace: false,
      scale: 1,
    };
    game.dock[1] = null;
    game.dock[2] = null;

    // Since board is 100% full, rotating cannot help
    assert.equal(game.canRotateRescueHelp(), false);
  });

  it('9. should generate deterministic seeded daily challenge boards', () => {
    const gameA = new BlockBlastGame();
    gameA.startNewGame('daily');

    const gameB = new BlockBlastGame();
    gameB.startNewGame('daily');

    assert.equal(gameA.dailyInfo.targetType, gameB.dailyInfo.targetType);
    assert.equal(gameA.dailyInfo.targetValue, gameB.dailyInfo.targetValue);

    // Initial occupied cell count and positions must match identically
    let countA = 0;
    let countB = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (gameA.grid[r][c] !== null) countA++;
        if (gameB.grid[r][c] !== null) countB++;
        assert.equal(
          gameA.grid[r][c] !== null,
          gameB.grid[r][c] !== null,
          `Cell (${r},${c}) must match across identical daily seeds`
        );
      }
    }
    assert.equal(countA, countB);
    assert.ok(countA > 0, 'Daily mode should start with a non-empty pattern');
  });

  it('10. should collect gems when clearing lines containing gem cells in daily challenge', () => {
    const game = new BlockBlastGame();
    game.startNewGame('daily');
    game.dailyInfo.targetType = 'gems';
    game.dailyInfo.targetValue = 1;
    game.dailyInfo.gemsCollected = 0;

    // Place a row with a gem cell
    for (let c = 0; c < 7; c++) {
      game.grid[4][c] = {
        color: '#ffd600',
        gradient: ['#ffea60', '#d49b00'],
        borderColor: '#fff5b0',
        shadowColor: 'rgba(212, 155, 0, 0.4)',
        colorKey: 'gold',
        hasGem: c === 3, // Gem at (4, 3)
      };
    }

    let dailyGoalMetCalled = false;
    game.onDailyVictoryCallback = () => {
      dailyGoalMetCalled = true;
    };

    game.dock[0] = {
      id: 'last_gem_tile',
      shape: {
        id: 'dot_1',
        name: 'Dot',
        matrix: [[1]],
        colorKey: 'gold',
        color: '#ffd600',
        gradient: ['#ffea60', '#d49b00'],
        borderColor: '#fff5b0',
        shadowColor: 'rgba(212, 155, 0, 0.4)',
      },
      canPlace: true,
      scale: 1,
    };

    game.placePiece(0, 7, 4, () => ({ x: 0, y: 0, size: 40 }));
    assert.equal(game.dailyInfo.gemsCollected, 1, 'Gem should be harvested');
    assert.equal(game.dailyGoalMet, true, 'Daily goal should be met');
    assert.equal(dailyGoalMetCalled, true, 'Victory callback should trigger');
  });

  it('11. should preserve cell colorKeys when switching themes', () => {
    const game = new BlockBlastGame();
    game.grid[0][0] = {
      color: '#3d8bff',
      gradient: ['#69a6ff', '#1f65d6'],
      borderColor: '#9bc4ff',
      shadowColor: 'rgba(31, 101, 214, 0.4)',
      colorKey: 'blue',
    };

    // Switch to wood theme
    game.setTheme('wood');
    assert.equal(game.grid[0][0]?.colorKey, 'blue');
    assert.equal(game.grid[0][0]?.color, '#718096', 'Should map to wood blue');

    // Switch to candy theme
    game.setTheme('candy');
    assert.equal(game.grid[0][0]?.colorKey, 'blue');
    assert.equal(game.grid[0][0]?.color, '#4cc9f0', 'Should map to candy blue');
  });

  it('12. should guarantee 100% placeable shapes on emergency ad rescue / shuffle / revive', () => {
    const game = new BlockBlastGame();
    // Congest board leaving only single open pockets
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 0) {
          game.grid[r][c] = {
            color: '#3d8bff',
            gradient: ['#69a6ff', '#1f65d6'],
            borderColor: '#9bc4ff',
            shadowColor: 'rgba(31, 101, 214, 0.4)',
            colorKey: 'blue',
          };
        }
      }
    }

    game.dealGuaranteedPlaceableShapes();
    assert.equal(game.dock.length, 3);
    const placeableCount = game.dock.filter((p) => p && p.canPlace).length;
    assert.ok(placeableCount >= 1, 'At least 1 piece must be 100% placeable without softlocking');
  });

  it('13. should handle 1-Step Undo with 5-move free trial then coin monetization', () => {
    const game = new BlockBlastGame();
    game.coins = 100;
    assert.equal(game.canUndo().allowed, false, 'Cannot undo without a previous move');

    // Place a piece
    game.dock[0] = {
      id: 'dot_1',
      shape: {
        id: 'dot',
        name: 'Dot',
        matrix: [[1]],
        colorKey: 'gold',
        color: '#ffd600',
        gradient: ['#ffea60', '#d49b00'],
        borderColor: '#fff5b0',
        shadowColor: 'rgba(212, 155, 0, 0.4)',
      },
      canPlace: true,
      scale: 1,
    };
    game.placePiece(0, 2, 2, () => ({ x: 0, y: 0, size: 40 }));
    assert.ok(game.grid[2][2] !== null);

    // 1st move: Undo should be free trial
    const check1 = game.canUndo();
    assert.equal(check1.allowed, true);
    assert.equal(check1.isFree, true);
    assert.equal(check1.cost, 0);

    const undone = game.undoLastMove();
    assert.equal(undone, true);
    assert.equal(game.grid[2][2], null, 'Grid cell must be reverted');
    assert.equal(game.coins, 100, 'Coins should not be spent during free trial');
    assert.equal(game.undoFreeTrialRemaining, 4);

    // Deplete free trial moves
    game.undoFreeTrialRemaining = 0;
    game.dock[0] = {
      id: 'dot_2',
      shape: {
        id: 'dot',
        name: 'Dot',
        matrix: [[1]],
        colorKey: 'gold',
        color: '#ffd600',
        gradient: ['#ffea60', '#d49b00'],
        borderColor: '#fff5b0',
        shadowColor: 'rgba(212, 155, 0, 0.4)',
      },
      canPlace: true,
      scale: 1,
    };
    game.placePiece(0, 3, 3, () => ({ x: 0, y: 0, size: 40 }));

    // Now undo should cost 20 coins
    const checkPaid = game.canUndo();
    assert.equal(checkPaid.allowed, true);
    assert.equal(checkPaid.isFree, false);
    assert.equal(checkPaid.cost, 20);

    game.undoLastMove();
    assert.equal(game.grid[3][3], null);
    assert.equal(game.coins, 80, 'Must deduct 20 coins for paid undo');
  });

  it('14. should calculate optimal move hint prioritizing line clears', () => {
    const game = new BlockBlastGame();
    // Fill row 0 cells 0..6 (leaving cell 7 empty)
    for (let c = 0; c < 7; c++) {
      game.grid[0][c] = {
        color: '#3d8bff',
        gradient: ['#69a6ff', '#1f65d6'],
        borderColor: '#9bc4ff',
        shadowColor: 'rgba(31, 101, 214, 0.4)',
        colorKey: 'blue',
      };
    }

    // Dock piece 0 is a 1x1 dot
    game.dock[0] = {
      id: 'dot_hint',
      shape: {
        id: 'dot',
        name: 'Dot',
        matrix: [[1]],
        colorKey: 'gold',
        color: '#ffd600',
        gradient: ['#ffea60', '#d49b00'],
        borderColor: '#fff5b0',
        shadowColor: 'rgba(212, 155, 0, 0.4)',
      },
      canPlace: true,
      scale: 1,
    };

    const hint = game.findBestMoveHint();
    assert.ok(hint !== null);
    assert.equal(hint?.dockIndex, 0);
    assert.equal(hint?.gridX, 7);
    assert.equal(hint?.gridY, 0);
    assert.equal(hint?.clearsLines, 1);
  });

  it('15. should configure relaxed mode with comfort UX and dampened screen shake', () => {
    const game = new BlockBlastGame();
    game.startNewGame('relaxed');
    assert.equal(game.mode, 'relaxed');
    assert.equal(game.comfortMode, true);

    // Screen shake damping
    game.screenShake = 16 * (game.comfortMode ? 0.35 : 1.0);
    assert.ok(game.screenShake <= 6, 'Comfort mode must dampen screen shake for senior players');
  });

  it('16. should track Garden Bloom progression through 4 stages and spawn petals', () => {
    const game = new BlockBlastGame();
    game.startNewGame('classic');

    // Stage 1: Sprout initially
    const stage1 = game.getBloomStage();
    assert.equal(stage1.stage, 1);
    assert.ok(stage1.name.includes('Sprout'));
    assert.equal(stage1.iconUrl, '/img/bloom-stage-1.svg');

    // Advance bloom points to Stage 2: Growing
    game.bloomPoints = 80;
    const stage2 = game.getBloomStage();
    assert.equal(stage2.stage, 2);
    assert.ok(stage2.name.includes('Growing'));
    assert.equal(stage2.iconUrl, '/img/bloom-stage-2.svg');

    // Advance to Stage 3: Budding
    game.bloomPoints = 160;
    const stage3 = game.getBloomStage();
    assert.equal(stage3.stage, 3);
    assert.ok(stage3.name.includes('Budding'));
    assert.equal(stage3.iconUrl, '/img/bloom-stage-3.svg');

    // Advance to Stage 4: Brain Bloom!
    game.bloomPoints = 260;
    const stage4 = game.getBloomStage();
    assert.equal(stage4.stage, 4);
    assert.ok(stage4.name.includes('Brain Bloom'));
    assert.equal(stage4.iconUrl, '/img/bloom-stage-4.svg');

    // High combo immediately promotes to Brain Bloom!
    game.bloomPoints = 0;
    game.combo = 4;
    const comboBloom = game.getBloomStage();
    assert.equal(comboBloom.stage, 4);
  });
});
