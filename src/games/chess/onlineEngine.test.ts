import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialChessOnlineState,
  applyOnlineChessMove,
  applyResignation,
  applyDrawAgreement,
} from './onlineEngine.ts';

test('Chess Online Engine: Initial state', () => {
  const state = createInitialChessOnlineState();
  assert.equal(state.turn, 'w');
  assert.equal(state.lastAppliedSeq, 0);
  assert.equal(state.isOver, false);
  assert.equal(state.winner, null);
  assert.equal(state.isCheck, false);
});

test('Chess Online Engine: Legal moves alternate turns and update FEN', () => {
  let state = createInitialChessOnlineState();

  // White plays e2 -> e4
  const res1 = applyOnlineChessMove(state, 'w', { from: 'e2', to: 'e4' }, 1);
  assert.equal(res1.success, true);
  if (!res1.success) return;
  state = res1.nextState;
  assert.equal(state.turn, 'b');
  assert.equal(state.lastAppliedSeq, 1);
  assert.deepEqual(state.lastMove, { from: 'e2', to: 'e4' });

  // Black plays e7 -> e5
  const res2 = applyOnlineChessMove(state, 'b', { from: 'e7', to: 'e5' }, 2);
  assert.equal(res2.success, true);
  if (!res2.success) return;
  state = res2.nextState;
  assert.equal(state.turn, 'w');
  assert.equal(state.lastAppliedSeq, 2);
});

test('Chess Online Engine: Rejects out-of-turn, illegal move, and seq violations', () => {
  let state = createInitialChessOnlineState();

  // Black tries moving on White turn
  const errTurn = applyOnlineChessMove(state, 'b', { from: 'e7', to: 'e5' }, 1);
  assert.equal(errTurn.success, false);
  if (!errTurn.success) {
    assert.equal(errTurn.reason, 'out_of_turn');
  }

  // Illegal move (pawn e2 -> e5)
  const errIllegal = applyOnlineChessMove(state, 'w', { from: 'e2', to: 'e5' }, 1);
  assert.equal(errIllegal.success, false);
  if (!errIllegal.success) {
    assert.equal(errIllegal.reason, 'illegal_move');
  }

  // Legal move with seq 10
  const ok1 = applyOnlineChessMove(state, 'w', { from: 'e2', to: 'e4' }, 10);
  assert.equal(ok1.success, true);
  if (!ok1.success) return;
  state = ok1.nextState;

  // Stale seq 10
  const errSeq = applyOnlineChessMove(state, 'b', { from: 'e7', to: 'e5' }, 10);
  assert.equal(errSeq.success, false);
  if (!errSeq.success) {
    assert.equal(errSeq.reason, 'invalid_seq');
  }
});

test('Chess Online Engine: Rejects FEN mismatch when fenAfter is provided', () => {
  const state = createInitialChessOnlineState();
  const res = applyOnlineChessMove(
    state,
    'w',
    { from: 'e2', to: 'e4', fenAfter: 'tampered-fen' },
    1
  );
  assert.equal(res.success, false);
  if (!res.success) {
    assert.equal(res.reason, 'fen_mismatch');
  }
});

test('Chess Online Engine: Detects checkmate (Fool\'s mate)', () => {
  let state = createInitialChessOnlineState();

  // 1. f3 e5
  const m1 = applyOnlineChessMove(state, 'w', { from: 'f2', to: 'f3' }, 1);
  assert.equal(m1.success, true);
  if (!m1.success) return;
  state = m1.nextState;

  const m2 = applyOnlineChessMove(state, 'b', { from: 'e7', to: 'e5' }, 2);
  assert.equal(m2.success, true);
  if (!m2.success) return;
  state = m2.nextState;

  // 2. g4 Qh4#
  const m3 = applyOnlineChessMove(state, 'w', { from: 'g2', to: 'g4' }, 3);
  assert.equal(m3.success, true);
  if (!m3.success) return;
  state = m3.nextState;

  const m4 = applyOnlineChessMove(state, 'b', { from: 'd8', to: 'h4' }, 4);
  assert.equal(m4.success, true);
  if (!m4.success) return;
  state = m4.nextState;

  assert.equal(state.isOver, true);
  assert.equal(state.isCheckmate, true);
  assert.equal(state.winner, 'b');
});

test('Chess Online Engine: Pawn promotion', () => {
  // White pawn on a7 ready to promote to a8
  const promoFen = '8/P7/8/8/8/8/8/K6k w - - 0 1';
  let state = createInitialChessOnlineState(promoFen);

  const res = applyOnlineChessMove(state, 'w', { from: 'a7', to: 'a8', promotion: 'q' }, 1);
  assert.equal(res.success, true);
  if (!res.success) return;
  state = res.nextState;
  assert.match(state.fen, /Q/);
});

test('Chess Online Engine: Resignation and Draw agreement', () => {
  const state = createInitialChessOnlineState();

  // White resigns
  const resigned = applyResignation(state, 'w', 1);
  assert.equal(resigned.isOver, true);
  assert.equal(resigned.winner, 'b');

  // Draw agreed
  const drawn = applyDrawAgreement(state, 1);
  assert.equal(drawn.isOver, true);
  assert.equal(drawn.isDraw, true);
  assert.equal(drawn.winner, 'draw');
});
