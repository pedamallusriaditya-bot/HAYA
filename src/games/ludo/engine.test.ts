import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialTokens,
  createOnlineMatchPlayers,
  applyRemoteMove,
  getNextTurnColor,
  COLOR_START_OFFSETS,
  evaluateRoll,
  isValidNextSeq,
  isSeqGap,
  shouldAdoptSnapshot,
  executeMove,
  createLudoSnapshot,
  type PlayerState,
  type LudoColor,
  type LudoRollMessage,
  type LudoTurnMessage,
  type LudoMoveMessage,
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

test('evaluateRoll: Evaluates legal moves and authoritative no-moves turn advancement', () => {
  const { players } = createOnlineMatchPlayers('red', 'green');

  // Case 1: All red tokens in yard, roll is 3 (not 6) -> no legal moves, noMoves: true, nextTurn: green
  const noMovesYard = evaluateRoll(players, 'red', 3);
  assert.equal(noMovesYard.legalMoves.length, 0);
  assert.equal(noMovesYard.noMoves, true);
  assert.equal(noMovesYard.nextTurn, 'green');

  // Case 2: All red tokens in yard, roll is 6 -> all 4 can leave yard, noMoves: false
  const canRelease = evaluateRoll(players, 'red', 6);
  assert.equal(canRelease.legalMoves.length, 4);
  assert.equal(canRelease.noMoves, false);

  // Case 3: Token near goal at step 54, roll is 3 (54 + 3 = 57 > 56) -> no moves possible
  players[0].tokens[0].step = 54;
  players[0].tokens[1].step = 56;
  players[0].tokens[2].step = 56;
  players[0].tokens[3].step = 56;

  const overshoot = evaluateRoll(players, 'red', 3);
  assert.equal(overshoot.legalMoves.length, 0);
  assert.equal(overshoot.noMoves, true);
  assert.equal(overshoot.nextTurn, 'green');

  // Case 4: Token at step 54 rolls exact 2 (54 + 2 = 56) -> 1 legal move
  const exact = evaluateRoll(players, 'red', 2);
  assert.equal(exact.legalMoves.length, 1);
  assert.equal(exact.legalMoves[0], 0);
  assert.equal(exact.noMoves, false);
});

test('executeMove: Awards extra turn on 6, capture, and reaching home', () => {
  const { players } = createOnlineMatchPlayers('red', 'green');

  // 1. Roll of 6 awards extra turn
  const p1 = { ...players[0], tokens: [{ id: 0, step: -1 }, { id: 1, step: -1 }, { id: 2, step: -1 }, { id: 3, step: -1 }] };
  const resRoll6 = executeMove(p1, players[1], 0, 6);
  assert.equal(resRoll6.givesExtraTurn, true, 'Roll of 6 awards extra turn');
  assert.equal(p1.tokens[0].step, 0);

  // 2. Normal move (e.g. roll 3) does NOT award extra turn
  const resRoll3 = executeMove(p1, players[1], 0, 3);
  assert.equal(resRoll3.givesExtraTurn, false, 'Normal step does not award extra turn');
  assert.equal(p1.tokens[0].step, 3);

  // 3. Capturing opponent token awards extra turn
  // Red token at step 3 rolls 1 -> lands on step 4.
  // Green token placed on global track coordinate 4 (relative step 30).
  const opp = { ...players[1], tokens: [{ id: 0, step: 30 }, { id: 1, step: -1 }, { id: 2, step: -1 }, { id: 3, step: -1 }] };
  const resCapture = executeMove(p1, opp, 0, 1);
  assert.equal(resCapture.givesExtraTurn, true, 'Capture awards extra turn');
  assert.equal(resCapture.capturedOpponentTokenId, 0);
  assert.equal(opp.tokens[0].step, -1, 'Captured token returned to yard');

  // 4. Reaching home (step 56) awards extra turn
  p1.tokens[1].step = 54;
  const resHome = executeMove(p1, opp, 1, 2);
  assert.equal(p1.tokens[1].step, 56);
  assert.equal(resHome.reachedHome, true);
  assert.equal(resHome.givesExtraTurn, true, 'Reaching home awards extra turn');
});

