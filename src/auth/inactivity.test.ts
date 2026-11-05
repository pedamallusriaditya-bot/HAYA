import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateInactivity,
  isMatchActive,
  recordUserActivity,
  setMatchActiveState,
  createFallbackProfile,
  INACTIVITY_TIMEOUT_MS,
  LAST_ACTIVITY_KEY,
  IN_MATCH_KEY,
} from './authUtils.ts';

test('Inactivity Manager: Normal 5-minute timeout countdown', () => {
  const start = 1_000_000;

  // 1. Just active (0ms idle)
  const immediate = evaluateInactivity(start, start, false);
  assert.equal(immediate.shouldLogout, false);
  assert.equal(immediate.isPaused, false);
  assert.equal(immediate.idleTimeMs, 0);
  assert.equal(immediate.remainingMs, INACTIVITY_TIMEOUT_MS);

  // 2. Active 2 minutes later (120,000ms idle)
  const twoMinutesLater = start + 2 * 60 * 1000;
  const twoMinCheck = evaluateInactivity(start, twoMinutesLater, false);
  assert.equal(twoMinCheck.shouldLogout, false);
  assert.equal(twoMinCheck.isPaused, false);
  assert.equal(twoMinCheck.idleTimeMs, 120_000);
  assert.equal(twoMinCheck.remainingMs, 180_000);

  // 3. Exactly 4 minutes 59 seconds (299,000ms idle)
  const justBeforeTimeout = start + 299_000;
  const beforeCheck = evaluateInactivity(start, justBeforeTimeout, false);
  assert.equal(beforeCheck.shouldLogout, false);
  assert.equal(beforeCheck.isPaused, false);
  assert.equal(beforeCheck.remainingMs, 1_000);

  // 4. Exactly 5 minutes (300,000ms idle) -> triggers auto logout
  const atTimeout = start + INACTIVITY_TIMEOUT_MS;
  const timeoutCheck = evaluateInactivity(start, atTimeout, false);
  assert.equal(timeoutCheck.shouldLogout, true);
  assert.equal(timeoutCheck.isPaused, false);
  assert.equal(timeoutCheck.remainingMs, 0);

  // 5. Exceeded timeout (e.g. 10 minutes idle) -> triggers auto logout
  const tenMinutesLater = start + 10 * 60 * 1000;
  const lateCheck = evaluateInactivity(start, tenMinutesLater, false);
  assert.equal(lateCheck.shouldLogout, true);
  assert.equal(lateCheck.isPaused, false);
});

test('Inactivity Manager: Paused during active game matches', () => {
  const start = 1_000_000;

  // 1. Playing a match for 10 minutes without direct input (e.g. waiting for opponent's slow move)
  const tenMinutesInMatch = start + 10 * 60 * 1000;
  const inMatchCheck = evaluateInactivity(start, tenMinutesInMatch, true);

  assert.equal(
    inMatchCheck.shouldLogout,
    false,
    'Player must NOT be logged out while a match is active'
  );
  assert.equal(
    inMatchCheck.isPaused,
    true,
    'Inactivity timer must be marked as paused during matches'
  );

  // 2. Playing a long chess match for 45 minutes
  const longMatchTime = start + 45 * 60 * 1000;
  const longMatchCheck = evaluateInactivity(start, longMatchTime, true);
  assert.equal(longMatchCheck.shouldLogout, false);
  assert.equal(longMatchCheck.isPaused, true);
});

test('Inactivity Manager: Route and match state detection', () => {
  // Routes under /play/ are active game machines
  assert.equal(isMatchActive('/play/carrom'), true);
  assert.equal(isMatchActive('/play/chess'), true);
  assert.equal(isMatchActive('/play/ludo?match=online_123'), true);
  assert.equal(isMatchActive('/play/tictactoe'), true);

  // Non-game routes are not matches
  assert.equal(isMatchActive('/'), false);
  assert.equal(isMatchActive('/scores'), false);
  assert.equal(isMatchActive('/avatar'), false);
  assert.equal(isMatchActive('/singleplayer'), false);

  // Explicit inMatch flag overrides route
  assert.equal(isMatchActive('/scores', true), true);
  assert.equal(isMatchActive(undefined, true), true);
});

test('Inactivity Manager: Restarts with fresh 5 minutes when match ends', () => {
  const storage = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => storage.set(k, v),
    removeItem: (k: string) => storage.delete(k),
  };

  const matchStartTime = 1_000_000;
  // Player enters match
  setMatchActiveState(true, mockStorage, matchStartTime);
  assert.equal(mockStorage.getItem(IN_MATCH_KEY), 'true');

  // Match lasts 15 minutes
  const matchEndTime = matchStartTime + 15 * 60 * 1000;

  // Match ends: player returns to arcade floor / dashboard
  setMatchActiveState(false, mockStorage, matchEndTime);
  assert.equal(mockStorage.getItem(IN_MATCH_KEY), null);
  assert.equal(mockStorage.getItem(LAST_ACTIVITY_KEY), String(matchEndTime));

  // 1 minute after match ended (60,000ms idle)
  const oneMinAfterMatch = matchEndTime + 60_000;
  const lastActivity = Number(mockStorage.getItem(LAST_ACTIVITY_KEY));
  const postMatchCheck = evaluateInactivity(lastActivity, oneMinAfterMatch, false);

  assert.equal(
    postMatchCheck.shouldLogout,
    false,
    'Player must have a fresh countdown after match ends'
  );
  assert.equal(
    postMatchCheck.idleTimeMs,
    60_000,
    'Idle time must be calculated from match end timestamp'
  );
  assert.equal(
    postMatchCheck.remainingMs,
    240_000,
    'Player must have 4 minutes remaining of their fresh 5 minutes'
  );

  // Full 5 minutes after match ended without further input -> then logout triggers
  const fiveMinAfterMatch = matchEndTime + INACTIVITY_TIMEOUT_MS;
  const postMatchTimeout = evaluateInactivity(lastActivity, fiveMinAfterMatch, false);
  assert.equal(postMatchTimeout.shouldLogout, true);
});

test('Inactivity Manager: User activity recording updates timestamp', () => {
  const storage = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => storage.set(k, v),
  };

  const t1 = 5_000_000;
  recordUserActivity(mockStorage, t1);
  assert.equal(mockStorage.getItem(LAST_ACTIVITY_KEY), String(t1));

  const t2 = 5_030_000; // Pointer/wheel event 30 seconds later
  recordUserActivity(mockStorage, t2);
  assert.equal(mockStorage.getItem(LAST_ACTIVITY_KEY), String(t2));
});

test('Fallback Profile Security: Never grants is_admin on profile creation or load fallback', () => {
  const p1 = createFallbackProfile('00000000-0000-0000-0000-000000000001', 'player1@haya.local');
  assert.equal(p1.is_admin, false, 'Fallback profile must have is_admin: false');

  const p2 = createFallbackProfile('00000000-0000-0000-0000-000000000002', 'player2@haya.local');
  assert.equal(p2.is_admin, false, 'Fallback profile for second player must have is_admin: false');
});

