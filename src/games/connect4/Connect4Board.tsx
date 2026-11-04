import React, { useState } from 'react';
import { ROWS, COLS, type Connect4Board as BoardType, type WinningLine, type Connect4Piece } from './engine';

type Connect4BoardProps = {
  board: BoardType;
  onColumnClick: (col: number) => void;
  winningLine: WinningLine | null;
  currentTurn: Connect4Piece;
  disabled?: boolean;
};

export default function Connect4Board({
  board,
  onColumnClick,
  winningLine,
  currentTurn,
  disabled = false,
}: Connect4BoardProps) {
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

  const isWinningCell = (r: number, c: number) => {
    if (!winningLine) return false;
    return winningLine.some(([wr, wc]) => wr === r && wc === c);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto select-none">
      {/* Column Hover Indicator Bar */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 w-full px-2 sm:px-4 mb-1 sm:mb-2 h-6 sm:h-8">
        {Array.from({ length: COLS }).map((_, c) => {
          const isColFull = board[0][c] !== null;
          const isHovered = hoveredCol === c && !disabled && !isColFull;

          return (
            <div key={c} className="flex justify-center items-center">
              {isHovered && (
                <div
                  className={`w-5 h-5 sm:w-7 sm:h-7 rounded-full shadow-lg transition-transform animate-bounce ${
                    currentTurn === 'R'
                      ? 'bg-rose-500 shadow-rose-500/50'
                      : 'bg-amber-400 shadow-amber-400/50'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Main 7x6 Arcade Cabinet Grid */}
      <div className="arcade-cabinet p-2 sm:p-4 bg-indigo-950/90 border-2 sm:border-4 border-indigo-700/80 rounded-2xl sm:rounded-3xl shadow-2xl w-full">
        <div className="grid grid-cols-7 gap-1 xs:gap-1.5 sm:gap-2.5">
          {Array.from({ length: COLS }).map((_, c) => {
            const isColFull = board[0][c] !== null;
            const canClick = !disabled && !isColFull;

            return (
              <button
                key={c}
                type="button"
                disabled={!canClick}
                onClick={() => onColumnClick(c)}
                onMouseEnter={() => setHoveredCol(c)}
                onMouseLeave={() => setHoveredCol(null)}
                className={`flex flex-col gap-1 xs:gap-1.5 sm:gap-2.5 p-0.5 sm:p-1 rounded-xl sm:rounded-2xl transition-colors ${
                  canClick ? 'hover:bg-indigo-900/50 cursor-pointer active:scale-[0.98]' : 'cursor-default'
                }`}
              >
                {Array.from({ length: ROWS }).map((_, r) => {
                  const cell = board[r][c];
                  const isWin = isWinningCell(r, c);

                  return (
                    <div
                      key={r}
                      className="relative w-full aspect-square rounded-full flex items-center justify-center overflow-hidden bg-slate-950/90 border-2 border-indigo-900 shadow-inner"
                    >
                      {cell === 'R' && (
                        <div
                          className={`w-[90%] h-[90%] rounded-full bg-gradient-to-br from-rose-400 to-rose-600 border border-rose-300 shadow-md shadow-rose-500/30 animate-pop ${
                            isWin ? 'ring-4 ring-amber-300 ring-offset-2 ring-offset-slate-950 animate-pulse' : ''
                          }`}
                        >
                          <div className="w-1/3 h-1/3 mt-1.5 ml-1.5 rounded-full bg-white/30" />
                        </div>
                      )}

                      {cell === 'Y' && (
                        <div
                          className={`w-[90%] h-[90%] rounded-full bg-gradient-to-br from-amber-300 to-amber-500 border border-amber-200 shadow-md shadow-amber-500/30 animate-pop ${
                            isWin ? 'ring-4 ring-amber-300 ring-offset-2 ring-offset-slate-950 animate-pulse' : ''
                          }`}
                        >
                          <div className="w-1/3 h-1/3 mt-1.5 ml-1.5 rounded-full bg-white/30" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
