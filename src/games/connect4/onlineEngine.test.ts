import test from 'node:test';
import assert from 'node:assert/strict';
import { checkWinner } from './engine.ts';
import {
  createInitialOnlineState,
  applyOnlineMove,
} from './onlineEngine.ts';

test('Connect 4 Online Engine: In-order alternating moves update state correctly', () => {
  let state = createInitialOnlineState('R');
  assert.equal(state.currentTurn, 'R');
  assert.equal(state.lastAppliedSeq, 0);

  // Red drops in col 3 (seq 1)
  const m1 = applyOnlineMove(state, 3, 'R', 1);
  assert.equal(m1.success, true);
  if (!m1.success) return;
  state = m1.nextState;
  assert.equal(state.board[5][3], 'R');
  assert.equal(state.currentTurn, 'Y');
  assert.equal(state.lastAppliedSeq, 1);
  assert.equal(state.winner, null);

  // Yellow drops in col 3 (seq 2)
  const m2 = applyOnlineMove(state, 3, 'Y', 2);
  assert.equal(m2.success, true);
  if (!m2.success) return;
  state = m2.nextState;
  assert.equal(state.board[4][3], 'Y');
  assert.equal(state.currentTurn, 'R');
  assert.equal(state.lastAppliedSeq, 2);
});

test('Connect 4 Online Engine: Rejects duplicate and out-of-order sequence numbers', () => {
  let state = createInitialOnlineState('R');
  const m1 = applyOnlineMove(state, 0, 'R', 5);
  assert.equal(m1.success, true);
  if (!m1.success) return;
  state = m1.nextState;

  // Duplicate seq (5) rejected
  const dup = applyOnlineMove(state, 1, 'Y', 5);
  assert.equal(dup.success, false);
  if (!dup.success) {
    assert.equal(dup.reason, 'invalid_seq');
  }

  // Stale seq (4) rejected
  const stale = applyOnlineMove(state, 1, 'Y', 4);
  assert.equal(stale.success, false);
  if (!stale.success) {
    assert.equal(stale.reason, 'invalid_seq');
  }
});

test('Connect 4 Online Engine: Rejects out-of-turn moves', () => {
  const state = createInitialOnlineState('R');
  // Yellow tries to move on Red's turn
  const outOfTurn = applyOnlineMove(state, 3, 'Y', 1);
  assert.equal(outOfTurn.success, false);
  if (!outOfTurn.success) {
    assert.equal(outOfTurn.reason, 'out_of_turn');
  }
});

test('Connect 4 Online Engine: Detects horizontal win', () => {
  let state = createInitialOnlineState('R');
  // Red plays 0, 1, 2, 3 on bottom row; Yellow plays on row above or elsewhere
  let seq = 1;
  for (let c = 0; c < 3; c++) {
    const rMove = applyOnlineMove(state, c, 'R', seq++);
    assert.equal(rMove.success, true);
    if (rMove.success) state = rMove.nextState;

    const yMove = applyOnlineMove(state, c, 'Y', seq++);
    assert.equal(yMove.success, true);
    if (yMove.success) state = yMove.nextState;
  }

  // Red plays col 3 -> horizontal connect 4
  const winningMove = applyOnlineMove(state, 3, 'R', seq++);
  assert.equal(winningMove.success, true);
  if (winningMove.success) {
    assert.equal(winningMove.winnerResult.winner, 'R');
    assert.equal(winningMove.nextState.winner, 'R');
    assert.notEqual(winningMove.winnerResult.winningLine, null);
  }
});

test('Connect 4 Online Engine: Detects vertical win', () => {
  let state = createInitialOnlineState('R');
  let seq = 1;
  // Red stacks col 0: 3 pieces, Yellow stacks col 1: 3 pieces
  for (let i = 0; i < 3; i++) {
    const rMove = applyOnlineMove(state, 0, 'R', seq++);
    assert.equal(rMove.success, true);
    if (rMove.success) state = rMove.nextState;

    const yMove = applyOnlineMove(state, 1, 'Y', seq++);
    assert.equal(yMove.success, true);
    if (yMove.success) state = yMove.nextState;
  }

  // Red drops 4th piece in col 0 -> vertical win
  const winningMove = applyOnlineMove(state, 0, 'R', seq++);
  assert.equal(winningMove.success, true);
  if (winningMove.success) {
    assert.equal(winningMove.winnerResult.winner, 'R');
    assert.equal(winningMove.nextState.winner, 'R');
  }
});

