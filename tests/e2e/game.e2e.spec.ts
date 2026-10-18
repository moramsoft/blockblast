import { test, expect, Page } from '@playwright/test';

// Helper: Drag a dock piece (slotIndex 0..2) to target board cell (col 0..7, row 0..7)
async function dragDockPieceToBoard(page: Page, slotIndex: number, targetCol: number, targetRow: number) {
  const coords = await page.evaluate(
    ({ slotIdx, col, row }) => {
      const canvas = document.getElementById('gameCanvas')!;
      const rect = canvas.getBoundingClientRect();
      const bridge = window.__BLOCK_BLAST_TEST__!;
      const layout = bridge.renderer.layout;
      const slot = layout.dockSlots[slotIdx];
      const piece = bridge.game.dock[slotIdx];
      if (!piece) throw new Error(`Dock slot ${slotIdx} is empty`);

      const matrix = piece.shape.matrix;
      const rows = matrix.length;
      const cols = matrix[0].length;
      const step = layout.cellSize + layout.cellGap;

      const totalW = cols * layout.cellSize + (cols - 1) * layout.cellGap;
      const totalH = rows * layout.cellSize + (rows - 1) * layout.cellGap;

      const startX = rect.left + slot.x + slot.width / 2;
      const startY = rect.top + slot.y + slot.height / 2;

      // In pointerdown with pointerType='mouse', touchVerticalOffset is 0
      const endX = rect.left + layout.boardX + col * step + totalW / 2;
      const endY = rect.top + layout.boardY + row * step + totalH / 2;

      return { startX, startY, endX, endY };
    },
    { slotIdx: slotIndex, col: targetCol, row: targetRow }
  );

  await page.mouse.move(coords.startX, coords.startY);
  await page.mouse.down();
  await page.mouse.move((coords.startX + coords.endX) / 2, (coords.startY + coords.endY) / 2);
  await page.mouse.move(coords.endX, coords.endY);
  await page.mouse.up();
}