test('Sequence Ordering & Gap Detection: Rejects duplicates/stale messages and detects gaps', () => {
  const lastApplied = 5;

  // Newer message accepted
  assert.equal(isValidNextSeq(lastApplied, 6), true);
  assert.equal(isValidNextSeq(lastApplied, 10), true);

  // Duplicate rejected
  assert.equal(isValidNextSeq(lastApplied, 5), false);

  // Stale / out-of-order rejected
  assert.equal(isValidNextSeq(lastApplied, 4), false);
  assert.equal(isValidNextSeq(lastApplied, 0), false);

  // Gap detection
  assert.equal(isSeqGap(lastApplied, 6), false, 'seq 6 immediately follows 5: no gap');
  assert.equal(isSeqGap(lastApplied, 7), true, 'seq 7 skips 6: gap detected');
  assert.equal(isSeqGap(lastApplied, 10), true, 'seq 10 skips 6..9: gap detected');
});

test('Snapshot Adoption: Stale equal-seq snapshot is rejected, newer seq is adopted', () => {
  const localSeq = 10;

  // Newer snapshot accepted
  assert.equal(shouldAdoptSnapshot(localSeq, 15), true);

  // Equal snapshot rejected to prevent stale snapshot rollbacks
  assert.equal(shouldAdoptSnapshot(localSeq, 10), false, 'Equal seq snapshot must be rejected to prevent desync');

  // Older snapshot rejected
  assert.equal(shouldAdoptSnapshot(localSeq, 9), false);
  assert.equal(shouldAdoptSnapshot(localSeq, 2), false);

  // Unstarted client adopts initial snapshot
  assert.equal(shouldAdoptSnapshot(0, 0), true);
  assert.equal(shouldAdoptSnapshot(0, 5), true);
});

test('Online Turn Advance: Roll with no moves followed by ludo_turn advances exactly once on both clients', () => {
  const { players, startingTurn } = createOnlineMatchPlayers('red', 'green', 'Friend');
  assert.equal(startingTurn, 'red');

  // State on Roller (Client A)
  let rollerTurn: LudoColor = startingTurn;
  let rollerSeq = 0;
  let rollerRoll: number | null = null;

  // State on Receiver (Client B)
  let receiverTurn: LudoColor = startingTurn;
  let receiverLastAppliedSeq = 0;
  let receiverRoll: number | null = null;

  // 1. Client A rolls 3 (all tokens in yard -> noMoves)
  const evalResult = evaluateRoll(players, rollerTurn, 3);
  assert.equal(evalResult.noMoves, true);
  assert.equal(evalResult.nextTurn, 'green');

  rollerSeq += 1; // seq = 1
  rollerRoll = 3;
  const rollMsg: LudoRollMessage = {
    color: rollerTurn,
    roll: 3,
    seq: rollerSeq,
    noMoves: true,
    nextTurn: evalResult.nextTurn,
  };

  // 2. Client B receives ludo_roll
  assert.equal(isValidNextSeq(receiverLastAppliedSeq, rollMsg.seq), true);
  receiverLastAppliedSeq = rollMsg.seq; // seq = 1
  receiverRoll = rollMsg.roll;
  // Receiver does NOT advance turn yet; waits for ludo_turn
  assert.equal(receiverTurn, 'red', 'Receiver turn remains on red while showing roll');
  assert.equal(rollerTurn, 'red');

  // 3. Roller timer expires: Roller advances turn and broadcasts ludo_turn with next seq
  rollerSeq += 1; // seq = 2
  rollerTurn = evalResult.nextTurn;
  rollerRoll = null;

  const turnMsg: LudoTurnMessage = {
    seq: rollerSeq,
    nextTurn: evalResult.nextTurn,
  };

  // 4. Receiver applies ludo_turn
  assert.equal(isValidNextSeq(receiverLastAppliedSeq, turnMsg.seq), true);
  receiverLastAppliedSeq = turnMsg.seq; // seq = 2
  receiverTurn = turnMsg.nextTurn;
  receiverRoll = null;

  // Both clients are now exactly synchronized on turn and sequence!
  assert.equal(rollerTurn, 'green');
  assert.equal(receiverTurn, 'green');
  assert.equal(rollerSeq, 2);
  assert.equal(receiverLastAppliedSeq, 2);
  assert.equal(rollerRoll, null);
  assert.equal(receiverRoll, null);
});

