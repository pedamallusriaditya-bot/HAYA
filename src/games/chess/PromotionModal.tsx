import React from 'react';
import type { PieceSymbol } from 'chess.js';
import ChessPiece from './ChessPieces';

type PromotionModalProps = {
  color: 'w' | 'b';
  onSelect: (piece: PieceSymbol) => void;
};

export default function PromotionModal({ color, onSelect }: PromotionModalProps) {
  const pieces: { type: PieceSymbol; label: string }[] = [
    { type: 'q', label: 'Queen' },
    { type: 'r', label: 'Rook' },
    { type: 'b', label: 'Bishop' },
    { type: 'n', label: 'Knight' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-3 sm:p-4 animate-in">
      <div className="arcade-cabinet p-4 sm:p-6 max-w-sm w-full border-2 border-amber-400 text-center space-y-3 sm:space-y-4">
        <div>
          <span className="token-badge !bg-amber-500/10 !border-amber-500/30 !text-amber-400 mb-1">
            PAWN PROMOTION
          </span>
          <h3 className="text-lg sm:text-xl font-bold text-slate-100" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Choose Promotion Piece
          </h3>
          <p className="text-xs text-slate-400 mt-1">Select the piece your pawn transforms into:</p>
        </div>

        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {pieces.map((p) => (
            <button
              key={p.type}
              type="button"
              onClick={() => onSelect(p.type)}
              className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-950 border border-slate-700/80 hover:border-amber-400 hover:bg-slate-800 transition flex flex-col items-center gap-1 group active:scale-95"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ChessPiece type={p.type} color={color} />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-300 group-hover:text-amber-400 truncate">
                {p.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
