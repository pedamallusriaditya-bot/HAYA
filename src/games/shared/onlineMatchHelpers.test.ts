import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getMatchChannelTopic,
  isNewerSeq,
  hasSeqGap,
  shouldAdoptStateSnapshot,
} from './onlineMatchHelpers.ts';

test('getMatchChannelTopic: Conforms strictly to haya-match-${matchId}', () => {
  assert.equal(getMatchChannelTopic('123'), 'haya-match-123');
  assert.equal(getMatchChannelTopic('tictactoe_456'), 'haya-match-tictactoe_456');
  assert.match(getMatchChannelTopic('abc'), /^haya-match-/);
});

test('isNewerSeq: Enforces strictly increasing sequence order', () => {
  const current = 10;
  assert.equal(isNewerSeq(current, 11), true);
  assert.equal(isNewerSeq(current, 20), true);
  assert.equal(isNewerSeq(current, 10), false, 'Duplicate sequence must be rejected');
  assert.equal(isNewerSeq(current, 9), false, 'Stale sequence must be rejected');
  assert.equal(isNewerSeq(current, 0), false, 'Reset sequence must be rejected');
});

test('hasSeqGap: Detects gaps requiring full state resync', () => {
  const current = 5;
  assert.equal(hasSeqGap(current, 6), false, 'In-order message has no gap');
  assert.equal(hasSeqGap(current, 7), true, 'Skipping seq 6 is a gap');
  assert.equal(hasSeqGap(current, 10), true, 'Skipping multiple seqs is a gap');
  assert.equal(hasSeqGap(current, 5), false, 'Duplicate is not a gap');
});

test('shouldAdoptStateSnapshot: Accepts newer snapshots and rejects stale or equal snapshots', () => {
  const current = 15;
  assert.equal(shouldAdoptStateSnapshot(current, 16), true, 'Newer snapshot accepted');
  assert.equal(shouldAdoptStateSnapshot(current, 15), false, 'Identical sequence snapshot rejected to prevent rollbacks');
  assert.equal(shouldAdoptStateSnapshot(current, 14), false, 'Stale snapshot rejected');

  // Unstarted client adopts initial snapshot
  assert.equal(shouldAdoptStateSnapshot(0, 0), true, 'Initial snapshot accepted on unstarted client');
  assert.equal(shouldAdoptStateSnapshot(0, 5), true, 'Catch-up snapshot accepted on unstarted client');
});
