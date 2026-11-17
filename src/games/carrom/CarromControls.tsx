import React from 'react';
import type { Piece, TurnPhase, PlayerSide } from './types.ts';
import { BASELINE_X_MIN, BASELINE_X_MAX, BASELINE_Y_PLAYER } from './physics.ts';
import { resolveLegalStrikerX } from './engine.ts';

type CarromControlsProps = {
  currentTurn: PlayerSide;
  turnPhase: TurnPhase;
  strikerX: number;
  pieces: Piece[];
  currentStrikerXRef: React.MutableRefObject<number>;
  onStrikerXChange: (newX: number) => void;
  onLockPlacement?: () => void;
  onReposition?: () => void;
  renderCanvas: () => void;
};

export default function CarromControls({
  currentTurn,
  turnPhase,
  strikerX,
  pieces,
  currentStrikerXRef,
  onStrikerXChange,
  onLockPlacement,
  onReposition,
  renderCanvas,
}: CarromControlsProps) {
  return (
    <>
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
    </>
  );
}
