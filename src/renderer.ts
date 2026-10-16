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
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.layout = this.computeLayout(canvas.width, canvas.height);
  }

  public resize(width: number, height: number, dpr: number) {
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.layout = this.computeLayout(width, height);
  }

  public computeLayout(width: number, height: number): LayoutInfo {
    const padX = 16;
    const maxBoardFromHeight = Math.max(220, (height - 150) * 0.72);
    const maxBoardWidth = Math.min(width - padX * 2, maxBoardFromHeight, 460);
    const cellGap = Math.max(3, Math.floor(maxBoardWidth / 70));
    const cellSize = (maxBoardWidth - (BOARD_SIZE - 1) * cellGap) / BOARD_SIZE;
    const boardSize = BOARD_SIZE * cellSize + (BOARD_SIZE - 1) * cellGap;
    const boardX = (width - boardSize) / 2;

    const remainingHeight = height - boardSize;
    const topMargin = Math.max(12, remainingHeight * 0.12);
    const boardY = topMargin;

    // Dock positioning
    const dockY = boardY + boardSize + 18;
    const dockHeight = Math.max(90, height - dockY - 16);
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

    // Themed Background
    this.drawBackground(game.theme, width, height);

    // Draw Board Background Frame (with subtle Danger Warning Vignette if 75%+ full)
    this.drawBoardFrame(game);

    // Draw Grid Cells, Jelly Bounces, Domino Highlights, Hammer Targets
    this.drawGrid(game);

    // Draw Line Clear Previews
    this.drawLineClearingGlow(game);

    // Draw Dock Slots & Rotate Mode Highlights
    this.drawDock(game);

    // Draw Particles & Floating Texts & Shockwaves
    game.particles.render(ctx);

    // Draw Dragging Piece (floating on top)
    this.drawDraggedPiece(game);

    ctx.restore();
  }

  private drawBackground(theme: ThemeId, width: number, height: number) {
    const ctx = this.ctx;
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);

    if (theme === 'wood') {
      bgGrad.addColorStop(0, '#231815');
      bgGrad.addColorStop(0.5, '#160e0c');
      bgGrad.addColorStop(1, '#0e0705');
    } else if (theme === 'candy') {
      bgGrad.addColorStop(0, '#261440');
      bgGrad.addColorStop(0.5, '#190a2e');
      bgGrad.addColorStop(1, '#0f051e');
    } else {
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(0.5, '#090d16');
      bgGrad.addColorStop(1, '#050811');
    }

    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
  }

  private drawBoardFrame(game: BlockBlastGame) {
    const { boardX, boardY, boardSize } = this.layout;
    const ctx = this.ctx;
    const pad = 8;
    const r = 16;
    const isDanger = game.isBoardDanger();

    ctx.save();
    if (isDanger) {
      const dangerPulse = 0.5 + Math.sin(this.animTime * 8) * 0.4;
      ctx.shadowColor = `rgba(239, 68, 68, ${0.45 + dangerPulse * 0.45})`;
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 6;
    } else {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 10;
    }

    if (game.theme === 'wood') {
      ctx.fillStyle = '#2d1c14';
      ctx.beginPath();
      ctx.roundRect(boardX - pad, boardY - pad, boardSize + pad * 2, boardSize + pad * 2, r);
      ctx.fill();
      ctx.strokeStyle = isDanger ? '#ef4444' : '#4e3326';
    } else if (game.theme === 'candy') {
      ctx.fillStyle = '#2b1747';
      ctx.beginPath();
      ctx.roundRect(boardX - pad, boardY - pad, boardSize + pad * 2, boardSize + pad * 2, r);
      ctx.fill();
      ctx.strokeStyle = isDanger ? '#ef4444' : '#502a82';
    } else {
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.roundRect(boardX - pad, boardY - pad, boardSize + pad * 2, boardSize + pad * 2, r);
      ctx.fill();
      ctx.strokeStyle = isDanger ? '#ef4444' : '#1e293b';
    }

    ctx.lineWidth = isDanger ? 3 : 2;
    ctx.stroke();
    ctx.restore();
  }

  private drawGrid(game: BlockBlastGame) {
    const { cellSize } = this.layout;
    const ctx = this.ctx;
    const cornerRadius = Math.max(4, cellSize * (game.theme === 'candy' ? 0.24 : 0.16));

    const slotBg =
      game.theme === 'wood' ? '#1c110b' : game.theme === 'candy' ? '#1c0f33' : '#172033';
    const slotBorder =
      game.theme === 'wood' ? '#2f1e15' : game.theme === 'candy' ? '#2f1854' : '#222f4c';

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

        // Draw empty slot backing
        ctx.fillStyle = slotBg;
        ctx.beginPath();
        ctx.roundRect(x, y, cellSize, cellSize, cornerRadius);
        ctx.fill();

        ctx.strokeStyle = slotBorder;
        ctx.lineWidth = 1.5;
        ctx.stroke();

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
      ctx.fillStyle = `rgba(239, 68, 68, ${0.15 + pulse * 0.1})`;
      ctx.beginPath();
      ctx.roundRect(topLeft.x, topLeft.y, boxW, boxH, 12);
      ctx.fill();

      ctx.strokeStyle = `rgba(239, 68, 68, ${0.75 + pulse * 0.25})`;
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
                0.72,
                game.theme
              );
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
    ctx.strokeStyle = `rgba(255, 230, 90, ${0.75 + pulse * 0.25})`;
    ctx.fillStyle = `rgba(255, 235, 120, ${0.18 + pulse * 0.12})`;

    // Highlight clearing rows
    for (const r of clearRows) {
      const y = boardY + r * (cellSize + cellGap);
      ctx.beginPath();
      ctx.roundRect(boardX, y, boardSize, cellSize, 8);
      ctx.fill();
      ctx.stroke();
    }

    // Highlight clearing cols
    for (const c of clearCols) {
      const x = boardX + c * (cellSize + cellGap);
      ctx.beginPath();
      ctx.roundRect(x, boardY, cellSize, boardSize, 8);
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
    const r = Math.max(4, size * (theme === 'candy' ? 0.26 : 0.18));

    ctx.save();
    ctx.globalAlpha = alpha;

    // Drop Shadow
    if (alpha >= 0.9) {
      ctx.shadowColor = cell.shadowColor;
      ctx.shadowBlur = size * 0.25;
      ctx.shadowOffsetY = size * 0.08;
    }

    // Main Gradient Body
    const grad = ctx.createLinearGradient(x, y, x, y + size);
    grad.addColorStop(0, cell.gradient[0]);
    grad.addColorStop(1, cell.gradient[1]);
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.roundRect(x, y, size, size, r);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // Theme Specific Artistry:
    if (theme === 'wood') {
      // Wood Grain Texture Lines
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x + size * 0.2, y + size * 0.1);
      ctx.quadraticCurveTo(x + size * 0.5, y + size * 0.4, x + size * 0.8, y + size * 0.2);
      ctx.moveTo(x + size * 0.15, y + size * 0.6);
      ctx.quadraticCurveTo(x + size * 0.6, y + size * 0.8, x + size * 0.85, y + size * 0.7);
      ctx.stroke();

      // Warm Bevel Border
      ctx.strokeStyle = cell.borderColor;
      ctx.lineWidth = Math.max(1, size * 0.04);
      ctx.stroke();
    } else if (theme === 'candy') {
      // Cute Sugar White Arc Highlight
      const highlightPad = size * 0.14;
      const highlightHeight = size * 0.32;
      const hlGrad = ctx.createLinearGradient(x, y, x, y + highlightHeight);
      hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
      hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0.1)');

      ctx.fillStyle = hlGrad;
      ctx.beginPath();
      ctx.roundRect(
        x + highlightPad,
        y + highlightPad * 0.7,
        size - highlightPad * 2,
        highlightHeight,
        r * 0.8
      );
      ctx.fill();

      // Candy Specular Dot
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(x + size * 0.75, y + size * 0.28, Math.max(1.5, size * 0.06), 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = cell.borderColor;
      ctx.lineWidth = Math.max(1, size * 0.04);
      ctx.stroke();
    } else {
      // Classic Neon Jewel Gloss & Bevel
      ctx.strokeStyle = cell.borderColor;
      ctx.lineWidth = Math.max(1, size * 0.04);
      ctx.stroke();

      const highlightPad = size * 0.12;
      const highlightHeight = size * 0.28;
      const hlGrad = ctx.createLinearGradient(x, y, x, y + highlightHeight);
      hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
      hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');

      ctx.fillStyle = hlGrad;
      ctx.beginPath();
      ctx.roundRect(
        x + highlightPad,
        y + highlightPad * 0.7,
        size - highlightPad * 2,
        highlightHeight,
        r * 0.7
      );
      ctx.fill();

      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.roundRect(
        x + highlightPad,
        y + size - highlightHeight * 0.6,
        size - highlightPad * 2,
        highlightHeight * 0.4,
        r * 0.5
      );
      ctx.fill();
    }

    // Draw Faceted Sparkle Gem if cell.hasGem === true (Daily gem goals!)
    if (cell.hasGem) {
      const gemRadius = size * 0.24;
      const midX = x + size / 2;
      const midY = y + size / 2;

      ctx.save();
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.moveTo(midX, midY - gemRadius);
      ctx.lineTo(midX + gemRadius, midY);
      ctx.lineTo(midX, midY + gemRadius);
      ctx.lineTo(midX - gemRadius, midY);
      ctx.closePath();
      ctx.fill();

      // Top-right facet highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
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

    const slotBg =
      game.theme === 'wood' ? '#261711' : game.theme === 'candy' ? '#271440' : '#111827';
    const slotBorder =
      game.theme === 'wood' ? '#3d251b' : game.theme === 'candy' ? '#472274' : '#1e293b';

    for (let i = 0; i < 3; i++) {
      const slot = dockSlots[i];
      const piece = game.dock[i];

      ctx.fillStyle = slotBg;
      ctx.beginPath();
      ctx.roundRect(slot.x, slot.y, slot.width, slot.height, 14);
      ctx.fill();

      // Rotate Mode Active Pulse on available slots
      if (game.activeMode === 'rotate' && piece) {
        const pulse = 0.5 + Math.sin(this.animTime * 10) * 0.4;
        ctx.strokeStyle = `rgba(0, 229, 255, ${0.7 + pulse * 0.3})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.save();
        ctx.font = '16px system-ui';
        ctx.fillStyle = '#00e5ff';
        ctx.fillText('🔄', slot.x + slot.width - 24, slot.y + 24);
        ctx.restore();
      } else {
        ctx.strokeStyle = slotBorder;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

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
    const fitFactor = maxDim >= 5 ? 0.42 : maxDim === 4 ? 0.48 : maxDim === 3 ? 0.58 : 0.68;
    const miniCellSize = baseCellSize * fitFactor;
    const miniGap = Math.max(2, miniCellSize * 0.08);

    const totalW = cols * miniCellSize + (cols - 1) * miniGap;
    const totalH = rows * miniCellSize + (rows - 1) * miniGap;

    const startX = slot.x + (slot.width - totalW) / 2;
    const startY = slot.y + (slot.height - totalH) / 2;

    const alpha = canPlace ? 1 : 0.35;

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