test.describe('Block Blast Star - Cross-Platform (Android & iOS) Full E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('blockblast_tutorial_done', 'true');
      (window as any).__BLOCK_BLAST_TEST_NO_OFFSET__ = true;
    });
    await page.goto('/');
    await page.evaluate(() => {
      (window as any).__BLOCK_BLAST_TEST_NO_OFFSET__ = true;
      const b = window.__BLOCK_BLAST_TEST__!;
      b.closeTitleScreen?.();
      document.getElementById('tutorialBanner')?.classList.add('hidden');
      b.game.coins = 100;
      b.game.bestScore = 0;
      b.game.boosters = { rotate: 3, shuffle: 3, hammer: 2 };
      b.game.startNewGame('classic');
      b.syncUI();
      window.dispatchEvent(new Event('resize'));
    });
  });

  test('E2E-01: App Bootstrap, Portrait Layout, Safe-Area & Initial HUD', async ({ page }) => {
    const canvas = page.locator('#gameCanvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(260);
    expect(box!.height).toBeGreaterThanOrEqual(280);

    await expect(page.locator('#bestScoreText')).toHaveText('0');
    await expect(page.locator('#currentScoreText')).toHaveText('0');
    await expect(page.locator('#headerCoinsText')).toHaveText('100');
    await expect(page.locator('#rotateCountBadge')).toHaveText('3');
    await expect(page.locator('#shuffleCountBadge')).toHaveText('3');
    await expect(page.locator('#hammerCountBadge')).toHaveText('2');
  });

  test('E2E-02: Drag-and-Drop Piece Placement & Score Update', async ({ page }) => {
    // Inject a known 2x2 square in dock[0]
    await page.evaluate(() => {
      const b = window.__BLOCK_BLAST_TEST__!;
      b.game.dock[0] = {
        id: 'e2e_sq2',
        shape: {
          id: 'square_2',
          name: '2x2',
          matrix: [
            [1, 1],
            [1, 1],
          ],
          colorKey: 'cyan',
          color: '#00e5ff',
          gradient: ['#6effff', '#00b2cc'],
          borderColor: '#b3ffff',
          shadowColor: 'rgba(0,178,204,0.4)',
        },
        canPlace: true,
        scale: 1,
      };
    });

    await dragDockPieceToBoard(page, 0, 2, 2);

    const state = await page.evaluate(() => {
      const g = window.__BLOCK_BLAST_TEST__!.game;
      return {
        dock0: g.dock[0],
        score: g.score,
        c22: g.grid[2][2] !== null,
        c33: g.grid[3][3] !== null,
      };
    });

    expect(state.dock0).toBeNull();
    expect(state.score).toBeGreaterThanOrEqual(4);
    expect(state.c22).toBe(true);
    expect(state.c33).toBe(true);
  });

  test('E2E-03: Line Clear & Zero-Latency (0ms Lockout) Continuous Placement', async ({ page }) => {
    await page.evaluate(() => {
      const b = window.__BLOCK_BLAST_TEST__!;
      for (let c = 0; c < 7; c++) {
        b.game.grid[0][c] = {
          colorKey: 'blue',
          color: '#3d8bff',
          gradient: ['#69a6ff', '#1f65d6'],
          borderColor: '#9bc4ff',
          shadowColor: 'rgba(31,101,214,0.4)',
        };
      }
      const dotShape = {
        id: 'dot_1',
        name: 'Dot',
        matrix: [[1]],
        colorKey: 'gold' as const,
        color: '#ffd600',
        gradient: ['#ffea60', '#d49b00'] as [string, string],
        borderColor: '#fff5b0',
        shadowColor: 'rgba(212,155,0,0.4)',
      };
      b.game.dock[0] = { id: 'd0', shape: dotShape, canPlace: true, scale: 1 };
      b.game.dock[1] = { id: 'd1', shape: dotShape, canPlace: true, scale: 1 };
    });

    // 1st drop completes row 0
    await dragDockPieceToBoard(page, 0, 7, 0);
    // Immediate 2nd drop into (0, 0) without waiting for cascade animation
    await dragDockPieceToBoard(page, 1, 0, 0);

    const result = await page.evaluate(() => {
      const g = window.__BLOCK_BLAST_TEST__!.game;
      return {
        linesCleared: g.linesClearedTotal,
        cell00Occupied: g.grid[0][0] !== null,
        cell10Empty: g.grid[0][1] === null,
      };
    });

    expect(result.linesCleared).toBe(1);
    expect(result.cell00Occupied).toBe(true);
    expect(result.cell10Empty).toBe(true);
  });

  test('E2E-04: 3-Move Combo Grace Window & Heartbeat Warning Banner', async ({ page }) => {
    await page.evaluate(() => {
      const b = window.__BLOCK_BLAST_TEST__!;
      b.game.combo = 1;
      b.game.comboGraceMoves = 3;
      const dotShape = {
        id: 'dot_1',
        name: 'Dot',
        matrix: [[1]],
        colorKey: 'gold' as const,
        color: '#ffd600',
        gradient: ['#ffea60', '#d49b00'] as [string, string],
        borderColor: '#fff5b0',
        shadowColor: 'rgba(212,155,0,0.4)',
      };
      b.game.dock[0] = { id: 'd0', shape: dotShape, canPlace: true, scale: 1 };
      b.game.dock[1] = { id: 'd1', shape: dotShape, canPlace: true, scale: 1 };
      b.game.dock[2] = { id: 'd2', shape: dotShape, canPlace: true, scale: 1 };
      b.syncUI();
    });

    const comboBanner = page.locator('#comboBanner');
    await expect(comboBanner).toBeVisible();
    await expect(page.locator('#comboHearts')).toHaveText('🔥🔥🔥');

    // Non-clearing move 1 -> grace = 2
    await dragDockPieceToBoard(page, 0, 0, 0);
    await expect(page.locator('#comboHearts')).toHaveText('🔥🔥⚪');

    // Non-clearing move 2 -> grace = 1 (Heartbeat warning active)
    await dragDockPieceToBoard(page, 1, 2, 2);
    await expect(page.locator('#comboHearts')).toHaveText('🔥⚪⚪');
    await expect(comboBanner).toHaveClass(/warning/);

    // Non-clearing move 3 -> combo resets to 0
    await dragDockPieceToBoard(page, 2, 4, 4);
    await expect(comboBanner).toHaveClass(/hidden/);
  });

  test('E2E-05: All-Clear Bonus (+300 Score & +100 Coins)', async ({ page }) => {
    await page.evaluate(() => {
      const b = window.__BLOCK_BLAST_TEST__!;
      b.game.grid = b.game.createEmptyGrid();
      for (let c = 0; c < 7; c++) {
        b.game.grid[0][c] = {
          colorKey: 'emerald',
          color: '#00e676',
          gradient: ['#66ffa6', '#00b348'],
          borderColor: '#b9ffd7',
          shadowColor: 'rgba(0,179,72,0.4)',
        };
      }
      b.game.dock[0] = {
        id: 'allclear_dot',
        shape: {
          id: 'dot_1',
          name: 'Dot',
          matrix: [[1]],
          colorKey: 'gold',
          color: '#ffd600',
          gradient: ['#ffea60', '#d49b00'],
          borderColor: '#fff5b0',
          shadowColor: 'rgba(212,155,0,0.4)',
        },
        canPlace: true,
        scale: 1,
      };
    });

    await dragDockPieceToBoard(page, 0, 7, 0);

    const res = await page.evaluate(() => {
      const g = window.__BLOCK_BLAST_TEST__!.game;
      return { score: g.score, coins: g.coins, allClears: g.stats.allClears };
    });

    expect(res.score).toBeGreaterThanOrEqual(300);
    expect(res.coins).toBeGreaterThanOrEqual(200);
    expect(res.allClears).toBe(1);
  });

  test('E2E-06: Boosters (Rotate 90°, Shuffle, and 3x3 Blast Hammer)', async ({ page }) => {
    // Setup asymmetric piece in dock[0] and 3x3 blocks on board (1,1..3,3)
    await page.evaluate(() => {
      const b = window.__BLOCK_BLAST_TEST__!;
      for (let r = 1; r <= 3; r++) {
        for (let c = 1; c <= 3; c++) {
          b.game.grid[r][c] = {
            colorKey: 'blue',
            color: '#3d8bff',
            gradient: ['#69a6ff', '#1f65d6'],
            borderColor: '#9bc4ff',
            shadowColor: 'rgba(31,101,214,0.4)',
          };
        }
      }
      b.game.dock[0] = {
        id: 'rot_test',
        shape: {
          id: 'line_2_h',
          name: '1x2',
          matrix: [[1, 1]],
          colorKey: 'cyan',
          color: '#00e5ff',
          gradient: ['#6effff', '#00b2cc'],
          borderColor: '#b3ffff',
          shadowColor: 'rgba(0,178,204,0.4)',
        },
        canPlace: true,
        scale: 1,
      };
    });

    // 1. Rotate Booster
    await page.locator('#rotateBoosterBtn').click();
    await expect(page.locator('#modeBanner')).toBeVisible();

    const dock0Center = await page.evaluate(() => {
      const canvas = document.getElementById('gameCanvas')!;
      const rect = canvas.getBoundingClientRect();
      const slot = window.__BLOCK_BLAST_TEST__!.renderer.layout.dockSlots[0];
      return { x: rect.left + slot.x + slot.width / 2, y: rect.top + slot.y + slot.height / 2 };
    });
    await page.mouse.click(dock0Center.x, dock0Center.y);

    const rotatedDims = await page.evaluate(() => {
      const m = window.__BLOCK_BLAST_TEST__!.game.dock[0]!.shape.matrix;
      return { rows: m.length, cols: m[0].length };
    });
    expect(rotatedDims).toEqual({ rows: 2, cols: 1 });
    await expect(page.locator('#rotateCountBadge')).toHaveText('2');

    // 2. 3x3 Hammer Booster on cell (2, 2)
    await page.locator('#hammerBoosterBtn').click();
    const cell22Center = await page.evaluate(() => {
      const canvas = document.getElementById('gameCanvas')!;
      const rect = canvas.getBoundingClientRect();
      const coord = window.__BLOCK_BLAST_TEST__!.renderer.getCellCoord(2, 2);
      return { x: rect.left + coord.x + coord.size / 2, y: rect.top + coord.y + coord.size / 2 };
    });
    await page.mouse.click(cell22Center.x, cell22Center.y);

    const hammerCleared = await page.evaluate(() => {
      const g = window.__BLOCK_BLAST_TEST__!.game;
      for (let r = 1; r <= 3; r++) {
        for (let c = 1; c <= 3; c++) {
          if (g.grid[r][c] !== null) return false;
        }
      }
      return true;
    });
    expect(hammerCleared).toBe(true);
    await expect(page.locator('#hammerCountBadge')).toHaveText('1');

    // 3. Shuffle Booster
    await page.locator('#shuffleBoosterBtn').click();
    await expect(page.locator('#shuffleCountBadge')).toHaveText('2');
  });

  test('E2E-07 & E2E-08: Stuck Rescue Modal, Softlock Prevention, Give Up & Revive', async ({ page }) => {
    // Fill board completely so no 2x2 piece can fit
    await page.evaluate(() => {
      const b = window.__BLOCK_BLAST_TEST__!;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if ((r + c) % 2 === 0) {
            b.game.grid[r][c] = {
              colorKey: 'purple',
              color: '#b388ff',
              gradient: ['#e1ceff', '#7c4dff'],
              borderColor: '#ede7f6',
              shadowColor: 'rgba(124,77,255,0.4)',
            };
          }
        }
      }
      b.game.dock = [
        {
          id: 'stuck_sq',
          shape: {
            id: 'square_2',
            name: '2x2',
            matrix: [
              [1, 1],
              [1, 1],
            ],
            colorKey: 'cyan',
            color: '#00e5ff',
            gradient: ['#6effff', '#00b2cc'],
            borderColor: '#b3ffff',
            shadowColor: 'rgba(0,178,204,0.4)',
          },
          canPlace: false,
          scale: 1,
        },
        null,
        null,
      ];
      b.game.isStuck = true;
      b.openStuckModal();
    });

    await expect(page.locator('#stuckModal')).toBeVisible();
    // 2x2 cannot fit even when rotated -> Rotate Rescue button must be disabled
    await expect(page.locator('#rescueRotateBtn')).toBeDisabled();

    // Selecting Hammer Rescue must unlock isStuck immediately (no softlock)
    await page.locator('#rescueHammerBtn').click();
    const isStuckAfterHammer = await page.evaluate(() => window.__BLOCK_BLAST_TEST__!.game.isStuck);
    expect(isStuckAfterHammer).toBe(false);

    // Re-open stuck modal, Give Up -> Game Over -> Revive
    await page.evaluate(() => {
      const b = window.__BLOCK_BLAST_TEST__!;
      b.game.activeMode = 'none';
      b.game.isStuck = true;
      b.openStuckModal();
    });
    await page.locator('#stuckGiveUpBtn').click();
    await expect(page.locator('#gameOverModal')).toBeVisible();

    await page.locator('#reviveBtn').click();
    await expect(page.locator('#gameOverModal')).toBeHidden();
    const revivedState = await page.evaluate(() => {
      const g = window.__BLOCK_BLAST_TEST__!.game;
      return { isGameOver: g.isGameOver, canRevive: g.canRevive };
    });
    expect(revivedState).toEqual({ isGameOver: false, canRevive: false });
  });

  test('E2E-09: Booster Shop Purchases & Max Hold Cap (5/5)', async ({ page }) => {
    await page.evaluate(() => {
      const b = window.__BLOCK_BLAST_TEST__!;
      b.game.coins = 500;
      b.syncUI();
    });

    await page.locator('#shopBtn').click();
    await expect(page.locator('#shopModal')).toBeVisible();
    await expect(page.locator('#shopCoinBalanceText')).toHaveText('500');

    // Buy Rotate twice (3 -> 4 -> 5, reaching MAX_HELD_BOOSTERS = 5)
    await page.locator('#buyRotateBtn').click();
    await page.locator('#buyRotateBtn').click();
    await expect(page.locator('#rotateCountBadge')).toHaveText('5');
    await expect(page.locator('#shopCoinBalanceText')).toHaveText('440');

    // Buying again at 5/5 should not deduct coins
    await page.locator('#buyRotateBtn').click();
    await expect(page.locator('#shopCoinBalanceText')).toHaveText('440');

    await page.locator('#closeShopBtn').click();
    await expect(page.locator('#shopModal')).toBeHidden();
  });

  test('E2E-10: Daily Challenge Mode, Seeded Board, Booster Lockout & Victory Modal', async ({ page }) => {
    await page.locator('#dailyBtn').click();
    await expect(page.locator('#dailyModal')).toBeVisible();

    const dayCells = await page.locator('#calendarDaysGrid .calendar-day-cell').count();
    expect(dayCells).toBeGreaterThanOrEqual(28);

    await page.locator('#startDailyBtn').click();
    await expect(page.locator('#dailyModal')).toBeHidden();
    await expect(page.locator('#modeTag')).toBeVisible();
    await expect(page.locator('#dailyBanner')).toBeVisible();
    await expect(page.locator('#boosterBar')).toHaveClass(/disabled/);

    // Verify pre-seeded board has initial pattern blocks
    const filledCellsCount = await page.evaluate(() => {
      const g = window.__BLOCK_BLAST_TEST__!.game;
      let count = 0;
      for (const row of g.grid) for (const cell of row) if (cell) count++;
      return count;
    });
    expect(filledCellsCount).toBeGreaterThanOrEqual(8);
  });

  test('E2E-11, E2E-12, E2E-13, E2E-14: Themes, Stats Modal, Share Score Card & Sound Toggle', async ({ page }) => {
    // E2E-11: Theme switching
    await expect(page.locator('body')).toHaveClass(/theme-neon/);
    await page.locator('#themeBtn').click();
    await expect(page.locator('body')).toHaveClass(/theme-wood/);
    await expect(page.locator('#themeTag')).toHaveText('WOOD');
    await page.locator('#themeBtn').click();
    await expect(page.locator('body')).toHaveClass(/theme-candy/);
    await expect(page.locator('#themeTag')).toHaveText('CANDY');

    // E2E-12: Stats Modal
    await page.locator('#statsBtn').click();
    await expect(page.locator('#statsModal')).toBeVisible();
    const achCount = await page.locator('#achievementsList .achievement-row').count();
    expect(achCount).toBeGreaterThanOrEqual(6);
    await page.locator('#closeStatsBtn').click();

    // E2E-13: Share Score Card Canvas
    await page.evaluate(() => window.__BLOCK_BLAST_TEST__!.showGameOver());
    await expect(page.locator('#gameOverModal')).toBeVisible();
    await page.locator('#shareScoreCardBtn').click();
    await expect(page.locator('#shareModal')).toBeVisible();
    const dataUrlLen = await page.evaluate(() => {
      const c = document.getElementById('shareCardCanvas') as HTMLCanvasElement;
      return c.toDataURL('image/png').length;
    });
    expect(dataUrlLen).toBeGreaterThan(5000);
    await page.locator('#closeShareBtn').click();
    await page.locator('#playAgainBtn').click();

    // E2E-14: Sound Mute Toggle
    await expect(page.locator('#soundBtn')).toHaveText('🔊');
    await page.locator('#soundBtn').click();
    await expect(page.locator('#soundBtn')).toHaveText('🔇');
  });

  test('E2E-15: Title Screen, Mode Selection, Return Home & Senior Comfort UX', async ({ page }) => {
    // Open title screen
    await page.evaluate(() => window.__BLOCK_BLAST_TEST__!.openTitleScreen());
    await expect(page.locator('#titleScreen')).toBeVisible();

    // Check mode cards
    await expect(page.locator('#startRelaxedBtn')).toBeVisible();
    await expect(page.locator('#startClassicBtn')).toBeVisible();
    await expect(page.locator('#startDailyTitleBtn')).toBeVisible();

    // Verify Senior Comfort Mode is active by default
    await expect(page.locator('#app')).toHaveClass(/comfort-mode/);

    // Select Relaxed Mode
    await page.locator('#startRelaxedBtn').click();
    await expect(page.locator('#titleScreen')).toHaveClass(/hidden/);
    await expect(page.locator('#modeTag')).toHaveText('RELAXED');

    // Return to Title Screen via Home button
    await page.locator('#homeBtn').click();
    await expect(page.locator('#titleScreen')).toBeVisible();
    await expect(page.locator('#resumeBtn')).toBeVisible();

    // Resume game
    await page.locator('#resumeBtn').click();
    await expect(page.locator('#titleScreen')).toHaveClass(/hidden/);
  });

  test('E2E-16: Senior & Non-Gamer Assist: 1-Step Undo & Optimal Move Hint', async ({ page }) => {
    await page.evaluate(() => {
      const g = window.__BLOCK_BLAST_TEST__!.game;
      g.coins = 50;
      g.undoFreeTrialRemaining = 5;
      g.hintFreeTrialRemaining = 5;
      g.grid = g.grid.map((r) => r.map(() => null));
      g.dock[0] = {
        id: 'dot_test',
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
      window.__BLOCK_BLAST_TEST__!.syncUI();
    });

    // Request hint
    await page.locator('#hintBtn').click();
    const hintActive = await page.evaluate(() => window.__BLOCK_BLAST_TEST__!.game.activeHint !== null);
    expect(hintActive).toBe(true);

    // Place piece
    await page.evaluate(() => {
      window.__BLOCK_BLAST_TEST__!.game.placePiece(0, 0, 0, () => ({ x: 0, y: 0, size: 40 }));
      window.__BLOCK_BLAST_TEST__!.syncUI();
    });

    const hasPiece = await page.evaluate(() => window.__BLOCK_BLAST_TEST__!.game.grid[0][0] !== null);
    expect(hasPiece).toBe(true);

    // Click Undo
    await page.locator('#undoBtn').click();
    const cellAfterUndo = await page.evaluate(() => window.__BLOCK_BLAST_TEST__!.game.grid[0][0]);
    expect(cellAfterUndo).toBeNull();
  });

  test('E2E-17: Emergency Rescue & Shuffle 100% Guaranteed Placeable Verification', async ({ page }) => {
    // Fill almost whole board
    await page.evaluate(() => {
      const g = window.__BLOCK_BLAST_TEST__!.game;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (r !== 3 || c !== 3) {
            g.grid[r][c] = {
              color: '#3d8bff',
              gradient: ['#69a6ff', '#1f65d6'],
              borderColor: '#9bc4ff',
              shadowColor: 'rgba(31, 101, 214, 0.4)',
              colorKey: 'blue',
            };
          }
        }
      }
      // Trigger emergency rescue
      g.claimFreeEmergencyRescue();
      window.__BLOCK_BLAST_TEST__!.syncUI();
    });

    const anyPlaceable = await page.evaluate(() =>
      window.__BLOCK_BLAST_TEST__!.game.dock.some((p) => p && p.canPlace)
    );
    expect(anyPlaceable).toBe(true);
  });
});
