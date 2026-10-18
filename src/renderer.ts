import { BlockBlastGame, BOARD_SIZE } from './game';
import { Cell, ShapeDefinition, ThemeId } from './types';

export interface LayoutInfo {
  width: number;
  height: number;
  boardX: number;
  boardY: number;
  boardSize: number;
  cellSize: number;
  cellGap: number;
  dockY: number;
  dockHeight: number;
  dockSlotWidth: number;
  dockSlots: { x: number; y: number; width: number; height: number }[];
}

export class GameRenderer {
  public layout: LayoutInfo;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animTime: number = 0;
  public hammerHoverCoords: { c: number; r: number } | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true })!;
    this.layout = this.computeLayout(canvas.width, canvas.height);
  }

  public resize(width: number, height: number, dpr: number) {
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.layout = this.computeLayout(width, height);
  }

  public computeLayout(width: number, height: number): LayoutInfo {
    const padX = 18;
    const bottomPad = 6;
    const topPad = 12;
    const gapBoardDock = Math.max(14, Math.min(26, Math.floor(height * 0.025)));
    const minDockHeight = 76;
    const maxDockHeight = width >= 600 ? 140 : 116;
    const maxBoardLimit = width >= 600 ? 580 : 460;

    // Reserve height for dock + gaps so board + dock always fit inside canvas
    const availHeightForBoardAndDock = Math.max(260, height - topPad - bottomPad - gapBoardDock);
    const idealBoardFromHeight = availHeightForBoardAndDock - minDockHeight;
    const maxBoardWidth = Math.min(width - padX * 2, idealBoardFromHeight, maxBoardLimit);

    const cellGap = Math.max(3, Math.floor(maxBoardWidth / 70));
    const cellSize = (maxBoardWidth - (BOARD_SIZE - 1) * cellGap) / BOARD_SIZE;
    const boardSize = BOARD_SIZE * cellSize + (BOARD_SIZE - 1) * cellGap;
    const boardX = (width - boardSize) / 2;

    // Dock height scales proportionally with boardSize, strictly capped between minDockHeight and maxDockHeight
    const rawDockH = Math.min(maxDockHeight, Math.max(minDockHeight, Math.floor(boardSize * 0.27)));
    const dockHeight = Math.max(68, Math.min(rawDockH, height - topPad - bottomPad - boardSize - gapBoardDock));

    const totalContentH = boardSize + gapBoardDock + dockHeight;
    const extraVerticalSpace = Math.max(0, height - topPad - bottomPad - totalContentH);
    const boardY = topPad + Math.min(28, extraVerticalSpace * 0.35);

    const dockY = boardY + boardSize + gapBoardDock;
    const dockSlotWidth = (boardSize - 2 * 10) / 3;

    const dockSlots = [0, 1, 2].map((i) => ({
      x: boardX + i * (dockSlotWidth + 10),
      y: dockY,
      width: dockSlotWidth,
      height: dockHeight,
    }));

    return {
      width,
      height,
      boardX,
      boardY,
      boardSize,
      cellSize,
      cellGap,
      dockY,
      dockHeight,
      dockSlotWidth,
      dockSlots,
    };
  }

  public getCellCoord(c: number, r: number) {
    const { boardX, boardY, cellSize, cellGap } = this.layout;
    return {
      x: boardX + c * (cellSize + cellGap),
      y: boardY + r * (cellSize + cellGap),
      size: cellSize,
    };
  }

  public render(game: BlockBlastGame, dt: number) {
    this.animTime += dt;
    const { width, height } = this.layout;
    const ctx = this.ctx;

    ctx.save();
    if (game.screenShake > 0) {
      const sx = (Math.random() - 0.5) * game.screenShake;
      const sy = (Math.random() - 0.5) * game.screenShake;
      ctx.translate(sx, sy);
    }

    // Clear canvas so the illustrated garden background shines through
    this.drawBackground(game.theme, width, height);

    // Draw 3D Tactile Board Frame
    this.drawBoardFrame(game);

    // Draw Grid Cells, Jelly Bounces, Domino Highlights, Hammer Targets
    this.drawGrid(game);

    // Draw Line Clear Previews
    this.drawLineClearingGlow(game);

    // Draw 3D Cushion Dock Slots & Rotate Mode Highlights
    this.drawDock(game);

    // Draw Particles & Floating Texts & Shockwaves
    game.particles.render(ctx);

    // Draw Dragging Piece (floating on top)
    this.drawDraggedPiece(game);

    ctx.restore();
  }

  private drawBackground(_theme: ThemeId, width: number, height: number) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, width, height);
  }

  private drawBoardFrame(game: BlockBlastGame) {
    const { boardX, boardY, boardSize } = this.layout;
    const ctx = this.ctx;
    const outerPad = 11;
    const innerPad = 5;
    const outerR = 24;
    const innerR = 18;
    const isDanger = game.isBoardDanger();

    ctx.save();

    // Theme palette for 3D board frame
    let frameTop = '#fde68a';
    let frameBottom = '#f59e0b';
    let frameLip = '#7c2d12';
    let wellBg = '#2c1854';
    let wellBorder = '#1b0d38';

    if (game.theme === 'wood') {
      frameTop = '#f5d0a9';
      frameBottom = '#c27838';
      frameLip = '#5c2d0c';
      wellBg = '#361f12';
      wellBorder = '#211108';
    } else if (game.theme === 'candy') {
      frameTop = '#fbcfe8';
      frameBottom = '#ec4899';
      frameLip = '#831843';
      wellBg = '#38154c';
      wellBorder = '#220a30';
    }

    if (isDanger) {
      const dangerPulse = 0.5 + Math.sin(this.animTime * 8) * 0.4;
      ctx.shadowColor = `rgba(239, 68, 68, ${0.55 + dangerPulse * 0.4})`;
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 6;
    } else {
      ctx.shadowColor = 'rgba(45, 15, 80, 0.35)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 10;
    }

    // 1. 3D Bottom Lip of outer frame
    ctx.fillStyle = isDanger ? '#991b1b' : frameLip;
    ctx.beginPath();
    ctx.roundRect(
      boardX - outerPad,
      boardY - outerPad + 6,
      boardSize + outerPad * 2,
      boardSize + outerPad * 2,
      outerR
    );
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // 2. Main Outer 3D Frame Body
    const frameGrad = ctx.createLinearGradient(
      0,
      boardY - outerPad,
      0,
      boardY + boardSize + outerPad
    );
    frameGrad.addColorStop(0, frameTop);
    frameGrad.addColorStop(1, frameBottom);
    ctx.fillStyle = frameGrad;
    ctx.beginPath();
    ctx.roundRect(
      boardX - outerPad,
      boardY - outerPad,
      boardSize + outerPad * 2,
      boardSize + outerPad * 2,
      outerR
    );
    ctx.fill();

    ctx.strokeStyle = isDanger ? '#ef4444' : frameLip;
    ctx.lineWidth = 3;
    ctx.stroke();

    // 3. Inner Recessed Velvet Board Well
    ctx.fillStyle = wellBg;
    ctx.beginPath();
    ctx.roundRect(
      boardX - innerPad,
      boardY - innerPad,
      boardSize + innerPad * 2,
      boardSize + innerPad * 2,
      innerR
    );
    ctx.fill();

    ctx.strokeStyle = wellBorder;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  private drawGrid(game: BlockBlastGame) {
    const { cellSize } = this.layout;
    const ctx = this.ctx;
    const cornerRadius = Math.max(5, cellSize * 0.22);

    const slotBg =
      game.theme === 'wood' ? '#26140b' : game.theme === 'candy' ? '#290d3a' : '#20103d';
    const slotBorder =
      game.theme === 'wood' ? '#4a2a18' : game.theme === 'candy' ? '#52206e' : '#3d246c';

    // Check preview line clear rows & cols
    const clearRows = game.preview?.clearRows || [];
    const clearCols = game.preview?.clearCols || [];
    const hasClears = clearRows.length > 0 || clearCols.length > 0;

    let draggedPieceColorEntry: Cell | null = null;
    if (game.draggedIndex !== null && game.dock[game.draggedIndex]) {
      const p = game.dock[game.draggedIndex]!.shape;
      draggedPieceColorEntry = {
        color: p.color,
        gradient: p.gradient,
        borderColor: p.borderColor,
        shadowColor: p.shadowColor,
        colorKey: p.colorKey,
      };
    }

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const { x, y } = this.getCellCoord(c, r);
        const cell = game.grid[r][c];

        // Draw empty recessed pocket
        ctx.fillStyle = slotBg;
        ctx.beginPath();
        ctx.roundRect(x, y, cellSize, cellSize, cornerRadius);
        ctx.fill();

        ctx.strokeStyle = slotBorder;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Subtle inner pocket top shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.beginPath();
        ctx.roundRect(x + 1.5, y + 1.5, cellSize - 3, cellSize * 0.22, cornerRadius * 0.7);
        ctx.fill();

        // Draw occupied block
        if (cell) {
          const bounce = game.placedBounces.find((b) => b.r === r && b.c === c);
          const isAboutToClear = hasClears && (clearRows.includes(r) || clearCols.includes(c));

          // Visual Domino Pre-burst Highlight
          const queued = game.visualDominoQueue.find((q) => q.r === r && q.c === c && !q.popped);

          if (bounce) {
            ctx.save();
            const p = bounce.time / bounce.duration;
            const spring = Math.sin(p * Math.PI * 3) * (1 - p);
            const sx = 1 + spring * 0.22;
            const sy = 1 - spring * 0.22;
            const cx = x + cellSize / 2;
            const cy = y + cellSize / 2;
            ctx.translate(cx, cy);
            ctx.scale(sx, sy);
            ctx.translate(-cx, -cy);

            this.drawThemedBlock(ctx, x, y, cellSize, cell, 1, game.theme);
            ctx.restore();
          } else if (isAboutToClear && draggedPieceColorEntry) {
            // Dynamic Color Transition & Glow anticipating line clear!
            ctx.save();
            const pulse = 1 + Math.sin(this.animTime * 16) * 0.05;
            const cx = x + cellSize / 2;
            const cy = y + cellSize / 2;
            ctx.translate(cx, cy);
            ctx.scale(pulse, pulse);
            ctx.translate(-cx, -cy);

            // Draw with dragged piece's vibrant color!
            this.drawThemedBlock(
              ctx,
              x,
              y,
              cellSize,
              { ...cell, ...draggedPieceColorEntry },
              1,
              game.theme
            );
            ctx.restore();
          } else {
            this.drawThemedBlock(ctx, x, y, cellSize, cell, 1, game.theme);
          }

          if (queued) {
            ctx.save();
            const pulse = 0.5 + Math.sin(this.animTime * 20) * 0.35;
            ctx.fillStyle = `rgba(255, 255, 255, ${0.45 + pulse * 0.35})`;
            ctx.beginPath();
            ctx.roundRect(x, y, cellSize, cellSize, cornerRadius);
            ctx.fill();
            ctx.restore();
          }
        }
      }
    }

    // 3x3 Hammer Range Visual Targeting Indicator
    if (game.activeMode === 'hammer') {
      const targetC = this.hammerHoverCoords ? this.hammerHoverCoords.c : 3;
      const targetR = this.hammerHoverCoords ? this.hammerHoverCoords.r : 3;

      const minC = Math.max(0, targetC - 1);
      const maxC = Math.min(BOARD_SIZE - 1, targetC + 1);
      const minR = Math.max(0, targetR - 1);
      const maxR = Math.min(BOARD_SIZE - 1, targetR + 1);

      const topLeft = this.getCellCoord(minC, minR);
      const bottomRight = this.getCellCoord(maxC, maxR);
      const boxW = bottomRight.x + cellSize - topLeft.x;
      const boxH = bottomRight.y + cellSize - topLeft.y;

      ctx.save();
      const pulse = 0.5 + Math.sin(this.animTime * 12) * 0.4;
      ctx.fillStyle = `rgba(239, 68, 68, ${0.18 + pulse * 0.12})`;
      ctx.beginPath();
      ctx.roundRect(topLeft.x, topLeft.y, boxW, boxH, 12);
      ctx.fill();

      ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 + pulse * 0.15})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.stroke();

      // Crosshair at center
      const centerCoord = this.getCellCoord(targetC, targetR);
      const midX = centerCoord.x + cellSize / 2;
      const midY = centerCoord.y + cellSize / 2;
      ctx.fillStyle = '#ef4444';
      ctx.setLineDash([]);
      ctx.fillRect(midX - 2, topLeft.y + 4, 4, boxH - 8);
      ctx.fillRect(topLeft.x + 4, midY - 2, boxW - 8, 4);
      ctx.restore();
    }

    // Ghost Preview when dragging
    if (game.preview && game.preview.isValid && game.draggedIndex !== null) {
      const piece = game.dock[game.draggedIndex];
      if (piece) {
        const matrix = piece.shape.matrix;
        const mRows = matrix.length;
        const mCols = matrix[0].length;
        const { gridX, gridY } = game.preview;

        for (let pr = 0; pr < mRows; pr++) {
          for (let pc = 0; pc < mCols; pc++) {
            if (matrix[pr][pc] === 1) {
              const { x, y } = this.getCellCoord(gridX + pc, gridY + pr);
              this.drawThemedBlock(
                ctx,
                x,
                y,
                cellSize,
                {
                  color: piece.shape.color,
                  gradient: piece.shape.gradient,
                  borderColor: piece.shape.borderColor,
                  shadowColor: piece.shape.shadowColor,
                  colorKey: piece.shape.colorKey,
                },
                0.75,
                game.theme
              );
            }
          }
        }
      }
    }

    // Active Move Hint Ghost Silhouette (For Senior / Beginner guidance)
    if (game.activeHint && game.draggedIndex === null && !game.isGameOver && !game.isStuck) {
      const piece = game.dock[game.activeHint.dockIndex];
      if (piece) {
        const matrix = piece.shape.matrix;
        const mRows = matrix.length;
        const mCols = matrix[0].length;
        const { gridX, gridY } = game.activeHint;
        const pulse = 0.5 + Math.sin(this.animTime * 6) * 0.4;

        for (let pr = 0; pr < mRows; pr++) {
          for (let pc = 0; pc < mCols; pc++) {
            if (matrix[pr][pc] === 1) {
              const { x, y } = this.getCellCoord(gridX + pc, gridY + pr);
              ctx.save();
              ctx.fillStyle = `rgba(255, 230, 60, ${0.28 + pulse * 0.18})`;
              ctx.beginPath();
              ctx.roundRect(x, y, cellSize, cellSize, cornerRadius);
              ctx.fill();

              ctx.strokeStyle = `rgba(255, 240, 100, ${0.85 + pulse * 0.15})`;
              ctx.lineWidth = 3;
              ctx.stroke();
              ctx.restore();
            }
          }
        }
      }
    }
  }

  private drawLineClearingGlow(game: BlockBlastGame) {
    if (!game.preview || !game.preview.isValid) return;

    const { clearRows, clearCols } = game.preview;
    if (clearRows.length === 0 && clearCols.length === 0) return;

    const { boardX, boardY, boardSize, cellSize, cellGap } = this.layout;
    const ctx = this.ctx;
    const pulse = 0.5 + Math.sin(this.animTime * 14) * 0.3;

    ctx.save();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = `rgba(255, 240, 120, ${0.8 + pulse * 0.2})`;
    ctx.fillStyle = `rgba(255, 240, 130, ${0.22 + pulse * 0.14})`;

    // Highlight clearing rows
    for (const r of clearRows) {
      const y = boardY + r * (cellSize + cellGap);
      ctx.beginPath();
      ctx.roundRect(boardX, y, boardSize, cellSize, 10);
      ctx.fill();
      ctx.stroke();
    }

    // Highlight clearing cols
    for (const c of clearCols) {
      const x = boardX + c * (cellSize + cellGap);
      ctx.beginPath();
      ctx.roundRect(x, boardY, cellSize, boardSize, 10);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawThemedBlock(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    cell: Cell,
    alpha: number = 1,
    theme: ThemeId = 'neon'
  ) {
    const r = Math.max(5, size * 0.24);

    ctx.save();
    ctx.globalAlpha = alpha;

    // Soft 3D Drop Shadow
    if (alpha >= 0.85) {
      ctx.shadowColor = 'rgba(30, 10, 60, 0.38)';
      ctx.shadowBlur = size * 0.18;
      ctx.shadowOffsetY = size * 0.08;
    }

    // Main Glossy Jelly Gradient Body
    const grad = ctx.createLinearGradient(x, y, x, y + size);
    grad.addColorStop(0, cell.gradient[0]);
    grad.addColorStop(1, cell.gradient[1]);
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.roundRect(x, y, size, size, r);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // 3D Bottom Lip / Bevel (matches Title Screen .fb jelly cubes!)
    const bevelH = Math.max(3, size * 0.17);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
    ctx.beginPath();
    ctx.roundRect(x + 1, y + size - bevelH, size - 2, bevelH, [0, 0, r * 0.9, r * 0.9]);
    ctx.fill();

    // Theme-specific subtle texture for Wood
    if (theme === 'wood') {
      ctx.strokeStyle = 'rgba(60, 25, 5, 0.18)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x + size * 0.18, y + size * 0.25);
      ctx.quadraticCurveTo(x + size * 0.5, y + size * 0.42, x + size * 0.82, y + size * 0.28);
      ctx.moveTo(x + size * 0.15, y + size * 0.62);
      ctx.quadraticCurveTo(x + size * 0.55, y + size * 0.78, x + size * 0.85, y + size * 0.68);
      ctx.stroke();
    }

    // Top Glossy Candy Arc Highlight
    const hlPad = size * 0.13;
    const hlHeight = size * 0.32;
    const hlGrad = ctx.createLinearGradient(x, y + hlPad * 0.5, x, y + hlHeight);
    hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
    hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');

    ctx.fillStyle = hlGrad;
    ctx.beginPath();
    ctx.roundRect(x + hlPad, y + hlPad * 0.65, size - hlPad * 2, hlHeight, r * 0.75);
    ctx.fill();

    // Cute Jelly Specular Shine Dot (Top-Left, matching Title Screen .fb::after)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
    ctx.save();
    ctx.translate(x + size * 0.26, y + size * 0.22);
    ctx.rotate(-0.25);
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(2, size * 0.11), Math.max(1.3, size * 0.065), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Crisp Outer Contour for Senior High-Contrast Readability
    ctx.strokeStyle = 'rgba(35, 15, 65, 0.38)';
    ctx.lineWidth = Math.max(1.2, size * 0.045);
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, r);
    ctx.stroke();

    // Draw Faceted Sparkle Gem if cell.hasGem === true (Daily gem goals!)
    if (cell.hasGem) {
      const gemRadius = size * 0.26;
      const midX = x + size / 2;
      const midY = y + size / 2;

      ctx.save();
      ctx.fillStyle = '#fef08a';
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.moveTo(midX, midY - gemRadius);
      ctx.lineTo(midX + gemRadius, midY);
      ctx.lineTo(midX, midY + gemRadius);
      ctx.lineTo(midX - gemRadius, midY);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#854d0e';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Top-right facet highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.moveTo(midX, midY - gemRadius);
      ctx.lineTo(midX + gemRadius, midY);
      ctx.lineTo(midX, midY);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    ctx.restore();
  }

  private drawDock(game: BlockBlastGame) {
    const { dockSlots, cellSize } = this.layout;
    const ctx = this.ctx;

    const cardTop =
      game.theme === 'wood' ? '#fffbeb' : game.theme === 'candy' ? '#fff1f2' : '#ffffff';
    const cardBottom =
      game.theme === 'wood' ? '#fde68a' : game.theme === 'candy' ? '#fce7f3' : '#f3e8ff';
    const borderCol =
      game.theme === 'wood' ? '#7c2d12' : game.theme === 'candy' ? '#831843' : '#4c1d95';

    for (let i = 0; i < 3; i++) {
      const slot = dockSlots[i];
      const piece = game.dock[i];
      const r = 18;

      ctx.save();

      // 3D Bottom Cushion Lip
      ctx.fillStyle = borderCol;
      ctx.beginPath();
      ctx.roundRect(slot.x, slot.y + 4, slot.width, slot.height, r);
      ctx.fill();

      // Main Cream/Lavender 3D Cushion Card
      const grad = ctx.createLinearGradient(0, slot.y, 0, slot.y + slot.height);
      grad.addColorStop(0, cardTop);
      grad.addColorStop(1, cardBottom);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(slot.x, slot.y, slot.width, slot.height, r);
      ctx.fill();

      // Active Hint Pulse on recommended dock piece
      if (game.activeHint && game.activeHint.dockIndex === i && game.draggedIndex === null && piece) {
        const pulse = 0.5 + Math.sin(this.animTime * 8) * 0.4;
        ctx.strokeStyle = `rgba(234, 88, 12, ${0.8 + pulse * 0.2})`;
        ctx.lineWidth = 3.5;
        ctx.stroke();

        ctx.save();
        ctx.font = '400 13px "Jua", system-ui, sans-serif';
        ctx.fillStyle = '#c2410c';
        ctx.textAlign = 'center';
        ctx.fillText('✨ PICK', slot.x + slot.width / 2, slot.y + 18);
        ctx.restore();
      } else if (game.activeMode === 'rotate' && piece) {
        const pulse = 0.5 + Math.sin(this.animTime * 10) * 0.4;
        ctx.strokeStyle = `rgba(37, 99, 235, ${0.75 + pulse * 0.25})`;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.save();
        ctx.font = '16px system-ui';
        ctx.fillStyle = '#2563eb';
        ctx.fillText('🔄', slot.x + slot.width - 24, slot.y + 22);
        ctx.restore();
      } else {
        ctx.strokeStyle = borderCol;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      ctx.restore();

      if (!piece || game.draggedIndex === i) continue;

      this.drawShapeInSlot(ctx, slot, piece.shape, cellSize, piece.canPlace, game.theme);
    }
  }

  private drawShapeInSlot(
    ctx: CanvasRenderingContext2D,
    slot: { x: number; y: number; width: number; height: number },
    shape: ShapeDefinition,
    baseCellSize: number,
    canPlace: boolean,
    theme: ThemeId
  ) {
    const matrix = shape.matrix;
    const rows = matrix.length;
    const cols = matrix[0].length;

    const maxDim = Math.max(rows, cols);
    let fitFactor = maxDim >= 5 ? 0.42 : maxDim === 4 ? 0.48 : maxDim === 3 ? 0.58 : 0.68;
    let miniCellSize = baseCellSize * fitFactor;
    let miniGap = Math.max(2, miniCellSize * 0.08);

    let totalW = cols * miniCellSize + (cols - 1) * miniGap;
    let totalH = rows * miniCellSize + (rows - 1) * miniGap;

    // Safety scale down: piece must always fit within slot bounds with padding
    const availW = slot.width - 14;
    const availH = slot.height - 14;
    if (totalW > availW || totalH > availH) {
      const scale = Math.min(availW / totalW, availH / totalH);
      miniCellSize *= scale;
      miniGap = Math.max(1.5, miniCellSize * 0.08);
      totalW = cols * miniCellSize + (cols - 1) * miniGap;
      totalH = rows * miniCellSize + (rows - 1) * miniGap;
    }

    const startX = slot.x + (slot.width - totalW) / 2;
    const startY = slot.y + (slot.height - totalH) / 2;

    const alpha = canPlace ? 1 : 0.38;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (matrix[r][c] === 1) {
          const x = startX + c * (miniCellSize + miniGap);
          const y = startY + r * (miniCellSize + miniGap);
          this.drawThemedBlock(
            ctx,
            x,
            y,
            miniCellSize,
            {
              color: shape.color,
              gradient: shape.gradient,
              borderColor: shape.borderColor,
              shadowColor: shape.shadowColor,
              colorKey: shape.colorKey,
            },
            alpha,
            theme
          );
        }
      }
    }
  }

  private drawDraggedPiece(game: BlockBlastGame) {
    if (game.draggedIndex === null) return;
    const piece = game.dock[game.draggedIndex];
    if (!piece) return;

    const { cellSize, cellGap } = this.layout;
    const ctx = this.ctx;
    const matrix = piece.shape.matrix;
    const rows = matrix.length;
    const cols = matrix[0].length;

    const totalW = cols * cellSize + (cols - 1) * cellGap;
    const totalH = rows * cellSize + (rows - 1) * cellGap;

    const startX = game.dragX - totalW / 2;
    const startY = game.dragY - totalH / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (matrix[r][c] === 1) {
          const x = startX + c * (cellSize + cellGap);
          const y = startY + r * (cellSize + cellGap);
          this.drawThemedBlock(
            ctx,
            x,
            y,
            cellSize,
            {
              color: piece.shape.color,
              gradient: piece.shape.gradient,
              borderColor: piece.shape.borderColor,
              shadowColor: piece.shape.shadowColor,
              colorKey: piece.shape.colorKey,
            },
            0.95,
            game.theme
          );
        }
      }
    }
  }
}
