import { Chess, type PieceSymbol } from 'chess.js';

export type ChessColor = 'w' | 'b';

export type CapturedPieces = {
  w: PieceSymbol[]; // Pieces captured by White (Black pieces lost)
  b: PieceSymbol[]; // Pieces captured by Black (White pieces lost)
};

export type GameStatus = {
  isOver: boolean;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  drawReason?: string;
  winner: ChessColor | 'draw' | null;
};

export function createChessGame(fen?: string): Chess {
  return new Chess(fen);
}

export function getGameStatus(chess: Chess): GameStatus {
  const isCheck = chess.inCheck();
  const isOver = chess.isGameOver();
  const isCheckmate = chess.isCheckmate();
  const isStalemate = chess.isStalemate();
  const isThreefold = chess.isThreefoldRepetition();
  const isInsufficient = chess.isInsufficientMaterial();
  const isDraw = chess.isDraw();

  let winner: ChessColor | 'draw' | null = null;
  let drawReason: string | undefined;

  if (isCheckmate) {
    // Current turn is mated, so the other color won
    winner = chess.turn() === 'w' ? 'b' : 'w';
  } else if (isStalemate) {
    winner = 'draw';
    drawReason = 'Stalemate (no legal moves)';
  } else if (isThreefold) {
    winner = 'draw';
    drawReason = 'Draw by 3-fold repetition';
  } else if (isInsufficient) {
    winner = 'draw';
    drawReason = 'Draw by insufficient material';
  } else if (isDraw) {
    winner = 'draw';
    drawReason = 'Draw (50-move rule)';
  }

  return {
    isOver,
    isCheck,
    isCheckmate,
    isStalemate,
    isDraw,
    drawReason,
    winner,
  };
}

export function getCapturedPieces(chess: Chess): CapturedPieces {
  const initialPieces: Record<PieceSymbol, number> = {
    p: 8,
    n: 2,
    b: 2,
    r: 2,
    q: 1,
    k: 1,
  };

  const currentW: Record<PieceSymbol, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
  const currentB: Record<PieceSymbol, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };

  const board = chess.board();
  for (const row of board) {
    for (const cell of row) {
      if (cell) {
        if (cell.color === 'w') {
          currentW[cell.type] = (currentW[cell.type] || 0) + 1;
        } else {
          currentB[cell.type] = (currentB[cell.type] || 0) + 1;
        }
      }
    }
  }

  const capturedByWhite: PieceSymbol[] = [];
  const capturedByBlack: PieceSymbol[] = [];

  const pieces: PieceSymbol[] = ['q', 'r', 'b', 'n', 'p'];
  for (const p of pieces) {
    const missingWhite = Math.max(0, initialPieces[p] - (currentW[p] || 0));
    const missingBlack = Math.max(0, initialPieces[p] - (currentB[p] || 0));

    for (let i = 0; i < missingBlack; i++) capturedByWhite.push(p);
    for (let i = 0; i < missingWhite; i++) capturedByBlack.push(p);
  }

  return {
    w: capturedByWhite,
    b: capturedByBlack,
  };
}

export function getPieceValue(type: PieceSymbol): number {
  switch (type) {
    case 'p': return 1;
    case 'n': return 3;
    case 'b': return 3;
    case 'r': return 5;
    case 'q': return 9;
    case 'k': return 0;
    default: return 0;
  }
}

export function calculateMaterialAdvantage(captured: CapturedPieces): { whiteLead: number } {
  let whiteCapturedScore = 0;
  let blackCapturedScore = 0;

  captured.w.forEach((p) => { whiteCapturedScore += getPieceValue(p); });
  captured.b.forEach((p) => { blackCapturedScore += getPieceValue(p); });

  return { whiteLead: whiteCapturedScore - blackCapturedScore };
}
