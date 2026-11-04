import React from 'react';
import type { PieceSymbol } from 'chess.js';

type PieceProps = {
  type: PieceSymbol;
  color: 'w' | 'b';
  className?: string;
};

export default function ChessPiece({ type, color, className = 'w-full h-full' }: PieceProps) {
  const isWhite = color === 'w';

  // Crisp, styled SVG chess pieces with arcade contrast
  const fill = isWhite ? '#f8fafc' : '#1e293b';
  const stroke = isWhite ? '#0f172a' : '#94a3b8';
  const accent = isWhite ? '#e2e8f0' : '#0f172a';

  switch (type) {
    case 'p': // Pawn
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <path
            d="m 22.5,9 c -2.21,0 -4,1.79 -4,4 0,0.89 0.29,1.71 0.78,2.38 C 17.33,16.5 16,18.59 16,21 c 0,2.03 0.94,3.84 2.41,5.03 C 15.41,27.09 11,31.58 11,39.5 l 23,0 c 0,-7.92 -4.41,-12.41 -7.41,-13.47 1.47,-1.19 2.41,-3 2.41,-5.03 0,-2.41 -1.33,-4.5 -3.28,-5.62 0.49,-0.67 0.78,-1.49 0.78,-2.38 0,-2.21 -1.79,-4 -4,-4 z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'n': // Knight
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m 22,10 c 10.5,1 16.5,8 16,29 L 15,39 C 15,30 9.5,25.5 8,16 c 13,0 8.5,-9.5 14,-6 z" />
            <path d="m 24,18 c 0.38,2.91 -5.55,7.37 -8,9 -3,2 -2.82,4.34 -5,4 -1.042,-0.94 1.41,-4.04 3,-6 2.1,-2.6 4.5,-4.8 6,-7 z" fill={accent} />
            <circle cx="15" cy="14" r="1.5" fill={isWhite ? '#0f172a' : '#f8fafc'} />
          </g>
        </svg>
      );

    case 'b': // Bishop
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m 9,36 c 3.39,-0.97 10.11,0.43 13.5,-2 3.39,2.43 10.11,1.03 13.5,2 0,0 1.65,0.54 3,2 -0.68,0.97 -1.65,0.99 -3,1 -3.39,-0.21 -10.11,1.19 -13.5,-1 -3.39,2.19 -10.11,0.79 -13.5,1 -1.35,-0.01 -2.32,-0.03 -3,-1 1.35,-1.46 3,-2 3,-2 z" />
            <path d="m 15,32 c 2.5,2.5 12.5,2.5 15,0 0.5,-1.5 0,-2 0,-2 0,-2.5 -2.5,-4 -2.5,-4 5.5,-1.5 6,-11.5 -5,-15.5 -11,4 -10.5,14 -5,15.5 0,0 -2.5,1.5 -2.5,4 0,0 -0.5,0.5 0,2 z" />
            <circle cx="22.5" cy="8" r="2.5" />
            <path d="m 17.5,16 10,0 M 22.5,11 l 0,10" stroke={stroke} strokeWidth="1.5" />
          </g>
        </svg>
      );

    case 'r': // Rook
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m 9,39 27,0 c 0,-3 -2.5,-3.5 -2.5,-3.5 l -22,0 c 0,0 -2.5,0.5 -2.5,3.5 z" />
            <path d="m 12,35.5 21,0 0,-4 -21,0 0,4 z" />
            <path d="m 14,31.5 17,0 -1,-14 -15,0 -1,14 z" />
            <path d="m 11,14 23,0 0,-5 -4,0 0,2 -4,0 0,-2 -3,0 0,2 -4,0 0,-2 -4,0 0,5 z" />
          </g>
        </svg>
      );

    case 'q': // Queen
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m 9,39 27,0 c 0,-3 -2.5,-3.5 -2.5,-3.5 l -22,0 c 0,0 -2.5,0.5 -2.5,3.5 z" />
            <path d="m 12,35.5 21,0 -1.5,-4.5 -18,0 -1.5,4.5 z" />
            <path d="m 12.5,30 20,0 c 0,-4 -3,-8 -3,-8 l 4,-9 -7,3 -4,-7 -4,7 -7,-3 4,9 c 0,0 -3,4 -3,8 z" />
            <circle cx="6" cy="12" r="2" />
            <circle cx="14" cy="9" r="2" />
            <circle cx="22.5" cy="8" r="2" />
            <circle cx="31" cy="9" r="2" />
            <circle cx="39" cy="12" r="2" />
          </g>
        </svg>
      );

    case 'k': // King
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m 22.5,11.63 0,-5 M 20,8.63 l 5,0" stroke={stroke} strokeWidth="1.5" />
            <path d="m 9,39 27,0 c 0,-3 -2.5,-3.5 -2.5,-3.5 l -22,0 c 0,0 -2.5,0.5 -2.5,3.5 z" />
            <path d="m 12,35.5 21,0 -1,-4 -19,0 -1,4 z" />
            <path d="m 11.5,31 22,0 c 0,-6 -4.5,-8 -4.5,-8 3,-2.5 3.5,-6 3.5,-8 0,-5.5 -4.5,-6 -10,-6 -5.5,0 -10,0.5 -10,6 0,2 0.5,5.5 3.5,8 0,0 -4.5,2 -4.5,8 z" />
            <circle cx="22.5" cy="17" r="3" fill={accent} />
          </g>
        </svg>
      );

    default:
      return null;
  }
}
