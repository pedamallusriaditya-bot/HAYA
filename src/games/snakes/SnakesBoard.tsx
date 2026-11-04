import React from 'react';
import { Crown } from 'lucide-react';
import {
  getSquareCoordinates,
  LADDERS,
  SNAKES,
  ALL_SPECIALS,
} from './engine';

type SnakesBoardProps = {
  playerSquare: number; // 0 to 100 (0 = pre-start)
  botSquare: number; // 0 to 100 (0 = pre-start)
  playerColor?: string;
  botColor?: string;
  lastJump?: { from: number; to: number; type: 'ladder' | 'snake' } | null;
  activeTurn?: 'player' | 'bot';
};

export default function SnakesBoard({
  playerSquare,
  botSquare,
  lastJump,
  activeTurn,
}: SnakesBoardProps) {

  // Compute SVG overlay lines for Ladders and Snakes
  const renderSpecialsSVG = () => {
    return (
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Ladder linear gradient */}
          <linearGradient id="ladderGlow" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0.95" />
          </linearGradient>

          {/* Snake gradient */}
          <linearGradient id="snakeGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#fb923c" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#e11d48" stopOpacity="0.9" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ladders */}
        {ALL_SPECIALS.filter((s) => s.type === 'ladder').map((spec) => {
          const fromCoord = getSquareCoordinates(spec.from);
          const toCoord = getSquareCoordinates(spec.to);

          const x1 = fromCoord.xPercent * 10;
          const y1 = fromCoord.yPercent * 10;
          const x2 = toCoord.xPercent * 10;
          const y2 = toCoord.yPercent * 10;

          // Compute perpendicular offset for 2 parallel rails
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.hypot(dx, dy) || 1;
          const railOffset = 10; // width between rails
          const px = (-dy / len) * railOffset;
          const py = (dx / len) * railOffset;

          // Rungs along the ladder
          const numRungs = Math.max(3, Math.floor(len / 45));
          const rungs = [];
          for (let r = 1; r < numRungs; r++) {
            const t = r / numRungs;
            const rx = x1 + dx * t;
            const ry = y1 + dy * t;
            rungs.push(
              <line
                key={`rung-${spec.from}-${r}`}
                x1={rx - px}
                y1={ry - py}
                x2={rx + px}
                y2={ry + py}
                stroke="#6ee7b7"
                strokeWidth="3.5"
                strokeLinecap="round"
                opacity="0.85"
              />
            );
          }

          const isRecent = lastJump?.from === spec.from && lastJump?.type === 'ladder';

          return (
            <g key={`ladder-${spec.from}`} className={isRecent ? 'animate-pulse' : ''}>
              {/* Rail Left */}
              <line
                x1={x1 - px}
                y1={y1 - py}
                x2={x2 - px}
                y2={y2 - py}
                stroke="url(#ladderGlow)"
                strokeWidth="4"
                strokeLinecap="round"
                filter="url(#neonGlow)"
              />
              {/* Rail Right */}
              <line
                x1={x1 + px}
                y1={y1 + py}
                x2={x2 + px}
                y2={y2 + py}
                stroke="url(#ladderGlow)"
                strokeWidth="4"
                strokeLinecap="round"
                filter="url(#neonGlow)"
              />
              {/* Rungs */}
              {rungs}
            </g>
          );
        })}

        {/* Snakes */}
        {ALL_SPECIALS.filter((s) => s.type === 'snake').map((spec) => {
          const headCoord = getSquareCoordinates(spec.from); // Snake starts at higher square
          const tailCoord = getSquareCoordinates(spec.to); // Drops to lower square

          const x1 = headCoord.xPercent * 10;
          const y1 = headCoord.yPercent * 10;
          const x2 = tailCoord.xPercent * 10;
          const y2 = tailCoord.yPercent * 10;

          // S-curve control points
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2;
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.hypot(dx, dy) || 1;
          const curveAmp = 35;
          const cx1 = mx + (-dy / len) * curveAmp;
          const cy1 = my + (dx / len) * curveAmp;
          const cx2 = mx - (-dy / len) * curveAmp;
          const cy2 = my - (dx / len) * curveAmp;

          const pathD = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
          const isRecent = lastJump?.from === spec.from && lastJump?.type === 'snake';

          return (
            <g key={`snake-${spec.from}`} className={isRecent ? 'animate-pulse' : ''}>
              {/* Snake Body Outer Glow */}
              <path
                d={pathD}
                fill="none"
                stroke="#fda4af"
                strokeWidth="10"
                strokeLinecap="round"
                opacity="0.3"
                filter="url(#neonGlow)"
              />
              {/* Snake Body Core */}
              <path
                d={pathD}
                fill="none"
                stroke="url(#snakeGlow)"
                strokeWidth="5.5"
                strokeLinecap="round"
              />
              {/* Snake Head */}
              <circle
                cx={x1}
                cy={y1}
                r="11"
                fill="#e11d48"
                stroke="#ffe4e6"
                strokeWidth="2"
                filter="url(#neonGlow)"
              />
              {/* Snake Eyes */}
              <circle cx={x1 - 3} cy={y1 - 3} r="2" fill="#fff" />
              <circle cx={x1 + 3} cy={y1 - 3} r="2" fill="#fff" />
              <circle cx={x1 - 3} cy={y1 - 3} r="1" fill="#000" />
              <circle cx={x1 + 3} cy={y1 - 3} r="1" fill="#000" />
            </g>
          );
        })}
      </svg>
    );
  };

  // Coordinates for Tokens
  const playerPos = playerSquare > 0 ? getSquareCoordinates(playerSquare) : null;
  const botPos = botSquare > 0 ? getSquareCoordinates(botSquare) : null;
  const sameSquare = playerSquare > 0 && playerSquare === botSquare;

  return (
    <div className="relative w-full max-w-[min(100%,500px)] mx-auto select-none">
      {/* 10x10 Arcade Board Container */}
      <div className="relative aspect-square w-full rounded-2xl sm:rounded-3xl bg-slate-950 p-1 xs:p-2 sm:p-3 border-2 sm:border-4 border-slate-800 shadow-2xl overflow-hidden">
        {/* Subtle background circuit pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/20 via-slate-950 to-slate-900 pointer-events-none" />

        {/* 10x10 Grid */}
        <div className="grid grid-cols-10 grid-rows-10 w-full h-full gap-0.5 xs:gap-1 sm:gap-1.5 relative z-0">
          {/* Note: In HTML grid, row 0 is top. Our square number logic places 100 at row 9 (top). */}
          {Array.from({ length: 100 }).map((_, index) => {
            // Index 0 is rowFromTop = 0, col = 0
            const rowFromTop = Math.floor(index / 10);
            const col = index % 10;
            const rowFromBottom = 9 - rowFromTop;
            const squareNum =
              rowFromBottom % 2 === 0
                ? rowFromBottom * 10 + col + 1
                : rowFromBottom * 10 + (9 - col) + 1;

            const isLadderStart = Boolean(LADDERS[squareNum]);
            const isSnakeHead = Boolean(SNAKES[squareNum]);
            const isGoal = squareNum === 100;
            const isStart = squareNum === 1;

            const isEven = (rowFromBottom + col) % 2 === 0;

            return (
              <div
                key={squareNum}
                className={`relative rounded sm:rounded-lg flex flex-col justify-between p-0.5 xs:p-1 transition-all ${
                  isGoal
                    ? 'bg-gradient-to-br from-amber-500/30 to-amber-700/40 border border-amber-400/80 shadow-lg shadow-amber-500/20'
                    : isStart
                    ? 'bg-gradient-to-br from-emerald-500/20 to-teal-700/30 border border-emerald-500/50'
                    : isLadderStart
                    ? 'bg-emerald-950/40 border border-emerald-500/30'
                    : isSnakeHead
                    ? 'bg-rose-950/40 border border-rose-500/30'
                    : isEven
                    ? 'bg-slate-900/80 border border-slate-800/80'
                    : 'bg-slate-950/90 border border-slate-800/40'
                }`}
              >
                {/* Square Number */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[9px] sm:text-xs font-mono font-bold leading-none ${
                      isGoal
                        ? 'text-amber-300 font-extrabold'
                        : isLadderStart
                        ? 'text-emerald-400'
                        : isSnakeHead
                        ? 'text-rose-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {squareNum}
                  </span>

                  {isGoal && <Crown className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-amber-300 fill-amber-300 animate-pulse" />}
                </div>

                {/* Ladder / Snake Indicator Pills */}
                {isLadderStart && (
                  <span className="text-[7px] sm:text-[9px] font-bold text-emerald-300 bg-emerald-500/20 rounded px-0.5 py-0.2 self-center border border-emerald-500/40">
                    ▲ {LADDERS[squareNum]}
                  </span>
                )}
                {isSnakeHead && (
                  <span className="text-[7px] sm:text-[9px] font-bold text-rose-300 bg-rose-500/20 rounded px-0.5 py-0.2 self-center border border-rose-500/40">
                    ▼ {SNAKES[squareNum]}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* SVG Snakes & Ladders Overlay */}
        {renderSpecialsSVG()}

        {/* Player 1 Token */}
        {playerPos && (
          <div
            className="absolute z-20 transition-all duration-300 ease-out -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${playerPos.xPercent}%`,
              top: `${playerPos.yPercent}%`,
              transform: sameSquare ? 'translate(-80%, -50%)' : 'translate(-50%, -50%)',
            }}
          >
            <div
              className={`w-4 h-4 xs:w-5 xs:h-5 sm:w-7 sm:h-7 rounded-full bg-sky-500 border-2 border-white shadow-lg shadow-sky-500/70 flex items-center justify-center font-bold text-[8px] xs:text-[10px] sm:text-xs text-white ${
                activeTurn === 'player' ? 'ring-2 sm:ring-4 ring-sky-400/60 animate-bounce' : ''
              }`}
            >
              P1
            </div>
          </div>
        )}

        {/* Bot Token */}
        {botPos && (
          <div
            className="absolute z-20 transition-all duration-300 ease-out -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${botPos.xPercent}%`,
              top: `${botPos.yPercent}%`,
              transform: sameSquare ? 'translate(-20%, -50%)' : 'translate(-50%, -50%)',
            }}
          >
            <div
              className={`w-4 h-4 xs:w-5 xs:h-5 sm:w-7 sm:h-7 rounded-full bg-rose-500 border-2 border-white shadow-lg shadow-rose-500/70 flex items-center justify-center font-bold text-[8px] xs:text-[10px] sm:text-xs text-white ${
                activeTurn === 'bot' ? 'ring-2 sm:ring-4 ring-rose-400/60 animate-bounce' : ''
              }`}
            >
              CPU
            </div>
          </div>
        )}
      </div>

      {/* Off-board Starting Zone Indicator */}
      {(playerSquare === 0 || botSquare === 0) && (
        <div className="mt-2 sm:mt-3 flex flex-wrap items-center justify-center gap-2 xs:gap-4 text-[10px] xs:text-xs font-mono text-slate-400 bg-slate-900/60 py-1.5 sm:py-2 px-3 sm:px-4 rounded-xl border border-slate-800">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-sky-500" />
            Player at Starting Gate
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-rose-500" />
            Bot at Starting Gate
          </span>
        </div>
      )}
    </div>
  );
}
