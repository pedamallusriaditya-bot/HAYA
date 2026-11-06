import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateInactivity,
  isMatchActive,
  recordUserActivity,
  setMatchActiveState,
  clearMatchActiveState,
  createFallbackProfile,
  INACTIVITY_TIMEOUT_MS,
  MAX_MATCH_DURATION_MS,
  LAST_ACTIVITY_KEY,
  IN_MATCH_KEY,
  IN_MATCH_TIME_KEY,
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

test('Inactivity Manager: Online match vs solo and bot game route detection', () => {
  // Solo and bot game routes must NOT return true - only online matches pause inactivity
  assert.equal(isMatchActive('/play/carrom'), false);
  assert.equal(isMatchActive('/play/chess'), false);
  assert.equal(isMatchActive('/play/2048'), false);
  assert.equal(isMatchActive('/play/sudoku'), false);
  assert.equal(isMatchActive('/play/tictactoe'), false);
  assert.equal(isMatchActive('/play/connect4'), false);
  assert.equal(isMatchActive('/play/ludo'), false);
  assert.equal(isMatchActive('/play/snakes'), false);

  // Non-game routes are also not matches
  assert.equal(isMatchActive('/'), false);
  assert.equal(isMatchActive('/scores'), false);
  assert.equal(isMatchActive('/avatar'), false);
  assert.equal(isMatchActive('/singleplayer'), false);

  // Active match object (e.g. from MultiplayerContext activeMatch) returns true
  assert.equal(
    isMatchActive({ matchId: 'match_123', gameId: 'chess', role: 'host', opponentName: 'Player2' }),
    true
  );

  // Explicit inMatch boolean flag returns true
  assert.equal(isMatchActive('/scores', true), true);
  assert.equal(isMatchActive(undefined, true), true);
  assert.equal(isMatchActive(true), true);
  assert.equal(isMatchActive(false), false);
  assert.equal(isMatchActive(null), false);
});

test('Inactivity Manager: Solo and bot games time out after 5 minutes', () => {
  const start = 1_000_000;
  // A solo 2048 or chess bot player is on a /play/ route
  const isMatch = isMatchActive('/play/2048');
  assert.equal(isMatch, false, 'Solo game route must not be treated as an active match');

  // 4 minutes without input: still active
  const fourMin = evaluateInactivity(start, start + 4 * 60 * 1000, isMatch);
  assert.equal(fourMin.shouldLogout, false);
  assert.equal(fourMin.isPaused, false);
  assert.equal(fourMin.remainingMs, 60_000);

  // 5 minutes without input: auto-logout triggers
  const fiveMin = evaluateInactivity(start, start + INACTIVITY_TIMEOUT_MS, isMatch);
  assert.equal(fiveMin.shouldLogout, true);
  assert.equal(fiveMin.isPaused, false);
  assert.equal(fiveMin.remainingMs, 0);
});

test('Inactivity Manager: Capped at 2 hours without activity (stale match auto-logout)', () => {
  const start = 1_000_000;

  // Active online match within 2 hours: timer is paused
  const match10Min = evaluateInactivity(start, start + 10 * 60 * 1000, true);
  assert.equal(match10Min.shouldLogout, false);
  assert.equal(match10Min.isPaused, true);

  const match1Hour = evaluateInactivity(start, start + 60 * 60 * 1000, true);
  assert.equal(match1Hour.shouldLogout, false);
  assert.equal(match1Hour.isPaused, true);

  const matchJustBefore2Hours = evaluateInactivity(start, start + MAX_MATCH_DURATION_MS - 1000, true);
  assert.equal(matchJustBefore2Hours.shouldLogout, false);
  assert.equal(matchJustBefore2Hours.isPaused, true);

  // Over 2 hours without activity: treated as stale, auto-logout triggers
  const matchAt2Hours = evaluateInactivity(start, start + MAX_MATCH_DURATION_MS, true);
  assert.equal(matchAt2Hours.shouldLogout, true, 'Match inactive for >= 2 hours must trigger logout');
  assert.equal(matchAt2Hours.isPaused, false);
  assert.equal(matchAt2Hours.remainingMs, 0);

  const matchPast2Hours = evaluateInactivity(start, start + MAX_MATCH_DURATION_MS + 60_000, true);
  assert.equal(matchPast2Hours.shouldLogout, true);
  assert.equal(matchPast2Hours.isPaused, false);
});

test('Inactivity Manager: isMatchActive treats flag set > 2 hours without activity as stale', () => {
  const storage = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => storage.set(k, v),
    removeItem: (k: string) => storage.delete(k),
  };

  const startTime = 10_000_000;
  setMatchActiveState(true, mockStorage, startTime);
  recordUserActivity(mockStorage, startTime);
  assert.equal(mockStorage.getItem(IN_MATCH_KEY), 'true');

  // After 30 minutes: match is still active
  const check30Min = isMatchActive(null, mockStorage, startTime + 30 * 60 * 1000, startTime);
  assert.equal(check30Min, true);
  assert.equal(mockStorage.getItem(IN_MATCH_KEY), 'true');

  // After 2 hours + 10 seconds without activity: stale! Returns false and clears storage flag
  const staleTime = startTime + MAX_MATCH_DURATION_MS + 10_000;
  const checkStale = isMatchActive(null, mockStorage, staleTime, startTime);
  assert.equal(checkStale, false, 'isMatchActive must return false when flag is stale (> 2 hours without activity)');
  assert.equal(mockStorage.getItem(IN_MATCH_KEY), null, 'Stale flag must be cleared from storage');
  assert.equal(mockStorage.getItem(IN_MATCH_TIME_KEY), null);
});

test('Inactivity Manager: Clears haya_in_match on app startup and logout', () => {
  const storage = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => storage.set(k, v),
    removeItem: (k: string) => storage.delete(k),
  };

  // Simulate stale flag left from a previously interrupted match
  mockStorage.setItem(IN_MATCH_KEY, 'true');
  mockStorage.setItem(IN_MATCH_TIME_KEY, '1000000');
  assert.equal(mockStorage.getItem(IN_MATCH_KEY), 'true');

  // App startup clears haya_in_match
  clearMatchActiveState(mockStorage);
  assert.equal(mockStorage.getItem(IN_MATCH_KEY), null);
  assert.equal(mockStorage.getItem(IN_MATCH_TIME_KEY), null);

  // Player enters a match
  setMatchActiveState(true, mockStorage, 2_000_000);
  assert.equal(mockStorage.getItem(IN_MATCH_KEY), 'true');

  // Player logs out: clears haya_in_match
  clearMatchActiveState(mockStorage);
  assert.equal(mockStorage.getItem(IN_MATCH_KEY), null);
  assert.equal(mockStorage.getItem(IN_MATCH_TIME_KEY), null);
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

