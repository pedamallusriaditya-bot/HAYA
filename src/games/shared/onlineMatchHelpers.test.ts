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

test('shouldAdoptStateSnapshot: Accepts newer or equal snapshots and rejects stale snapshots', () => {
  const current = 15;
  assert.equal(shouldAdoptStateSnapshot(current, 16), true, 'Newer snapshot accepted');
  assert.equal(shouldAdoptStateSnapshot(current, 15), true, 'Identical sequence snapshot accepted (reconnect/refresh)');
  assert.equal(shouldAdoptStateSnapshot(current, 14), false, 'Stale snapshot rejected');
});
