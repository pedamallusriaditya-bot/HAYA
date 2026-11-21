import test from 'node:test';
import assert from 'node:assert/strict';
import {
  serializePieces,
  applyPieceSnapshot,
  flipCoordinates,
  flipAngle,
  flipStrikerShot,
  isLegalShot,
  shouldAdoptSnapshot,
  createInitialOnlineCarromState,
} from './onlineEngine.ts';
import { BASELINE_X_MIN, BASELINE_X_MAX, BASELINE_Y_PLAYER, BASELINE_Y_BOT } from './physics.ts';

test('Carrom Online Engine: serializePieces and applyPieceSnapshot preserve state', () => {
  const initial = createInitialOnlineCarromState('player');
  assert.equal(initial.pieces.length, 20);

  // Mutate some pieces
  initial.pieces[0].x = 412.345;
  initial.pieces[0].y = 498.765;
  initial.pieces[1].isPocketed = true;

  const serialized = serializePieces(initial.pieces);
  assert.equal(serialized.length, 20);
  assert.equal(serialized[0].x, 412.35);
  assert.equal(serialized[0].y, 498.77);
  assert.equal(serialized[1].isPocketed, true);

  // Apply to fresh board
  const fresh = createInitialOnlineCarromState('player');
  applyPieceSnapshot(fresh.pieces, serialized);
  assert.equal(fresh.pieces[0].x, 412.35);
  assert.equal(fresh.pieces[0].y, 498.77);
  assert.equal(fresh.pieces[1].isPocketed, true);
});

test('Carrom Online Engine: 180-degree coordinate and angle flipping', () => {
  // Center is invariant
  const center = flipCoordinates(400, 400);
  assert.equal(center.x, 400);
  assert.equal(center.y, 400);

  // Bottom baseline left maps to Top baseline right
  const flipped = flipCoordinates(BASELINE_X_MIN, BASELINE_Y_PLAYER);
  assert.equal(flipped.x, BASELINE_X_MAX);
  assert.equal(flipped.y, BASELINE_Y_BOT);

  // Shooting up (-PI/2) flips to shooting down (+PI/2)
  const flippedAngle = flipAngle(-Math.PI / 2);
  assert.ok(Math.abs(flippedAngle - Math.PI / 2) < 1e-6);

  // Full striker shot flip
  const shot = flipStrikerShot({ x: 300, y: BASELINE_Y_PLAYER }, -Math.PI / 2);
  assert.equal(shot.position.x, 500);
  assert.equal(shot.position.y, BASELINE_Y_BOT);
  assert.ok(Math.abs(shot.angle - Math.PI / 2) < 1e-6);
});

test('Carrom Online Engine: isLegalShot validation', () => {
  // Legal shot
  assert.equal(isLegalShot({ x: 400, y: BASELINE_Y_PLAYER }, 1000), true);

  // Out of bounds X
  assert.equal(isLegalShot({ x: BASELINE_X_MIN - 10, y: BASELINE_Y_PLAYER }, 1000), false);
  assert.equal(isLegalShot({ x: BASELINE_X_MAX + 10, y: BASELINE_Y_PLAYER }, 1000), false);

  // Wrong baseline Y
  assert.equal(isLegalShot({ x: 400, y: 300 }, 1000), false);

  // Out of bounds power
  assert.equal(isLegalShot({ x: 400, y: BASELINE_Y_PLAYER }, 50), false);
  assert.equal(isLegalShot({ x: 400, y: BASELINE_Y_PLAYER }, 3000), false);
});

test('Carrom Online Engine: Snapshot adoption sequence monotonicity', () => {
  assert.equal(shouldAdoptSnapshot(5, 6), true);
  assert.equal(shouldAdoptSnapshot(5, 5), false);
  assert.equal(shouldAdoptSnapshot(5, 4), false);
});
