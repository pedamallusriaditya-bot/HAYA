import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialOnlineState,
  applyOnlineRoll,
} from './onlineEngine.ts';

test('Snakes Online Engine: Initial state', () => {
  const s0 = createInitialOnlineState(0);
  assert.deepEqual(s0.positions, [0, 0]);
  assert.equal(s0.currentTurn, 0);
  assert.equal(s0.lastAppliedSeq, 0);
  assert.equal(s0.winner, null);

  const s1 = createInitialOnlineState(1);
  assert.equal(s1.currentTurn, 1);
});

test('Snakes Online Engine: Alternates turns on non-6 rolls', () => {
  let state = createInitialOnlineState(0);

  // Player 0 rolls 3 (moves to 3)
  const r1 = applyOnlineRoll(state, 0, 3, 1);
  assert.equal(r1.success, true);
  if (!r1.success) return;
  state = r1.nextState;
  assert.deepEqual(state.positions, [3, 0]);
  assert.equal(state.currentTurn, 1);
  assert.equal(state.lastAppliedSeq, 1);

  // Player 1 rolls 5 (moves to 5)
  const r2 = applyOnlineRoll(state, 1, 5, 2);
  assert.equal(r2.success, true);
  if (!r2.success) return;
  state = r2.nextState;
  assert.deepEqual(state.positions, [3, 5]);
  assert.equal(state.currentTurn, 0);
  assert.equal(state.lastAppliedSeq, 2);
});

test('Snakes Online Engine: Awards extra turn on rolling 6', () => {
  let state = createInitialOnlineState(0);

  // Player 0 rolls 6
  const r1 = applyOnlineRoll(state, 0, 6, 1);
  assert.equal(r1.success, true);
  if (!r1.success) return;
  state = r1.nextState;
  assert.deepEqual(state.positions, [6, 0]);
  assert.equal(state.currentTurn, 0, 'Turn should remain with Player 0 after rolling 6');
  assert.equal(r1.moveRes.givesExtraTurn, true);

  // Player 0 rolls again (2) -> moves to 8
  const r2 = applyOnlineRoll(state, 0, 2, 2);
  assert.equal(r2.success, true);
  if (!r2.success) return;
  state = r2.nextState;
  assert.deepEqual(state.positions, [8, 0]);
  assert.equal(state.currentTurn, 1, 'Turn transfers to Player 1 after non-6 roll');
});

test('Snakes Online Engine: Rejects out-of-turn and duplicate/lower seq', () => {
  let state = createInitialOnlineState(0);

  // Player 1 tries to roll when it is Player 0 turn
  const errTurn = applyOnlineRoll(state, 1, 4, 1);
  assert.equal(errTurn.success, false);
  if (!errTurn.success) {
    assert.equal(errTurn.reason, 'out_of_turn');
  }

  // Player 0 rolls with seq 5
  const ok1 = applyOnlineRoll(state, 0, 2, 5);
  assert.equal(ok1.success, true);
  if (!ok1.success) return;
  state = ok1.nextState;

  // Stale or duplicate seq
  const errSeq = applyOnlineRoll(state, 1, 3, 5);
  assert.equal(errSeq.success, false);
  if (!errSeq.success) {
    assert.equal(errSeq.reason, 'invalid_seq');
  }
});

test('Snakes Online Engine: Rejects invalid dice values', () => {
  const state = createInitialOnlineState(0);
  const err1 = applyOnlineRoll(state, 0, 0, 1);
  assert.equal(err1.success, false);
  const err2 = applyOnlineRoll(state, 0, 7, 1);
  assert.equal(err2.success, false);
  const err3 = applyOnlineRoll(state, 0, 3.5, 1);
  assert.equal(err3.success, false);
});

test('Snakes Online Engine: Climbs ladder and slides down snake', () => {
  // Ladder at 4 -> 14
  let state = createInitialOnlineState(0);
  const rLadder = applyOnlineRoll(state, 0, 4, 1);
  assert.equal(rLadder.success, true);
  if (!rLadder.success) return;
  state = rLadder.nextState;
  assert.equal(state.positions[0], 14, 'Should climb ladder to 14');
  assert.equal(state.lastJump?.type, 'ladder');

  // Snake at 17 -> 7
  // Force position near 17
  state.positions[1] = 15;
  state.currentTurn = 1;
  const rSnake = applyOnlineRoll(state, 1, 2, 2); // 15 + 2 = 17 -> snake to 7
  assert.equal(rSnake.success, true);
  if (!rSnake.success) return;
  state = rSnake.nextState;
  assert.equal(state.positions[1], 7, 'Should slide down snake to 7');
  assert.equal(state.lastJump?.type, 'snake');
});

test('Snakes Online Engine: Reaching square 100 awards win and blocks further rolls', () => {
  let state = createInitialOnlineState(0);
  state.positions[0] = 96;

  // Roll 4 to reach exactly 100
  const rWin = applyOnlineRoll(state, 0, 4, 1);
  assert.equal(rWin.success, true);
  if (!rWin.success) return;
  state = rWin.nextState;
  assert.equal(state.positions[0], 100);
  assert.equal(state.winner, 0);

  // Further moves are blocked
  const rPost = applyOnlineRoll(state, 1, 3, 2);
  assert.equal(rPost.success, false);
  if (!rPost.success) {
    assert.equal(rPost.reason, 'game_over');
  }
});
