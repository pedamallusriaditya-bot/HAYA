import React, { useRef, useEffect, useCallback } from 'react';
import type { Piece, TurnPhase, PlayerSide } from './types.ts';
import {
  BOARD_SIZE,
  BASELINE_Y_PLAYER,
} from './physics.ts';
import { resolveLegalStrikerX } from './engine.ts';
import { drawCarromBoard } from './boardRenderer.ts';
import CarromControls from './CarromControls.tsx';

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

    drawCarromBoard({
      ctx,
      pieces,
      currentTurn,
      turnPhase,
      strikerX: currentStrikerXRef.current,
      aimAngle: aimAngleRef.current,
      shotPower: shotPowerRef.current,
      botAimingData,
    });

    ctx.restore();
  }, [pieces, currentTurn, turnPhase, botAimingData]);

  // Redraw when pieces/turn/phase change
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // ==========================================
  // POINTER EVENTS: PLACEMENT & AIMING
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

      <CarromControls
        currentTurn={currentTurn}
        turnPhase={turnPhase}
        strikerX={strikerX}
        pieces={pieces}
        currentStrikerXRef={currentStrikerXRef}
        onStrikerXChange={onStrikerXChange}
        onLockPlacement={onLockPlacement}
        onReposition={onReposition}
        renderCanvas={renderCanvas}
      />
    </div>
  );
}
