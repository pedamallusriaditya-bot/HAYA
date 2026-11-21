import {
  cloneBoard,
  dropPiece,
  checkWinner,
  createEmptyBoard,
  type Connect4Board,
  type Connect4Piece,
  type CheckWinnerResult,
} from './engine.ts';

export type Connect4OnlineState = {
  board: Connect4Board;
  currentTurn: Connect4Piece;
  lastAppliedSeq: number;
  winner: Connect4Piece | 'draw' | null;
  winningLine: [number, number][] | null;
};

export type Connect4MoveResult =
  | { success: false; reason: 'out_of_turn' | 'column_full' | 'game_over' | 'invalid_seq' }
  | {
      success: true;
      nextState: Connect4OnlineState;
      landingRow: number;
      winnerResult: CheckWinnerResult;
    };

export function createInitialOnlineState(firstMover: Connect4Piece = 'R'): Connect4OnlineState {
  return {
    board: createEmptyBoard(),
    currentTurn: firstMover,
    lastAppliedSeq: 0,
    winner: null,
    winningLine: null,
  };
}

/**
 * Validates and applies a move deterministically.
 * Enforces:
 * 1. Monotonic sequence: seq must be > lastAppliedSeq
 * 2. In-turn validation: piece must equal currentTurn
 * 3. Board state: game must not be over, column must not be full
 */
export function applyOnlineMove(
  state: Connect4OnlineState,
  col: number,
  piece: Connect4Piece,
  seq: number
): Connect4MoveResult {
  if (seq <= state.lastAppliedSeq) {
    return { success: false, reason: 'invalid_seq' };
  }
  if (state.winner !== null) {
    return { success: false, reason: 'game_over' };
  }
  if (piece !== state.currentTurn) {
    return { success: false, reason: 'out_of_turn' };
  }

  const nextBoard = cloneBoard(state.board);
  const landingRow = dropPiece(nextBoard, col, piece);
  if (landingRow === -1) {
    return { success: false, reason: 'column_full' };
  }

  const winnerResult = checkWinner(nextBoard);
  const nextTurn: Connect4Piece = piece === 'R' ? 'Y' : 'R';

  const nextState: Connect4OnlineState = {
    board: nextBoard,
    currentTurn: winnerResult.winner ? state.currentTurn : nextTurn,
    lastAppliedSeq: seq,
    winner: winnerResult.winner,
    winningLine: winnerResult.winningLine,
  };

  return {
    success: true,
    nextState,
    landingRow,
    winnerResult,
  };
}
