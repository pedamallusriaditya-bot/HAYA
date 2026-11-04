import React from 'react';
import { Star, Trophy, ArrowRight, ArrowLeft, ArrowDown, ArrowUp } from 'lucide-react';
import {
  SAFE_TRACK_INDICES,
  GOAL_STEP,
  HOME_STRETCH_START,
  HOME_STRETCHES,
  getTrackCoordinate,
  type PlayerState,
  type Token,
  type LudoColor,
} from './engine';

type LudoBoardProps = {
  players: PlayerState[];
  legalTokenIds: number[];
  currentTurn: LudoColor;
  onTokenClick: (tokenId: number) => void;
  disabled?: boolean;
};

// 15x15 Grid coordinate mapping for the 52 common track squares
const TRACK_COORDINATES: [number, number][] = [
  // 0..4: Red side bottom arm entry
  [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
  // 5..10: Down left column of bottom arm
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
  // 11: Bottom turnaround
  [14, 7],
  // 12..17: Up right column of bottom arm (13 = Yellow Start)
  [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
  // 18..23: Right along bottom row of right arm
  [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
  // 24: Right turnaround
  [7, 14],
  // 25..30: Left along top row of right arm (26 = Green Start)
  [6, 14], [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
  // 31..36: Up right column of top arm
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  // 37: Top turnaround
  [0, 7],
  // 38..43: Down left column of top arm (39 = Blue Start)
  [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
  // 44..49: Left along top row of left arm
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
  // 50: Left turnaround
  [7, 0],
  // 51: Corner square leading to [8, 1]
  [8, 0],
];

export default function LudoBoard({
  players,
  legalTokenIds,
  currentTurn,
  onTokenClick,
  disabled = false,
}: LudoBoardProps) {
  // Helper to find all tokens located on a specific [r, c] cell
  const getTokensAtCell = (r: number, c: number): { token: Token; color: LudoColor; isLegal: boolean }[] => {
    const tokensHere: { token: Token; color: LudoColor; isLegal: boolean }[] = [];

    for (const player of players) {
      for (const token of player.tokens) {
        if (token.step === -1 || token.step === GOAL_STEP) continue;
        const isLegal =
          currentTurn === player.color && legalTokenIds.includes(token.id) && !disabled;

        if (token.step >= HOME_STRETCH_START) {
          const stretchIdx = token.step - HOME_STRETCH_START;
          const stretchCoords = HOME_STRETCHES[player.color];
          const coord = stretchCoords ? stretchCoords[stretchIdx] : null;
          if (coord && coord[0] === r && coord[1] === c) {
            tokensHere.push({ token, color: player.color, isLegal });
          }
        } else {
          const trackIdx = getTrackCoordinate(player.color, token.step);
          if (trackIdx !== null) {
            const coord = TRACK_COORDINATES[trackIdx];
            if (coord && coord[0] === r && coord[1] === c) {
              tokensHere.push({ token, color: player.color, isLegal });
            }
          }
        }
      }
    }

    return tokensHere;
  };

  const getPlayerByColor = (color: LudoColor) => players.find((p) => p.color === color);

  // Render a single token piece button
  const renderTokenButton = (
    token: Token,
    color: LudoColor,
    isLegal: boolean,
    sizeClasses = 'w-[85%] h-[85%]'
  ) => {
    let colorStyle = 'bg-gradient-to-br from-rose-400 via-rose-500 to-rose-700 text-white border-rose-200/90 shadow-rose-600/40';
    if (color === 'green') {
      colorStyle = 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700 text-slate-950 border-emerald-200/90 shadow-emerald-600/40';
    } else if (color === 'yellow') {
      colorStyle = 'bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-slate-950 border-amber-200/90 shadow-amber-600/40';
    } else if (color === 'blue') {
      colorStyle = 'bg-gradient-to-br from-sky-400 via-sky-500 to-sky-700 text-white border-sky-200/90 shadow-sky-600/40';
    }

    return (
      <button
        key={`${color}-${token.id}`}
        type="button"
        disabled={!isLegal}
        onClick={() => isLegal && onTokenClick(token.id)}
        aria-label={`${color.toUpperCase()} Token ${token.id + 1}${isLegal ? ' (Legal move)' : ''}`}
        className={`${sizeClasses} rounded-full flex items-center justify-center font-black shadow-md transition-all select-none border ${colorStyle} ${
          isLegal
            ? 'ring-2 ring-amber-300 ring-offset-1 ring-offset-slate-950 scale-110 cursor-pointer animate-bounce z-30'
            : 'cursor-default'
        }`}
      >
        <span className="text-[9px] sm:text-[11px] leading-none drop-shadow">{token.id + 1}</span>
      </button>
    );
  };

  // Generate the 72 track & runway cells
  const trackCells: React.ReactNode[] = [];

  // Top arm: cols 6..8, rows 0..5 (18 cells)
  for (let r = 0; r <= 5; r++) {
    for (let c = 6; c <= 8; c++) {
      trackCells.push(renderCell(r, c));
    }
  }

  // Bottom arm: cols 6..8, rows 9..14 (18 cells)
  for (let r = 9; r <= 14; r++) {
    for (let c = 6; c <= 8; c++) {
      trackCells.push(renderCell(r, c));
    }
  }

  // Left arm: rows 6..8, cols 0..5 (18 cells)
  for (let r = 6; r <= 8; r++) {
    for (let c = 0; c <= 5; c++) {
      trackCells.push(renderCell(r, c));
    }
  }

  // Right arm: rows 6..8, cols 9..14 (18 cells)
  for (let r = 6; r <= 8; r++) {
    for (let c = 9; c <= 14; c++) {
      trackCells.push(renderCell(r, c));
    }
  }

  function renderCell(r: number, c: number) {
    const tokensHere = getTokensAtCell(r, c);
    const hasLegalToken = tokensHere.some((t) => t.isLegal);

    // Identify cell types
    const isRedStart = r === 8 && c === 1;
    const isYellowStart = r === 13 && c === 8;
    const isGreenStart = r === 6 && c === 13;
    const isBlueStart = r === 1 && c === 6;

    const isRedRunway = r === 7 && c >= 1 && c <= 5;
    const isGreenRunway = r === 7 && c >= 9 && c <= 13;
    const isTopRunway = c === 7 && r >= 1 && r <= 5; // Blue
    const isBottomRunway = c === 7 && r >= 9 && r <= 13; // Yellow

    const trackIdx = TRACK_COORDINATES.findIndex(([tr, tc]) => tr === r && tc === c);
    const isSafe = trackIdx !== -1 && SAFE_TRACK_INDICES.has(trackIdx);

    let bgStyle = 'bg-slate-900/90 border-slate-800';

    if (isRedStart) {
      bgStyle = 'bg-rose-500/30 border-rose-500 shadow-inner shadow-rose-500/20';
    } else if (isGreenStart) {
      bgStyle = 'bg-emerald-500/30 border-emerald-500 shadow-inner shadow-emerald-500/20';
    } else if (isYellowStart) {
      bgStyle = 'bg-amber-500/30 border-amber-500 shadow-inner shadow-amber-500/20';
    } else if (isBlueStart) {
      bgStyle = 'bg-sky-500/30 border-sky-500 shadow-inner shadow-sky-500/20';
    } else if (isRedRunway) {
      bgStyle = 'bg-rose-500/35 border-rose-500/50';
    } else if (isGreenRunway) {
      bgStyle = 'bg-emerald-500/35 border-emerald-500/50';
    } else if (isTopRunway) {
      bgStyle = 'bg-sky-500/35 border-sky-500/50';
    } else if (isBottomRunway) {
      bgStyle = 'bg-amber-500/35 border-amber-500/50';
    } else if (isSafe) {
      bgStyle = 'bg-amber-400/15 border-amber-400/50';
    }

    return (
      <div
        key={`cell-${r}-${c}`}
        style={{
          gridRow: r + 1,
          gridColumn: c + 1,
        }}
        className={`relative flex items-center justify-center border text-center transition-all ${bgStyle} ${
          hasLegalToken ? 'ring-2 ring-amber-400 z-20' : ''
        }`}
      >
        {/* Safe Star Marker */}
        {isSafe && !isRedStart && !isGreenStart && !isYellowStart && !isBlueStart && (
          <Star className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-amber-400 fill-amber-400/50 pointer-events-none drop-shadow" />
        )}

        {/* Start Markers */}
        {isRedStart && tokensHere.length === 0 && (
          <ArrowRight className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-rose-400 stroke-[3] pointer-events-none" />
        )}
        {isGreenStart && tokensHere.length === 0 && (
          <ArrowLeft className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-emerald-400 stroke-[3] pointer-events-none" />
        )}
        {isYellowStart && tokensHere.length === 0 && (
          <ArrowUp className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-amber-400 stroke-[3] pointer-events-none" />
        )}
        {isBlueStart && tokensHere.length === 0 && (
          <ArrowDown className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-sky-400 stroke-[3] pointer-events-none" />
        )}

        {/* Runway Directional Guides */}
        {isRedRunway && tokensHere.length === 0 && (
          <ArrowRight className="h-2 w-2 sm:h-3 sm:w-3 text-rose-400/50 pointer-events-none" />
        )}
        {isGreenRunway && tokensHere.length === 0 && (
          <ArrowLeft className="h-2 w-2 sm:h-3 sm:w-3 text-emerald-400/50 pointer-events-none" />
        )}
        {isTopRunway && tokensHere.length === 0 && (
          <ArrowDown className="h-2 w-2 sm:h-3 sm:w-3 text-sky-400/50 pointer-events-none" />
        )}
        {isBottomRunway && tokensHere.length === 0 && (
          <ArrowUp className="h-2 w-2 sm:h-3 sm:w-3 text-amber-400/50 pointer-events-none" />
        )}

        {/* Tokens Container with Stacking Support */}
        {tokensHere.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center p-0.5">
            {tokensHere.length === 1 ? (
              renderTokenButton(tokensHere[0].token, tokensHere[0].color, tokensHere[0].isLegal)
            ) : (
              <div className="grid grid-cols-2 gap-0.5 w-full h-full p-0.5">
                {tokensHere.slice(0, 4).map(({ token, color, isLegal }) => (
                  <div key={`${color}-${token.id}`} className="flex items-center justify-center">
                    {renderTokenButton(token, color, isLegal, 'w-full h-full text-[8px]')}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Yard render helper for any quadrant
  const renderYard = (color: LudoColor, rowRange: string, colRange: string, label: string) => {
    const player = getPlayerByColor(color);
    const isActive = player !== undefined;
    const yardTokens = player ? player.tokens.filter((t) => t.step === -1) : [];

    let cornerClass = '';
    let borderStyle = '';
    let bgStyle = '';

    if (color === 'blue') {
      cornerClass = 'rounded-tl-xl sm:rounded-tl-2xl';
      borderStyle = 'border-r border-b border-sky-500/30';
      bgStyle = isActive
        ? 'bg-gradient-to-br from-sky-600/25 via-sky-950/60 to-slate-950'
        : 'bg-slate-950/60 opacity-40';
    } else if (color === 'green') {
      cornerClass = 'rounded-tr-xl sm:rounded-tr-2xl';
      borderStyle = 'border-l border-b border-emerald-500/40';
      bgStyle = isActive
        ? 'bg-gradient-to-bl from-emerald-600/30 via-emerald-950/60 to-slate-950'
        : 'bg-slate-950/60 opacity-40';
    } else if (color === 'red') {
      cornerClass = 'rounded-bl-xl sm:rounded-bl-2xl';
      borderStyle = 'border-r border-t border-rose-500/40';
      bgStyle = isActive
        ? 'bg-gradient-to-tr from-rose-600/30 via-rose-950/60 to-slate-950'
        : 'bg-slate-950/60 opacity-40';
    } else if (color === 'yellow') {
      cornerClass = 'rounded-br-xl sm:rounded-br-2xl';
      borderStyle = 'border-l border-t border-amber-500/30';
      bgStyle = isActive
        ? 'bg-gradient-to-tl from-amber-600/25 via-amber-950/60 to-slate-950'
        : 'bg-slate-950/60 opacity-40';
    }

    return (
      <div
        style={{ gridRow: rowRange, gridColumn: colRange }}
        className={`${cornerClass} ${borderStyle} ${bgStyle} p-2 sm:p-2.5 flex flex-col items-center justify-between select-none transition-all`}
      >
        <div className="flex items-center gap-1 text-[9px] sm:text-[11px] font-bold tracking-wider uppercase">
          <span
            className={
              color === 'red'
                ? 'text-rose-400'
                : color === 'green'
                ? 'text-emerald-400'
                : color === 'yellow'
                ? 'text-amber-400'
                : 'text-sky-400'
            }
          >
            {label}
          </span>
          {player && (
            <span
              className={`text-[8px] font-mono px-1 py-0.2 rounded ${
                player.isBot
                  ? 'bg-slate-800 text-slate-300'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
              }`}
            >
              {player.isBot ? 'BOT' : 'YOU'}
            </span>
          )}
        </div>

        {/* 4 Yard Slot Circles */}
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 p-1.5 sm:p-2 rounded-xl bg-slate-950/70 border border-slate-800 shadow-inner">
          {[0, 1, 2, 3].map((slotIdx) => {
            const token = isActive ? yardTokens.find((t) => t.id === slotIdx) : null;
            const isLegal =
              token !== null &&
              token !== undefined &&
              currentTurn === color &&
              legalTokenIds.includes(token.id) &&
              !disabled;

            return (
              <div
                key={`${color}-slot-${slotIdx}`}
                className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shadow-inner"
              >
                {token ? (
                  renderTokenButton(token, color, isLegal)
                ) : (
                  <div
                    className={`w-2 h-2 rounded-full ${
                      color === 'red'
                        ? 'bg-rose-500/20'
                        : color === 'green'
                        ? 'bg-emerald-500/20'
                        : color === 'yellow'
                        ? 'bg-amber-500/20'
                        : 'bg-sky-500/20'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <span className="text-[8px] font-mono text-slate-500">
          {isActive ? `${yardTokens.length} IN YARD` : 'STANDBY'}
        </span>
      </div>
    );
  };

  return (
    <div className="relative aspect-square w-full max-w-[min(100%,460px)] mx-auto rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-700/80 sm:border-2 shadow-2xl bg-slate-950 select-none p-0.5 xs:p-1 sm:p-1.5">
      {/* 15x15 CSS Grid Container */}
      <div
        className="w-full h-full gap-[1px] bg-slate-800/60"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(15, minmax(0, 1fr))',
          gridTemplateRows: 'repeat(15, minmax(0, 1fr))',
        }}
      >
        {/* 1. TOP-LEFT: BLUE HOME BASE */}
        {renderYard('blue', '1 / 7', '1 / 7', 'BLUE BASE')}

        {/* 2. TOP-RIGHT: GREEN HOME BASE */}
        {renderYard('green', '1 / 7', '10 / 16', 'GREEN BASE')}

        {/* 3. BOTTOM-LEFT: RED HOME BASE */}
        {renderYard('red', '10 / 16', '1 / 7', 'RED BASE')}

        {/* 4. BOTTOM-RIGHT: YELLOW HOME BASE */}
        {renderYard('yellow', '10 / 16', '10 / 16', 'YELLOW BASE')}

        {/* 5. CENTER FINISHING SANCTUARY (Rows 7..9, Cols 7..9) */}
        <div
          style={{ gridRow: '7 / 10', gridColumn: '7 / 10' }}
          className="relative bg-slate-950 border border-amber-400/50 flex items-center justify-center overflow-hidden shadow-2xl"
        >
          {/* Triangular Corner Accents for 4 Colors */}
          <div
            className="absolute inset-0 bg-rose-500/30"
            style={{ clipPath: 'polygon(0 0, 50% 50%, 0 100%)' }}
          />
          <div
            className="absolute inset-0 bg-emerald-500/30"
            style={{ clipPath: 'polygon(100% 0, 50% 50%, 100% 100%)' }}
          />
          <div
            className="absolute inset-0 bg-sky-500/20"
            style={{ clipPath: 'polygon(0 0, 100% 0, 50% 50%)' }}
          />
          <div
            className="absolute inset-0 bg-amber-500/20"
            style={{ clipPath: 'polygon(0 100%, 100% 100%, 50% 50%)' }}
          />

          {/* Golden Center Apex */}
          <div className="relative z-10 flex flex-col items-center justify-center p-1 bg-slate-950/85 rounded-full border border-amber-400/60 shadow-lg w-10 h-10 sm:w-12 sm:h-12">
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400 animate-pulse" />
            <span className="text-[8px] font-black font-mono text-amber-300">GOAL</span>
          </div>
        </div>

        {/* 6. The 72 Track and Runway Cells */}
        {trackCells}
      </div>
    </div>
  );
}
