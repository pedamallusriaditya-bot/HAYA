import type { Square } from 'chess.js';
import {
  createChessGame,
  getGameStatus,
  getCapturedPieces,
  type CapturedPieces,
  type GameStatus,
  type ChessColor,
} from './engine.ts';

export type ChessOnlineMove = {
  from: string;
  to: string;
  promotion?: string;
  fenAfter?: string;
};

export type ChessOnlineState = {
  fen: string;
  turn: ChessColor;
  lastAppliedSeq: number;
  winner: ChessColor | 'draw' | null;
  isOver: boolean;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  drawReason?: string;
  captured: CapturedPieces;
  lastMove: { from: string; to: string } | null;
  history: string[];
};

export type ChessMoveResult =
  | {
      success: false;
      reason: 'game_over' | 'invalid_seq' | 'out_of_turn' | 'illegal_move' | 'fen_mismatch';
    }
  | {
      success: true;
      nextState: ChessOnlineState;
      status: GameStatus;
    };

export function createInitialChessOnlineState(fen?: string): ChessOnlineState {
  const chess = createChessGame(fen);
  const status = getGameStatus(chess);
  return {
    fen: chess.fen(),
    turn: chess.turn() as ChessColor,
    lastAppliedSeq: 0,
    winner: status.winner,
    isOver: status.isOver,
    isCheck: status.isCheck,
    isCheckmate: status.isCheckmate,
    isStalemate: status.isStalemate,
    isDraw: status.isDraw,
    drawReason: status.drawReason,
    captured: getCapturedPieces(chess),
    lastMove: null,
    history: [],
  };
}

export function applyOnlineChessMove(
  state: ChessOnlineState,
  color: ChessColor,
  move: ChessOnlineMove,
  seq: number
): ChessMoveResult {
  if (state.isOver) {
    return { success: false, reason: 'game_over' };
  }

  if (seq <= state.lastAppliedSeq) {
    return { success: false, reason: 'invalid_seq' };
  }

  if (color !== state.turn) {
    return { success: false, reason: 'out_of_turn' };
  }

  const chess = createChessGame(state.fen);
  try {
    const executed = chess.move({
      from: move.from as Square,
      to: move.to as Square,
      promotion: move.promotion,
    });
    if (!executed) {
      return { success: false, reason: 'illegal_move' };
    }
  } catch {
    return { success: false, reason: 'illegal_move' };
  }

  const newFen = chess.fen();
  if (move.fenAfter && move.fenAfter !== newFen) {
    return { success: false, reason: 'fen_mismatch' };
  }

  const status = getGameStatus(chess);
  const captured = getCapturedPieces(chess);

  const nextState: ChessOnlineState = {
    fen: newFen,
    turn: chess.turn() as ChessColor,
    lastAppliedSeq: seq,
    winner: status.winner,
    isOver: status.isOver,
    isCheck: status.isCheck,
    isCheckmate: status.isCheckmate,
    isStalemate: status.isStalemate,
    isDraw: status.isDraw,
    drawReason: status.drawReason,
    captured,
    lastMove: { from: move.from, to: move.to },
    history: [...state.history, `${move.from}-${move.to}`],
  };

  return {
    success: true,
    nextState,
    status,
  };
}

export function applyResignation(
  state: ChessOnlineState,
  resigningColor: ChessColor,
  seq: number
): ChessOnlineState {
  const winner: ChessColor = resigningColor === 'w' ? 'b' : 'w';
  return {
    ...state,
    lastAppliedSeq: seq,
    isOver: true,
    winner,
    drawReason: `${resigningColor === 'w' ? 'White' : 'Black'} resigned`,
  };
}

export function applyDrawAgreement(state: ChessOnlineState, seq: number): ChessOnlineState {
  return {
    ...state,
    lastAppliedSeq: seq,
    isOver: true,
    isDraw: true,
    winner: 'draw',
    drawReason: 'Draw agreed by players',
  };
}
