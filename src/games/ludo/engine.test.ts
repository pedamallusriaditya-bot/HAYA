import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialTokens,
  createOnlineMatchPlayers,
  applyRemoteMove,
  getNextTurnColor,
  COLOR_START_OFFSETS,
  type PlayerState,
} from './engine.ts';

test('createOnlineMatchPlayers: Creates fresh 2-player state with correct starting turn', () => {
  // Case 1: Player 1 is red, Player 2 is green -> Red starts
  const match1 = createOnlineMatchPlayers('red', 'green', 'Harika');
  assert.equal(match1.players.length, 2);
  assert.equal(match1.players[0].color, 'red');
  assert.equal(match1.players[0].tokens.length, 4);
  assert.equal(match1.players[0].tokens.every((t) => t.step === -1), true);
  assert.equal(match1.players[0].startTrackIndex, COLOR_START_OFFSETS.red);
  assert.equal(match1.players[1].color, 'green');
  assert.equal(match1.players[1].name, 'Harika (GREEN)');
  assert.equal(match1.startingTurn, 'red');

  // Case 2: Player 1 is yellow, Player 2 is red -> Red starts
  const match2 = createOnlineMatchPlayers('yellow', 'red', 'Aditya');
  assert.equal(match2.startingTurn, 'red');

  // Case 3: Neither player is red -> Player 1 starts
  const match3 = createOnlineMatchPlayers('yellow', 'blue', 'Friend');
  assert.equal(match3.startingTurn, 'yellow');
});

test('getNextTurnColor: Rotates turn order deterministically', () => {
  const { players } = createOnlineMatchPlayers('red', 'green');

  assert.equal(getNextTurnColor('red', players), 'green');
  assert.equal(getNextTurnColor('green', players), 'red');

  const fourPlayers: PlayerState[] = [
    { color: 'red', name: 'P1', isBot: false, tokens: createInitialTokens(), startTrackIndex: 0 },
    { color: 'green', name: 'P2', isBot: false, tokens: createInitialTokens(), startTrackIndex: 26 },
    { color: 'yellow', name: 'P3', isBot: false, tokens: createInitialTokens(), startTrackIndex: 13 },
    { color: 'blue', name: 'P4', isBot: false, tokens: createInitialTokens(), startTrackIndex: 39 },
  ];

  assert.equal(getNextTurnColor('red', fourPlayers), 'green');
  assert.equal(getNextTurnColor('green', fourPlayers), 'yellow');
  assert.equal(getNextTurnColor('yellow', fourPlayers), 'blue');
  assert.equal(getNextTurnColor('blue', fourPlayers), 'red');
});

test('applyRemoteMove: Advances token step on common track', () => {
  const { players } = createOnlineMatchPlayers('red', 'green');
  // Put red token 0 onto step 0 (already out of yard)
  players[0].tokens[0].step = 0;

  const { nextPlayers, isWinningMove, winner, moveResult } = applyRemoteMove(
    players,
    'red',
    0,
    4
  );

  assert.equal(isWinningMove, false);
  assert.equal(winner, null);
  assert.equal(nextPlayers[0].tokens[0].step, 4);
  assert.equal(moveResult.givesExtraTurn, false);
  assert.equal(moveResult.capturedOpponentTokenId, null);
});

test('applyRemoteMove: Releasing token from yard with roll of 6 awards extra turn', () => {
  const { players } = createOnlineMatchPlayers('red', 'green');
  assert.equal(players[1].tokens[0].step, -1);

  const { nextPlayers, moveResult } = applyRemoteMove(players, 'green', 0, 6);

  assert.equal(nextPlayers[1].tokens[0].step, 0);
  assert.equal(moveResult.givesExtraTurn, true);
});

test('applyRemoteMove: Captures opponent token and returns it to yard', () => {
  const { players } = createOnlineMatchPlayers('red', 'green');
  // Red start offset is 0, Green start offset is 26.
  // If green token is on track index 4 (relative step in green coordinates):
  // green global track coordinate = (26 + step) % 52.
  // For global index 4: (26 + step) % 52 = 4 -> step = 30.
  players[0].tokens[0].step = 0; // Red global track coord = 0
  players[1].tokens[0].step = 30; // Green global track coord = (26 + 30) % 52 = 4 (not safe: safe are 0, 8, 13, 21, 26, 34, 39, 47)

  // Red rolls 4: lands on track index 4
  const { nextPlayers, moveResult } = applyRemoteMove(players, 'red', 0, 4);

  assert.equal(nextPlayers[0].tokens[0].step, 4);
  assert.equal(nextPlayers[1].tokens[0].step, -1); // Green captured, sent back to yard!
  assert.equal(moveResult.capturedOpponentColor, 'green');
  assert.equal(moveResult.capturedOpponentTokenId, 0);
  assert.equal(moveResult.givesExtraTurn, true); // Capture gives extra turn
});

