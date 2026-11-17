import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createChessGame,
  getGameStatus,
  getCapturedPieces,
} from './engine.ts';

test('Chess Engine: Opening state and legal move validation', () => {
  const chess = createChessGame();
  const status = getGameStatus(chess);

  assert.equal(status.isOver, false);
  assert.equal(status.isCheck, false);
  assert.equal(status.isCheckmate, false);
  assert.equal(status.isStalemate, false);
  assert.equal(status.isDraw, false);
  assert.equal(status.winner, null);

  // Legal opening move: e2 -> e4
  const move1 = chess.move({ from: 'e2', to: 'e4' });
  assert.ok(move1, 'e2-e4 is a valid opening move');
  assert.equal(chess.turn(), 'b');

  // Illegal move (pawn cannot move backwards)
  assert.throws(() => {
    chess.move({ from: 'e4', to: 'e2' });
  });
});

test('Chess Engine: Game-over states (Checkmate, Stalemate, and Insufficient Material)', () => {
  // 1. Checkmate (Fool's Mate: 1. f3 e5 2. g4 Qh4#)
  const mateGame = createChessGame();
  mateGame.move('f3');
  mateGame.move('e5');
  mateGame.move('g4');
  mateGame.move('Qh4#');

  const mateStatus = getGameStatus(mateGame);
  assert.equal(mateStatus.isOver, true);
  assert.equal(mateStatus.isCheck, true);
  assert.equal(mateStatus.isCheckmate, true);
  assert.equal(mateStatus.winner, 'b', 'Black should be the winner of Fool\'s Mate');

  // 2. Stalemate (Black King has no legal moves and is not in check)
  // FEN: Black king at a8, White queen at b6, White king at h1
  const staleGame = createChessGame('k7/8/1Q6/8/8/8/8/7K b - - 0 1');
  const staleStatus = getGameStatus(staleGame);
  assert.equal(staleStatus.isOver, true);
  assert.equal(staleStatus.isCheck, false);
  assert.equal(staleStatus.isStalemate, true);
  assert.equal(staleStatus.isDraw, true);
  assert.equal(staleStatus.winner, 'draw');
  assert.equal(staleStatus.drawReason, 'Stalemate (no legal moves)');

  // 3. Insufficient Material (Bare Kings: K vs K)
  const bareKingsGame = createChessGame('8/8/8/4k3/8/8/4K3/8 w - - 0 1');
  const bareKingsStatus = getGameStatus(bareKingsGame);
  assert.equal(bareKingsStatus.isOver, true);
  assert.equal(bareKingsStatus.isDraw, true);
  assert.equal(bareKingsStatus.winner, 'draw');
  assert.equal(bareKingsStatus.drawReason, 'Draw by insufficient material');
});

test('Chess Engine: Captured pieces tracking', () => {
  const chess = createChessGame();
  const initialCaptured = getCapturedPieces(chess);
  assert.deepEqual(initialCaptured.w, []);
  assert.deepEqual(initialCaptured.b, []);

  // 1. e4 d5 2. exd5 (White captures Black pawn)
  chess.move('e4');
  chess.move('d5');
  chess.move('exd5');

  const afterPawnCapture = getCapturedPieces(chess);
  assert.deepEqual(afterPawnCapture.w, ['p'], 'White should have captured 1 black pawn');
  assert.deepEqual(afterPawnCapture.b, []);
});
