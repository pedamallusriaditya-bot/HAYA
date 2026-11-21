import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldStartHostMatch,
  createHostMatch,
  createGuestMatch,
  isValidIncomingInvite,
} from './multiplayerHelpers.ts';

describe('Multiplayer Helpers', () => {
  describe('shouldStartHostMatch', () => {
    it('returns true when there is no current active match', () => {
      assert.equal(shouldStartHostMatch(null, 'match_123'), true);
      assert.equal(shouldStartHostMatch(undefined, 'match_123'), true);
    });

    it('returns true when current match has a different matchId', () => {
      assert.equal(shouldStartHostMatch('match_old', 'match_new'), true);
    });

    it('returns false when incoming matchId is identical (idempotent guard)', () => {
      assert.equal(shouldStartHostMatch('match_123', 'match_123'), false);
    });

    it('returns false for empty or falsy matchId', () => {
      assert.equal(shouldStartHostMatch('match_123', ''), false);
      assert.equal(shouldStartHostMatch(null, ''), false);
    });
  });

  describe('createHostMatch', () => {
    it('creates active match descriptor with host role', () => {
      const match = createHostMatch('match_abc', 'tictactoe', 'Harika');
      assert.deepEqual(match, {
        matchId: 'match_abc',
        gameId: 'tictactoe',
        role: 'host',
        opponentName: 'Harika',
      });
    });

    it('falls back to Friend if opponentName is empty', () => {
      const match = createHostMatch('match_xyz', 'ludo', '');
      assert.equal(match.opponentName, 'Friend');
    });
  });

  describe('createGuestMatch', () => {
    it('creates active match descriptor with guest role', () => {
      const match = createGuestMatch('match_guest_1', 'chess', 'Aditya');
      assert.deepEqual(match, {
        matchId: 'match_guest_1',
        gameId: 'chess',
        role: 'guest',
        opponentName: 'Aditya',
      });
    });

    it('falls back to Friend if opponentName is empty', () => {
      const match = createGuestMatch('match_guest_2', 'connect4', '');
      assert.equal(match.opponentName, 'Friend');
    });
  });

  describe('isValidIncomingInvite', () => {
    it('returns true when email matches and timestamp is unexpired', () => {
      const now = 10000;
      assert.equal(isValidIncomingInvite('player2@test.com', 'player2@test.com', 20000, now), true);
    });

    it('handles case-insensitive and whitespace-padded emails', () => {
      const now = 10000;
      assert.equal(isValidIncomingInvite('  PLAYER2@Test.Com ', 'player2@test.com', 20000, now), true);
    });

    it('returns false when email does not match', () => {
      const now = 10000;
      assert.equal(isValidIncomingInvite('someoneelse@test.com', 'player2@test.com', 20000, now), false);
    });

    it('returns false when invitation has expired', () => {
      const now = 25000;
      assert.equal(isValidIncomingInvite('player2@test.com', 'player2@test.com', 20000, now), false);
    });
  });
});