test('applyRemoteMove: Safe square protects opponent token from capture', () => {
  const { players } = createOnlineMatchPlayers('red', 'green');
  // Safe square at global index 8 (SAFE_TRACK_INDICES includes 8)
  // Red token at step 5 rolls 3 -> lands on step 8 (track index 8)
  players[0].tokens[0].step = 5;
  // Green token also on global index 8: (26 + 34) % 52 = 8 -> step = 34
  players[1].tokens[0].step = 34;

  const { nextPlayers, moveResult } = applyRemoteMove(players, 'red', 0, 3);

  assert.equal(nextPlayers[0].tokens[0].step, 8);
  assert.equal(nextPlayers[1].tokens[0].step, 34); // NOT captured!
  assert.equal(moveResult.capturedOpponentTokenId, null);
});

test('applyRemoteMove: Detects victory when last token reaches goal step 56', () => {
  const { players } = createOnlineMatchPlayers('red', 'green');
  // 3 tokens already home, 1 token at step 54
  players[1].tokens[0].step = 56;
  players[1].tokens[1].step = 56;
  players[1].tokens[2].step = 56;
  players[1].tokens[3].step = 54;

  const { nextPlayers, isWinningMove, winner } = applyRemoteMove(
    players,
    'green',
    3,
    2
  );

  assert.equal(isWinningMove, true);
  assert.notEqual(winner, null);
  assert.equal(winner?.color, 'green');
  assert.equal(nextPlayers[1].tokens[3].step, 56);
  assert.equal(nextPlayers[1].tokens.every((t) => t.step === 56), true);
});

test('applyRemoteMove: Unknown color returns players unchanged', () => {
  const { players } = createOnlineMatchPlayers('red', 'green');
  const { nextPlayers, isWinningMove } = applyRemoteMove(players, 'yellow', 0, 4);
  assert.equal(isWinningMove, false);
  assert.deepEqual(nextPlayers, players);
});

test('Stale Closure Demonstration: Ref pattern vs stale closure on match restart', () => {
  // Simulate React's per-render state snapshots:
  // Render 1: mount render where colors are initially null
  const render1 = {
    onlineMyColor: null as 'red' | null,
    onlineOpponentColor: null as 'green' | null,
  };

  // Stale callback: created during Render 1 and NOT recreated when state changes
  const staleRestartHandler = () => {
    const { onlineMyColor, onlineOpponentColor } = render1;
    if (onlineMyColor && onlineOpponentColor) {
      return createOnlineMatchPlayers(onlineMyColor, onlineOpponentColor);
    }
    return null; // Fails because it's stuck on Render 1's null values!
  };

  // Ref container (persists across renders and holds the latest value)
  const myColorRef: { current: 'red' | null } = { current: render1.onlineMyColor };
  const oppColorRef: { current: 'green' | null } = { current: render1.onlineOpponentColor };

  // Ref-based callback: created during Render 1, reads from ref.current
  const refBasedRestartHandler = () => {
    if (myColorRef.current && oppColorRef.current) {
      return createOnlineMatchPlayers(myColorRef.current, oppColorRef.current);
    }
    return null;
  };

  // 1. Initially both return null before colors are chosen
  assert.equal(staleRestartHandler(), null);
  assert.equal(refBasedRestartHandler(), null);

  // 2. Render 2: color reservation completes, component re-renders with new colors:
  const render2 = {
    onlineMyColor: 'red' as const,
    onlineOpponentColor: 'green' as const,
  };
  // In the component body, refs are updated on each render:
  myColorRef.current = render2.onlineMyColor;
  oppColorRef.current = render2.onlineOpponentColor;

  // 3. Stale closure bug: staleRestartHandler STILL sees Render 1's nulls and silently does nothing
  assert.equal(
    staleRestartHandler(),
    null,
    'Stale closure silently does nothing when ludo_restart is received'
  );

  // 4. Ref-based handler: reads from ref and successfully starts rematch with latest colors
  const restarted = refBasedRestartHandler();
  assert.notEqual(restarted, null, 'Ref-based handler successfully restarts the match');
  assert.equal(restarted?.players.length, 2);
  assert.equal(restarted?.startingTurn, 'red');
});

