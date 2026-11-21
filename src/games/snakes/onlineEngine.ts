import { calculateMove, type MoveResult } from './engine.ts';

export type SnakesPlayerIndex = 0 | 1;

export type SnakesOnlineState = {
  positions: [number, number];
  currentTurn: SnakesPlayerIndex;
  lastAppliedSeq: number;
  winner: SnakesPlayerIndex | null;
  lastRoll: number | null;
  lastJump: { from: number; to: number; type: 'ladder' | 'snake' } | null;
};

export type SnakesRollResult =
  | { success: false; reason: 'out_of_turn' | 'game_over' | 'invalid_seq' | 'invalid_roll' }
  | {
      success: true;
      nextState: SnakesOnlineState;
      moveRes: MoveResult;
    };

export function createInitialOnlineState(firstMover: SnakesPlayerIndex = 0): SnakesOnlineState {
  return {
    positions: [0, 0],
    currentTurn: firstMover,
    lastAppliedSeq: 0,
    winner: null,
    lastRoll: null,
    lastJump: null,
  };
}

export function applyOnlineRoll(
  state: SnakesOnlineState,
  playerIndex: SnakesPlayerIndex,
  roll: number,
  seq: number
): SnakesRollResult {
  if (state.winner !== null) {
    return { success: false, reason: 'game_over' };
  }

  if (seq <= state.lastAppliedSeq) {
    return { success: false, reason: 'invalid_seq' };
  }

  if (playerIndex !== state.currentTurn) {
    return { success: false, reason: 'out_of_turn' };
  }

  if (!Number.isInteger(roll) || roll < 1 || roll > 6) {
    return { success: false, reason: 'invalid_roll' };
  }

  const currentSquare = state.positions[playerIndex];
  const moveRes = calculateMove(currentSquare, roll);

  const nextPositions: [number, number] = [...state.positions];
  nextPositions[playerIndex] = moveRes.finalSquare;

  const hasWon = moveRes.finalSquare === 100;
  const winner = hasWon ? playerIndex : null;

  let nextTurn = state.currentTurn;
  if (!hasWon) {
    if (!moveRes.givesExtraTurn) {
      nextTurn = playerIndex === 0 ? 1 : 0;
    }
  }

  const nextState: SnakesOnlineState = {
    positions: nextPositions,
    currentTurn: nextTurn,
    lastAppliedSeq: seq,
    winner,
    lastRoll: roll,
    lastJump: moveRes.jumpType
      ? { from: moveRes.jumpFrom!, to: moveRes.jumpTo!, type: moveRes.jumpType }
      : null,
  };

  return {
    success: true,
    nextState,
    moveRes,
  };
}
