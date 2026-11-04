import React from 'react';
import { Chess, type Square, type Move } from 'chess.js';
import ChessPiece from './ChessPieces';

type ChessBoardProps = {
  chess: Chess;
  playerColor: 'w' | 'b';
  selectedSquare: Square | null;
  onSquareClick: (square: Square) => void;
  legalMovesForSelected: Move[];
  lastMove: { from: string; to: string } | null;
  isCheck: boolean;
  disabled?: boolean;
};
export default function ChessBoard({
  chess,
  playerColor,
  selectedSquare,
  onSquareClick,
  legalMovesForSelected,
  lastMove,
  isCheck,
  disabled = false,
}: ChessBoardProps) {
  const isFlipped = playerColor === 'b';
  const ranks = isFlipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
  const files = isFlipped ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'] : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const legalDestinationSquares = new Set(legalMovesForSelected.map((m) => m.to));
  const turn = chess.turn();

  // Find King square if in check
  let checkKingSquare: Square | null = null;
  if (isCheck) {
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === turn) {
          checkKingSquare = `${'abcdefgh'[c]}${8 - r}` as Square;
          break;
        }
      }
    }
  }

  return (
    <div className="relative aspect-square w-full max-w-[min(100%,460px)] mx-auto rounded-xl sm:rounded-2xl overflow-hidden border-2 sm:border-4 border-slate-700/80 shadow-2xl bg-slate-950 select-none">
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
        {ranks.map((rank, rIdx) =>
          files.map((file, fIdx) => {
            const square = `${file}${rank}` as Square;
            const piece = chess.get(square);
            const isDark = (rIdx + fIdx) % 2 === 1;

            const isSelected = selectedSquare === square;
            const isLegalTarget = legalDestinationSquares.has(square);
            const moveForSquare = isLegalTarget ? legalMovesForSelected.find((m) => m.to === square) : undefined;
            const isCaptureTarget =
              isLegalTarget && (piece !== null || Boolean(moveForSquare?.captured || moveForSquare?.flags?.includes('e')));
            const isLastMoveSquare = lastMove && (lastMove.from === square || lastMove.to === square);
            const isKingInCheck = checkKingSquare === square;

            return (
              <button
                key={square}
                type="button"
                disabled={disabled}
                onClick={() => onSquareClick(square)}
                className={`relative flex items-center justify-center p-0.5 sm:p-1.5 transition-colors focus:outline-none ${isDark ? 'bg-slate-800/90' : 'bg-slate-600/60'
                  } ${isSelected ? '!bg-amber-400/40 ring-2 ring-inset ring-amber-400 z-10' : ''
                  } ${isLastMoveSquare ? '!bg-amber-500/20' : ''
                  } ${isKingInCheck ? '!bg-rose-500/40 ring-4 ring-rose-500 animate-pulse z-20' : ''
                  } ${disabled ? 'cursor-default' : 'cursor-pointer hover:brightness-110'}`}
              >
                {/* Coordinates */}
                {fIdx === 0 && (
                  <span className={`absolute top-0.5 left-0.5 sm:left-1 text-[7px] sm:text-[9px] font-mono font-bold leading-none ${isDark ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                    {rank}
                  </span>
                )}
                {rIdx === 7 && (
                  <span className={`absolute bottom-0.5 right-0.5 sm:right-1 text-[7px] sm:text-[9px] font-mono font-bold leading-none ${isDark ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                    {file}
                  </span>
                )}
                {/* Piece Icon */}
                {piece && (
                  <div className="w-full h-full flex items-center justify-center z-10 transition-transform active:scale-95">
                    <ChessPiece type={piece.type} color={piece.color} />
                  </div>
                )}

                {/* Legal Move Target Marker */}
                {isLegalTarget && !isCaptureTarget && (
                  <div className="absolute w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-400/80 shadow-md shadow-emerald-500/50 pointer-events-none z-20 animate-pop" />
                )}

                {/* Legal Capture Target Ring */}
                {isCaptureTarget && (
                  <div className="absolute inset-1 rounded-xl border-2 sm:border-3 border-rose-400/90 bg-rose-500/10 pointer-events-none z-20 animate-pop" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}