test('Online Turn Flow: Extra turn keeps the turn and does not advance', () => {
  const { players, startingTurn } = createOnlineMatchPlayers('red', 'green', 'Friend');
  assert.equal(startingTurn, 'red');

  let rollerTurn: LudoColor = startingTurn;
  let rollerSeq = 0;
  let receiverTurn: LudoColor = startingTurn;
  let receiverLastAppliedSeq = 0;

  // 1. Red rolls 6 (can release token from yard)
  const evalRoll = evaluateRoll(players, rollerTurn, 6);
  assert.equal(evalRoll.noMoves, false);
  rollerSeq += 1; // seq = 1

  // 2. Red moves token 0 out of yard
  const { nextPlayers, moveResult } = applyRemoteMove(players, rollerTurn, 0, 6);
  assert.equal(moveResult.givesExtraTurn, true);

  rollerSeq += 1; // seq = 2
  const moveMsg: LudoMoveMessage = {
    color: rollerTurn,
    tokenId: 0,
    roll: 6,
    seq: rollerSeq,
    givesExtraTurn: moveResult.givesExtraTurn,
    nextTurn: 'green',
    reachedHome: false,
  };

  // Receiver applies move
  assert.equal(isValidNextSeq(receiverLastAppliedSeq, moveMsg.seq), true);
  receiverLastAppliedSeq = moveMsg.seq;
  const receiverResult = applyRemoteMove(players, moveMsg.color, moveMsg.tokenId, moveMsg.roll);

  // Both clients keep turn with roller on extra turn
  assert.equal(rollerTurn, 'red', 'Turn stays with roller on extra turn');
  assert.equal(receiverTurn, 'red', 'Receiver also keeps turn with roller on extra turn');
  assert.equal(nextPlayers[0].tokens[0].step, 0);
  assert.equal(receiverResult.nextPlayers[0].tokens[0].step, 0);
});

test('Online Sequence Ordering: Late or duplicate message is ignored', () => {
  const lastApplied = 5;

  // Duplicate seq rejected
  assert.equal(isValidNextSeq(lastApplied, 5), false);

  // Stale seq rejected
  assert.equal(isValidNextSeq(lastApplied, 4), false);
  assert.equal(isValidNextSeq(lastApplied, 1), false);

  // Equal-seq snapshot rejected
  assert.equal(shouldAdoptSnapshot(lastApplied, 5), false);

  // Older-seq snapshot rejected
  assert.equal(shouldAdoptSnapshot(lastApplied, 4), false);

  // Newer snapshot accepted
  assert.equal(shouldAdoptSnapshot(lastApplied, 6), true);
});

test('createLudoSnapshot: Builds snapshot from explicitly passed arguments', () => {
  const { players } = createOnlineMatchPlayers('red', 'green', 'Friend');
  const snap = createLudoSnapshot(
    7,
    'green',
    null,
    false,
    players,
    { red: 5, green: null, yellow: null, blue: null },
    null
  );

  assert.equal(snap.seq, 7);
  assert.equal(snap.currentTurn, 'green');
  assert.equal(snap.activeRoll, null);
  assert.equal(snap.extraTurn, false);
  assert.equal(snap.players, players);
  assert.equal(snap.diceRolls.red, 5);
  assert.equal(snap.winner, null);
});