test('Connect 4 Online Engine: Detects diagonal down-right win', () => {
  let state = createInitialOnlineState('R');
  let seq = 1;

  // Build columns to achieve diagonal \ for Red:
  // Col 0: R at row 2 (stack height 4)
  // Col 1: R at row 3 (stack height 3)
  // Col 2: R at row 4 (stack height 2)
  // Col 3: R at row 5 (stack height 1)
  const moves: [number, 'R' | 'Y'][] = [
    [3, 'R'], // Red at (5,3)
    [2, 'Y'], // Yellow at (5,2)
    [2, 'R'], // Red at (4,2)
    [1, 'Y'], // Yellow at (5,1)
    [1, 'R'], // Red at (4,1)
    [0, 'Y'], // Yellow at (5,0)
    [1, 'R'], // Red at (3,1)
    [0, 'Y'], // Yellow at (4,0)
    [0, 'R'], // Red at (3,0)
    [6, 'Y'], // Yellow elsewhere
    [0, 'R'], // Red at (2,0) -> forms (2,0), (3,1), (4,2), (5,3) diagonal!
  ];

  for (const [col, piece] of moves) {
    const res = applyOnlineMove(state, col, piece, seq++);
    assert.equal(res.success, true);
    if (res.success) state = res.nextState;
  }

  assert.equal(state.winner, 'R');
});

test('Connect 4 Online Engine: Detects diagonal up-right win', () => {
  let state = createInitialOnlineState('R');
  let seq = 1;

  // Build columns to achieve diagonal / for Red:
  // (5,0), (4,1), (3,2), (2,3)
  const moves: [number, 'R' | 'Y'][] = [
    [0, 'R'], // Red at (5,0)
    [1, 'Y'], // Yellow at (5,1)
    [1, 'R'], // Red at (4,1)
    [2, 'Y'], // Yellow at (5,2)
    [2, 'R'], // Red at (4,2)
    [3, 'Y'], // Yellow at (5,3)
    [2, 'R'], // Red at (3,2)
    [3, 'Y'], // Yellow at (4,3)
    [3, 'R'], // Red at (3,3)
    [6, 'Y'], // Yellow elsewhere
    [3, 'R'], // Red at (2,3) -> forms (5,0), (4,1), (3,2), (2,3) diagonal!
  ];

  for (const [col, piece] of moves) {
    const res = applyOnlineMove(state, col, piece, seq++);
    assert.equal(res.success, true);
    if (res.success) state = res.nextState;
  }

  assert.equal(state.winner, 'R');
});

test('Connect 4 Online Engine: Detects draw when board fills with no 4-in-a-row', () => {
  const state = createInitialOnlineState('R');

  // Fill board pattern:
  // Col 0, 1: R R Y Y R R / Y Y R R Y Y
  // Alternating columns with no 4 in a line
  const pattern: ('R' | 'Y')[][] = [
    ['R', 'R', 'Y', 'Y', 'R', 'R'],
    ['Y', 'Y', 'R', 'R', 'Y', 'Y'],
    ['R', 'R', 'Y', 'Y', 'R', 'R'],
    ['Y', 'Y', 'R', 'R', 'Y', 'Y'],
    ['R', 'R', 'Y', 'Y', 'R', 'R'],
    ['Y', 'Y', 'R', 'R', 'Y', 'Y'],
    ['R', 'Y', 'R', 'Y', 'R', 'Y'],
  ];

  // Directly test checkWinner draw logic with full board
  const board = state.board;
  for (let c = 0; c < 7; c++) {
    for (let r = 0; r < 6; r++) {
      board[r][c] = pattern[c][r];
    }
  }

  const result = checkWinner(board);
  assert.equal(result.winner, 'draw');
});
