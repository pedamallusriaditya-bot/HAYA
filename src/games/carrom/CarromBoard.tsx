import React, { useRef, useEffect, useCallback } from 'react';
import type { Piece, TurnPhase, PlayerSide } from './types.ts';
import {
  BOARD_SIZE,
  CUSHION_INSET,
  BASELINE_Y_PLAYER,
  BASELINE_Y_BOT,
  BASELINE_X_MIN,
  BASELINE_X_MAX,
  POCKETS,
  PIECE_RADIUS,
  STRIKER_RADIUS,
} from './physics.ts';
import { resolveLegalStrikerX } from './engine.ts';

interface CarromBoardProps {
  pieces: Piece[];
  currentTurn: PlayerSide;
  turnPhase: TurnPhase;
  strikerX: number;
  onStrikerXChange: (newX: number) => void;
  aimAngle: number;
  onAimAngleChange: (newAngle: number) => void;
  shotPower: number;
  onShotPowerChange: (newPower: number) => void;
  onShoot?: () => void;
  onLockPlacement?: () => void;
  onReposition?: () => void;
  botAimingData?: {
    baselineX: number;
    aimAngle: number;
    power: number;
    progress: number;
  } | null;
  disabled?: boolean;
}

export default function CarromBoard({
  pieces,
  currentTurn,
  turnPhase,
  strikerX,
  onStrikerXChange,
  aimAngle,
  onAimAngleChange,
  shotPower,
  onShotPowerChange,
  onShoot,
  onLockPlacement,
  onReposition,
  botAimingData,
  disabled = false,
}: CarromBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Interaction tracking refs
  const isDraggingPlacementRef = useRef(false);
  const isAimingRef = useRef(false);
  const dragOffsetXRef = useRef(0);
  const currentStrikerXRef = useRef(strikerX);
  const aimAngleRef = useRef(aimAngle);
  const shotPowerRef = useRef(shotPower);

  // Keep refs in sync with props
  useEffect(() => {
    currentStrikerXRef.current = strikerX;
  }, [strikerX]);

  useEffect(() => {
    aimAngleRef.current = aimAngle;
  }, [aimAngle]);

  useEffect(() => {
    shotPowerRef.current = shotPower;
  }, [shotPower]);

  // Convert client viewport coordinates to 800x800 logical canvas coordinates
  const getCanvasCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      const scaleX = BOARD_SIZE / rect.width;
      const scaleY = BOARD_SIZE / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    []
  );

  // Dedicated Canvas Drawing Function
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI scaling
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
    }

    ctx.save();
    ctx.scale((displayWidth * dpr) / BOARD_SIZE, (displayHeight * dpr) / BOARD_SIZE);

    // ==========================================
    // 1. BOARD FRAME & PLAYING SURFACE
    // ==========================================
    // Outer wooden frame (Dark Rosewood / Mahogany)
    const frameGrad = ctx.createLinearGradient(0, 0, BOARD_SIZE, BOARD_SIZE);
    frameGrad.addColorStop(0, '#2d1810');
    frameGrad.addColorStop(0.5, '#422216');
    frameGrad.addColorStop(1, '#23120c');
    ctx.fillStyle = frameGrad;
    ctx.beginPath();
    ctx.roundRect(0, 0, BOARD_SIZE, BOARD_SIZE, 24);
    ctx.fill();

    // Frame bevel & wood grain accents
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#5a3120';
    ctx.stroke();

    // Inner playing surface (Polished Blond Maple / Lacquered Birch)
    const surfaceGrad = ctx.createRadialGradient(
      400, 400, 50,
      400, 400, 520
    );
    surfaceGrad.addColorStop(0, '#faecd4');
    surfaceGrad.addColorStop(0.7, '#f4dcbc');
    surfaceGrad.addColorStop(1, '#e3c299');

    ctx.fillStyle = surfaceGrad;
    ctx.beginPath();
    ctx.roundRect(
      CUSHION_INSET,
      CUSHION_INSET,
      BOARD_SIZE - CUSHION_INSET * 2,
      BOARD_SIZE - CUSHION_INSET * 2,
      12
    );
    ctx.fill();

    // Inner cushion border
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#6d3c26';
    ctx.stroke();

    // Golden inner pinstripe
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(217, 150, 40, 0.45)';
    ctx.strokeRect(
      CUSHION_INSET + 3,
      CUSHION_INSET + 3,
      BOARD_SIZE - (CUSHION_INSET + 3) * 2,
      BOARD_SIZE - (CUSHION_INSET + 3) * 2
    );

    // ==========================================
    // 2. REGULATION BOARD MARKINGS
    // ==========================================
    const cx = BOARD_SIZE / 2;
    const cy = BOARD_SIZE / 2;

    // Center Outer Circle & Decorative Sunburst
    ctx.save();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#9c2a2a'; // Classic Carrom crimson
    ctx.beginPath();
    ctx.arc(cx, cy, 75, 0, Math.PI * 2);
    ctx.stroke();

    // Decorative inner sunburst petals
    ctx.strokeStyle = 'rgba(156, 42, 42, 0.35)';
    ctx.lineWidth = 1.5;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 32, cy + Math.sin(a) * 32);
      ctx.lineTo(cx + Math.cos(a) * 73, cy + Math.sin(a) * 73);
      ctx.stroke();
    }

    // Queen Center Circle (Red filled)
    ctx.fillStyle = '#b82828';
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#f5c542';
    ctx.stroke();
    ctx.restore();

    // 4 Corner Foul Arrows (Pointing to pockets)
    const arrowCorners = [
      { x: 96, y: 96, angle: (5 * Math.PI) / 4 },
      { x: 704, y: 96, angle: (7 * Math.PI) / 4 },
      { x: 96, y: 704, angle: (3 * Math.PI) / 4 },
      { x: 704, y: 704, angle: Math.PI / 4 },
    ];

    ctx.save();
    ctx.strokeStyle = '#9c2a2a';
    ctx.fillStyle = '#9c2a2a';
    ctx.lineWidth = 2;

    arrowCorners.forEach((c) => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, 16, 0, Math.PI * 2);
      ctx.stroke();

      const startX = cx + Math.cos(c.angle) * 115;
      const startY = cy + Math.sin(c.angle) * 115;
      const endX = c.x - Math.cos(c.angle) * 18;
      const endY = c.y - Math.sin(c.angle) * 18;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      const tipX = c.x - Math.cos(c.angle) * 26;
      const tipY = c.y - Math.sin(c.angle) * 26;
      ctx.beginPath();
      ctx.arc(tipX, tipY, 4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // Baselines on all 4 sides
    const drawBaseline = (
      yLine: number,
      isHoriz: boolean,
      xMin: number,
      xMax: number,
      isCurrentPlayerBaseline: boolean
    ) => {
      ctx.save();
      const lineSpacing = 16;
      const redCircleRadius = 21;

      // Double lines
      ctx.lineWidth = isCurrentPlayerBaseline ? 2.5 : 1.5;
      ctx.strokeStyle = isCurrentPlayerBaseline ? '#8b2020' : '#a84040';

      if (isHoriz) {
        ctx.beginPath();
        ctx.moveTo(xMin, yLine - lineSpacing / 2);
        ctx.lineTo(xMax, yLine - lineSpacing / 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(xMin, yLine + lineSpacing / 2);
        ctx.lineTo(xMax, yLine + lineSpacing / 2);
        ctx.stroke();

        // Red End Circles
        [xMin, xMax].forEach((circleX) => {
          ctx.fillStyle = '#b82828';
          ctx.beginPath();
          ctx.arc(circleX, yLine, redCircleRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#222';
          ctx.stroke();

          ctx.fillStyle = '#f5c542';
          ctx.beginPath();
          ctx.arc(circleX, yLine, 4, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      ctx.restore();
    };

    // Bottom Baseline (Player)
    drawBaseline(BASELINE_Y_PLAYER, true, BASELINE_X_MIN, BASELINE_X_MAX, currentTurn === 'player');
    // Top Baseline (Bot)
    drawBaseline(BASELINE_Y_BOT, true, BASELINE_X_MIN, BASELINE_X_MAX, currentTurn === 'bot');

    // ==========================================
    // 3. FOUR CORNER POCKETS
    // ==========================================
    POCKETS.forEach((pocket) => {
      ctx.save();

      const pocketGrad = ctx.createRadialGradient(
        pocket.x, pocket.y, 4,
        pocket.x, pocket.y, pocket.radius + 3
      );
      pocketGrad.addColorStop(0, '#000000');
      pocketGrad.addColorStop(0.75, '#121212');
      pocketGrad.addColorStop(1, '#2c1c14');

      ctx.fillStyle = pocketGrad;
      ctx.beginPath();
      ctx.arc(pocket.x, pocket.y, pocket.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#1a0e08';
      ctx.stroke();

      // Pocket mesh net texture
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      for (let offset = -20; offset <= 20; offset += 9) {
        ctx.beginPath();
        ctx.moveTo(pocket.x + offset, pocket.y - 25);
        ctx.lineTo(pocket.x + offset, pocket.y + 25);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pocket.x - 25, pocket.y + offset);
        ctx.lineTo(pocket.x + 25, pocket.y + offset);
        ctx.stroke();
      }

      ctx.restore();
    });

    // ==========================================
    // 4. PLACEMENT GUIDE & HIGHLIGHTS
    // ==========================================
    const isPlayerPlacement = currentTurn === 'player' && turnPhase === 'placement';
    const isPlayerAiming = currentTurn === 'player' && turnPhase === 'aiming';

    if (isPlayerPlacement) {
      ctx.save();
      // Glowing placement rail along baseline
      ctx.lineWidth = 10;
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.22)';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(BASELINE_X_MIN, BASELINE_Y_PLAYER);
      ctx.lineTo(BASELINE_X_MAX, BASELINE_Y_PLAYER);
      ctx.stroke();

      // Subtle placement track line
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.75)';
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(BASELINE_X_MIN, BASELINE_Y_PLAYER);
      ctx.lineTo(BASELINE_X_MAX, BASELINE_Y_PLAYER);
      ctx.stroke();
      ctx.restore();
    }

    // ==========================================
    // 5. PIECES RENDERING (WITH 3D DEPTH)
    // ==========================================
    pieces.forEach((p) => {
      if (p.isPocketed) return;

      ctx.save();

      // If this is the striker during player placement or aiming, use the live position
      let px = p.x;
      let py = p.y;
      if (p.type === 'striker' && currentTurn === 'player' && (isPlayerPlacement || isPlayerAiming)) {
        px = currentStrikerXRef.current;
        py = BASELINE_Y_PLAYER;
      }

      ctx.translate(px, py);

      // Falling into pocket animation scale & alpha
      if (p.isFalling) {
        ctx.scale(p.fallScale, p.fallScale);
        ctx.globalAlpha = p.fallAlpha;
      }

      // Soft drop shadow
      if (!p.isFalling) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.38)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 4;
      }

      if (p.type === 'striker') {
        // --- STRIKER (Golden-Ivory Acrylic Token) ---
        const strGrad = ctx.createRadialGradient(
          -4, -5, 2,
          0, 0, STRIKER_RADIUS
        );
        strGrad.addColorStop(0, '#fffbf0');
        strGrad.addColorStop(0.45, '#f5e4ba');
        strGrad.addColorStop(0.85, '#dfb76c');
        strGrad.addColorStop(1, '#8e651e');

        ctx.fillStyle = strGrad;
        ctx.beginPath();
        ctx.arc(0, 0, STRIKER_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#61430f';
        ctx.stroke();

        // Concentric engraved rings on striker
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = 'rgba(110, 75, 15, 0.55)';
        ctx.beginPath();
        ctx.arc(0, 0, STRIKER_RADIUS * 0.72, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, STRIKER_RADIUS * 0.42, 0, Math.PI * 2);
        ctx.stroke();

        // Center jewel
        ctx.fillStyle = currentTurn === 'player' ? '#d97706' : '#6b7280';
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Specular gleam
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.beginPath();
        ctx.arc(-STRIKER_RADIUS * 0.32, -STRIKER_RADIUS * 0.35, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Visual halo during placement mode to show it is draggable
        if (isPlayerPlacement) {
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(0, 0, STRIKER_RADIUS + 4, 0, Math.PI * 2);
          ctx.stroke();

          // Left/Right drag arrows
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('◀  ▶', 0, -STRIKER_RADIUS - 10);
        }
      } else if (p.type === 'queen') {
        // --- RED QUEEN ---
        const qGrad = ctx.createRadialGradient(
          -3, -4, 2,
          0, 0, PIECE_RADIUS
        );
        qGrad.addColorStop(0, '#ff6b6b');
        qGrad.addColorStop(0.5, '#dc2626');
        qGrad.addColorStop(0.9, '#991b1b');
        qGrad.addColorStop(1, '#5c0d0d');

        ctx.fillStyle = qGrad;
        ctx.beginPath();
        ctx.arc(0, 0, PIECE_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(0, 0, PIECE_RADIUS * 0.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'white') {
        // --- WHITE PIECE ---
        const wGrad = ctx.createRadialGradient(
          -3, -4, 2,
          0, 0, PIECE_RADIUS
        );
        wGrad.addColorStop(0, '#ffffff');
        wGrad.addColorStop(0.65, '#f1f1eb');
        wGrad.addColorStop(0.9, '#deded4');
        wGrad.addColorStop(1, '#8e8e84');

        ctx.fillStyle = wGrad;
        ctx.beginPath();
        ctx.arc(0, 0, PIECE_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = 'rgba(120, 120, 110, 0.5)';
        ctx.beginPath();
        ctx.arc(0, 0, PIECE_RADIUS * 0.52, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // --- BLACK PIECE ---
        const bGrad = ctx.createRadialGradient(
          -3, -4, 2,
          0, 0, PIECE_RADIUS
        );
        bGrad.addColorStop(0, '#4b5563');
        bGrad.addColorStop(0.5, '#1f2937');
        bGrad.addColorStop(0.9, '#111827');
        bGrad.addColorStop(1, '#030712');

        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.arc(0, 0, PIECE_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = 'rgba(156, 163, 175, 0.4)';
        ctx.beginPath();
        ctx.arc(0, 0, PIECE_RADIUS * 0.52, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    });

    // ==========================================
    // 6. AIMING & TRAJECTORY PREVIEWS
    // ==========================================
    const striker = pieces.find((p) => p.type === 'striker');

    // Case A: Human Player Aiming Mode
    if (isPlayerAiming && striker && !striker.isPocketed) {
      const sx = currentStrikerXRef.current;
      const sy = BASELINE_Y_PLAYER;
      const powerRatio = Math.max(0, Math.min(1, (shotPowerRef.current - 350) / 1250));

      const cosA = Math.cos(aimAngleRef.current);
      const sinA = Math.sin(aimAngleRef.current);

      const rayLength = 160 + powerRatio * 380;
      const targetRayX = sx + cosA * rayLength;
      const targetRayY = sy + sinA * rayLength;

      ctx.save();

      // Trajectory laser
      const rayGrad = ctx.createLinearGradient(sx, sy, targetRayX, targetRayY);
      rayGrad.addColorStop(0, 'rgba(251, 191, 36, 0.95)');
      rayGrad.addColorStop(1, 'rgba(245, 158, 11, 0.1)');

      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 5]);
      ctx.strokeStyle = rayGrad;
      ctx.beginPath();
      ctx.moveTo(sx + cosA * (STRIKER_RADIUS + 2), sy + sinA * (STRIKER_RADIUS + 2));
      ctx.lineTo(targetRayX, targetRayY);
      ctx.stroke();

      // Ghost Ball collision check
      let firstHit: { piece: Piece; dist: number; gx: number; gy: number } | null = null;
      let minHitDist = Infinity;

      for (const p of pieces) {
        if (p.isPocketed || p.type === 'striker') continue;

        const dx = p.x - sx;
        const dy = p.y - sy;
        const proj = dx * cosA + dy * sinA;
        if (proj > 0 && proj < rayLength) {
          const perpDistSq = dx * dx + dy * dy - proj * proj;
          const contactDist = STRIKER_RADIUS + p.radius;
          if (perpDistSq < contactDist * contactDist) {
            const actualHitDist = proj - Math.sqrt(Math.max(0, contactDist * contactDist - perpDistSq));
            if (actualHitDist > 0 && actualHitDist < minHitDist) {
              minHitDist = actualHitDist;
              firstHit = {
                piece: p,
                dist: actualHitDist,
                gx: sx + cosA * actualHitDist,
                gy: sy + sinA * actualHitDist,
              };
            }
          }
        }
      }

      if (firstHit) {
        // Ghost Striker circle
        ctx.setLineDash([]);
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
        ctx.fillStyle = 'rgba(251, 191, 36, 0.12)';
        ctx.beginPath();
        ctx.arc(firstHit.gx, firstHit.gy, STRIKER_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Target piece deflection arrow
        const hitPiece = firstHit.piece;
        const deflX = hitPiece.x - firstHit.gx;
        const deflY = hitPiece.y - firstHit.gy;
        const deflLen = Math.sqrt(deflX * deflX + deflY * deflY);

        if (deflLen > 0.01) {
          const uDeflX = deflX / deflLen;
          const uDeflY = deflY / deflLen;
          const arrowLen = 70 + powerRatio * 60;

          ctx.strokeStyle = '#10b981'; // Emerald deflection
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(hitPiece.x, hitPiece.y);
          ctx.lineTo(hitPiece.x + uDeflX * arrowLen, hitPiece.y + uDeflY * arrowLen);
          ctx.stroke();

          const tipX = hitPiece.x + uDeflX * arrowLen;
          const tipY = hitPiece.y + uDeflY * arrowLen;
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.arc(tipX, tipY, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Circular power arc around striker
      ctx.setLineDash([]);
      ctx.lineWidth = 4;
      const powerColor =
        powerRatio < 0.4
          ? '#10b981'
          : powerRatio < 0.75
          ? '#f59e0b'
          : '#ef4444';
      ctx.strokeStyle = powerColor;
      ctx.beginPath();
      ctx.arc(
        sx,
        sy,
        STRIKER_RADIUS + 6,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * powerRatio
      );
      ctx.stroke();

      ctx.restore();
    }

    // Case B: Bot Aiming Animation Preview
    if (currentTurn === 'bot' && botAimingData && striker && !striker.isPocketed) {
      const bx = striker.x;
      const by = striker.y;
      const bAim = botAimingData.aimAngle;
      const bProgress = botAimingData.progress;

      ctx.save();
      const rayLen = (140 + (botAimingData.power / 1600) * 280) * bProgress;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(bAim) * STRIKER_RADIUS, by + Math.sin(bAim) * STRIKER_RADIUS);
      ctx.lineTo(bx + Math.cos(bAim) * rayLen, by + Math.sin(bAim) * rayLen);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(bx, by, STRIKER_RADIUS + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * bProgress);
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }, [pieces, currentTurn, turnPhase, botAimingData]);

  // Redraw when pieces/turn/phase change
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // ==========================================
  // 7. POINTER EVENTS: PLACEMENT & AIMING
  // ==========================================
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || currentTurn !== 'player' || turnPhase === 'settling' || turnPhase === 'shooting' || turnPhase === 'game_over') {
      return;
    }

    const coords = getCanvasCoords(e.clientX, e.clientY);
    if (!coords) return;

    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignored
    }

    // --- PHASE 1: PLACEMENT MODE ---
    if (turnPhase === 'placement') {
      const sx = currentStrikerXRef.current;
      const sy = BASELINE_Y_PLAYER;
      const distToStriker = Math.hypot(coords.x - sx, coords.y - sy);

      // Grab if near striker or in baseline band (y from 570 to 730)
      if (distToStriker < 65 || (coords.y >= 570 && coords.y <= 730)) {
        isDraggingPlacementRef.current = true;
        // Accurate pointer offset: don't snap center to pointer, follow from grab point!
        dragOffsetXRef.current = sx - coords.x;

        // If clicked directly on the baseline rail away from striker, snap smoothly
        if (distToStriker >= 65) {
          dragOffsetXRef.current = 0;
          const targetX = resolveLegalStrikerX(coords.x, BASELINE_Y_PLAYER, pieces, sx);
          currentStrikerXRef.current = targetX;
          onStrikerXChange(targetX);
          renderCanvas();
        }
      }
      return;
    }

    // --- PHASE 2: AIMING MODE ---
    if (turnPhase === 'aiming') {
      isAimingRef.current = true;
      const sx = currentStrikerXRef.current;
      const sy = BASELINE_Y_PLAYER;

      const dx = coords.x - sx;
      const dy = coords.y - sy;
      const dist = Math.hypot(dx, dy);

      if (coords.y > sy + 15) {
        // Slingshot pull-back mode
        const pullAngle = Math.atan2(dy, dx);
        const newAngle = pullAngle - Math.PI;
        aimAngleRef.current = newAngle;
        onAimAngleChange(newAngle);
        const power = Math.max(350, Math.min(1600, 350 + (dist / 160) * 1250));
        shotPowerRef.current = power;
        onShotPowerChange(power);
      } else {
        // Direct directional aim
        const newAngle = Math.atan2(dy, dx);
        aimAngleRef.current = newAngle;
        onAimAngleChange(newAngle);
        const power = Math.max(350, Math.min(1600, 350 + (dist / 240) * 1250));
        shotPowerRef.current = power;
        onShotPowerChange(power);
      }

      renderCanvas();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);
    if (!coords) return;

    // Continuous Real-Time Placement Drag
    if (isDraggingPlacementRef.current && turnPhase === 'placement') {
      e.preventDefault();
      const rawCandidateX = coords.x + dragOffsetXRef.current;
      const newX = resolveLegalStrikerX(
        rawCandidateX,
        BASELINE_Y_PLAYER,
        pieces,
        currentStrikerXRef.current
      );

      if (newX !== currentStrikerXRef.current) {
        currentStrikerXRef.current = newX;
        const striker = pieces.find((p) => p.type === 'striker');
        if (striker) {
          striker.x = newX;
          striker.y = BASELINE_Y_PLAYER;
        }
        onStrikerXChange(newX);
        renderCanvas();
      }
      return;
    }

    // Continuous Aiming & Power Drag
    if (isAimingRef.current && turnPhase === 'aiming') {
      e.preventDefault();
      const sx = currentStrikerXRef.current;
      const sy = BASELINE_Y_PLAYER;
      const dx = coords.x - sx;
      const dy = coords.y - sy;
      const dist = Math.hypot(dx, dy);

      if (coords.y > sy + 15) {
        // Slingshot pull-back mode
        const pullAngle = Math.atan2(dy, dx);
        const newAngle = pullAngle - Math.PI;
        aimAngleRef.current = newAngle;
        onAimAngleChange(newAngle);
        const power = Math.max(350, Math.min(1600, 350 + (dist / 160) * 1250));
        shotPowerRef.current = power;
        onShotPowerChange(power);
      } else {
        // Direct directional aim
        const newAngle = Math.atan2(dy, dx);
        aimAngleRef.current = newAngle;
        onAimAngleChange(newAngle);
        const power = Math.max(350, Math.min(1600, 350 + (dist / 240) * 1250));
        shotPowerRef.current = power;
        onShotPowerChange(power);
      }

      renderCanvas();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }

    // End Placement Drag (Never shoots accidentally)
    if (isDraggingPlacementRef.current) {
      isDraggingPlacementRef.current = false;
      renderCanvas();
      return;
    }

    // End Aiming: If pulled back with intention, release shot!
    if (isAimingRef.current) {
      isAimingRef.current = false;
      const coords = getCanvasCoords(e.clientX, e.clientY);
      const sx = currentStrikerXRef.current;
      const sy = BASELINE_Y_PLAYER;

      if (coords && onShoot) {
        const dist = Math.hypot(coords.x - sx, coords.y - sy);
        // Only release shot if dragged a non-trivial distance (e.g. > 20px)
        if (dist > 20 && coords.y > sy + 15) {
          onShoot();
          return;
        }
      }
      renderCanvas();
    }
  };

  return (
    <div className="relative select-none flex flex-col items-center w-full">
      <div
        className="relative w-full max-w-[min(90vw,540px,68vh)] aspect-square rounded-2xl overflow-hidden shadow-2xl shadow-black/80 border-2 border-amber-950/60"
        style={{ touchAction: 'none' }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`w-full h-full block ${
            turnPhase === 'placement'
              ? 'cursor-ew-resize'
              : turnPhase === 'aiming'
              ? 'cursor-crosshair'
              : 'cursor-default'
          }`}
          style={{ touchAction: 'none' }}
          width={800}
          height={800}
        />
      </div>

      {/* Real-time Responsive Placement Slider (Active during PLACEMENT mode) */}
      {currentTurn === 'player' && turnPhase === 'placement' && (
        <div className="w-full max-w-[min(90vw,540px,68vh)] mt-2.5 px-3 py-2.5 rounded-xl bg-slate-950/90 border border-amber-500/40 shadow-lg shadow-amber-500/10 flex items-center justify-between gap-3 animate-in">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-[11px] font-mono text-amber-400 font-bold whitespace-nowrap">
              SLIDE STRIKER:
            </span>
            <input
              type="range"
              min={BASELINE_X_MIN}
              max={BASELINE_X_MAX}
              value={strikerX}
              onChange={(e) => {
                const targetX = resolveLegalStrikerX(
                  Number(e.target.value),
                  BASELINE_Y_PLAYER,
                  pieces,
                  currentStrikerXRef.current
                );
                currentStrikerXRef.current = targetX;
                const striker = pieces.find((p) => p.type === 'striker');
                if (striker) {
                  striker.x = targetX;
                  striker.y = BASELINE_Y_PLAYER;
                }
                onStrikerXChange(targetX);
                renderCanvas();
              }}
              className="flex-1 accent-amber-400 cursor-pointer h-2.5 bg-slate-800 rounded-lg"
            />
          </div>

          <button
            type="button"
            onClick={onLockPlacement}
            className="px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md shadow-amber-500/20 active:scale-95 transition-all shrink-0"
          >
            Aim Shot 🎯
          </button>
        </div>
      )}

      {/* Aiming Phase Header / Reposition Button */}
      {currentTurn === 'player' && turnPhase === 'aiming' && (
        <div className="w-full max-w-[min(90vw,540px,68vh)] mt-2.5 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-2 animate-in">
          <span className="text-xs font-mono text-slate-300">
            🎯 <strong className="text-amber-400">Aiming:</strong> Pull back to set power & flick, or use buttons below
          </span>
          <button
            type="button"
            onClick={onReposition}
            className="px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shrink-0 transition"
          >
            ↺ Reposition
          </button>
        </div>
      )}
    </div>
  );
}
