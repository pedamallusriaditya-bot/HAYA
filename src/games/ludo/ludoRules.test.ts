import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialTokens,
  getLegalMoves,
  getTrackCoordinate,
  isTokenSafe,
  applyRemoteMove,
  SAFE_TRACK_INDICES,
  COLOR_START_OFFSETS,
  type PlayerState,
} from './engine.ts';
import { getLudoBotMove } from './ai.ts';

test('Ludo Engine: Track coordinates and safe square resolution', () => {
  // Red starts at 0, Yellow at 13, Green at 26, Blue at 39
  assert.equal(getTrackCoordinate('red', 0), 0);
  assert.equal(getTrackCoordinate('red', 10), 10);
  assert.equal(getTrackCoordinate('red', 50), 50);
  assert.equal(getTrackCoordinate('red', -1), null); // Yard
  assert.equal(getTrackCoordinate('red', 51), null); // Home stretch

  assert.equal(getTrackCoordinate('yellow', 0), 13);
  assert.equal(getTrackCoordinate('yellow', 40), 1); // (13 + 40) % 52 = 1

  // Safe squares: 0, 8, 13, 21, 26, 34, 39, 47
  for (const safeIdx of SAFE_TRACK_INDICES) {
    // Red token landing on safeIdx: step = safeIdx
    assert.equal(isTokenSafe('red', safeIdx), true);
  }
  // Step 1 on red track = track index 1 (not safe)
  assert.equal(isTokenSafe('red', 1), false);
  // Yard is always safe
  assert.equal(isTokenSafe('red', -1), true);
  // Home stretch (51-55) and Goal (56) are always safe
  assert.equal(isTokenSafe('red', 51), true);
  assert.equal(isTokenSafe('red', 55), true);
  assert.equal(isTokenSafe('red', 56), true);
});

test('Ludo Engine: Legal moves calculation for yard, track, and home stretch', () => {
  const player: PlayerState = {
    color: 'red',
    name: 'Player',
    isBot: false,
    tokens: [
      { id: 0, step: -1 }, // In yard
      { id: 1, step: 0 },  // On track start
      { id: 2, step: 54 }, // In home stretch, 2 steps from goal
      { id: 3, step: 56 }, // Already in goal
    ],
    startTrackIndex: COLOR_START_OFFSETS.red,
  };

  // Roll of 1:
  // - token 0 in yard: cannot move (requires 6)
  // - token 1 at 0: can move to 1
  // - token 2 at 54: can move to 55
  // - token 3 at 56: already finished
  const movesRoll1 = getLegalMoves(player, 1);
  assert.deepEqual(movesRoll1, [1, 2]);

  // Roll of 2:
  // - token 0 in yard: cannot move
  // - token 1 at 0: can move to 2
  // - token 2 at 54: exactly reaches 56 (goal)
  // - token 3 at 56: cannot move
  const movesRoll2 = getLegalMoves(player, 2);
  assert.deepEqual(movesRoll2, [1, 2]);

  // Roll of 3:
  // - token 0: cannot move
  // - token 1: can move to 3
  // - token 2 at 54: overshoots 56 (54+3 = 57 > 56), so ILLEGAL
  // - token 3: cannot move
  const movesRoll3 = getLegalMoves(player, 3);
  assert.deepEqual(movesRoll3, [1]);

  // Roll of 6:
  // - token 0 in yard: CAN move out of yard
  // - token 1 at 0: can move to 6
  // - token 2 at 54: overshoots (illegal)
  // - token 3: cannot move
  const movesRoll6 = getLegalMoves(player, 6);
  assert.deepEqual(movesRoll6, [0, 1]);
});

test('Ludo Engine: Extra turn awarded when reaching goal', () => {
  const player1: PlayerState = {
    color: 'red',
    name: 'P1',
    isBot: false,
    tokens: [
      { id: 0, step: 55 },
      { id: 1, step: -1 },
      { id: 2, step: -1 },
      { id: 3, step: -1 },
    ],
    startTrackIndex: 0,
  };
  const player2: PlayerState = {
    color: 'green',
    name: 'P2',
    isBot: false,
    tokens: createInitialTokens(),
    startTrackIndex: 26,
  };

  const { nextPlayers, moveResult } = applyRemoteMove([player1, player2], 'red', 0, 1);
  assert.equal(nextPlayers[0].tokens[0].step, 56);
  assert.equal(moveResult.givesExtraTurn, true, 'Reaching goal must award an extra turn');
});

test('Ludo AI: Bot choice sanity and tactical decision making', async () => {
  const botPlayer: PlayerState = {
    color: 'red',
    name: 'Bot',
    isBot: true,
    tokens: [
      { id: 0, step: -1 }, // In yard
      { id: 1, step: 10 }, // On track
      { id: 2, step: -1 },
      { id: 3, step: -1 },
    ],
    startTrackIndex: 0,
  };

  const opponent: PlayerState = {
    color: 'green',
    name: 'Human',
    isBot: false,
    tokens: [
      { id: 0, step: 14 }, // Green step 14 -> global track index (26 + 14) % 52 = 40 (not safe)
      { id: 1, step: -1 },
      { id: 2, step: -1 },
      { id: 3, step: -1 },
    ],
    startTrackIndex: 26,
  };

  // 1. If no legal moves, returns -1
  const noMove = await getLudoBotMove(botPlayer, opponent, [], 3, 3);
  assert.equal(noMove, -1);

  // 2. If exactly one legal move, returns it immediately
  const singleMove = await getLudoBotMove(botPlayer, opponent, [1], 2, 3);
  assert.equal(singleMove, 1);

  // 3. Level 2 (Easy): Prefers leaving yard on roll 6 over moving existing piece
  const easyMove = await getLudoBotMove(botPlayer, opponent, [0, 1], 6, 2);
  assert.equal(easyMove, 0, 'Easy bot should prioritize releasing piece from yard on roll 6');

  // 4. Level 3 (Normal): Prefers capturing opponent piece
  // Red token 1 is at step 38. Red rolls 2 -> lands on step 40 (global track index 40).
  // Opponent green token 0 is at global track index 40 (unsafe).
  botPlayer.tokens[1].step = 38;
  const botWithCapture: PlayerState = {
    ...botPlayer,
    tokens: [
      { id: 0, step: 4 },  // Can advance from 4 to 6
      { id: 1, step: 38 }, // Can capture green at 40!
      { id: 2, step: -1 },
      { id: 3, step: -1 },
    ],
  };

  const tacticalMove = await getLudoBotMove(botWithCapture, opponent, [0, 1], 2, 3);
  assert.equal(tacticalMove, 1, 'Normal bot should prioritize capturing opponent piece');

  // 5. Returned move is always guaranteed to be one of legalTokenIds
  const legalList = [0, 1];
  const chosen = await getLudoBotMove(botWithCapture, opponent, legalList, 2, 1);
  assert.ok(legalList.includes(chosen));
});
