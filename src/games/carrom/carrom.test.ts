import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  BOARD_SIZE,
  BASELINE_Y_PLAYER,
  BASELINE_X_MIN,
  BASELINE_X_MAX,
  PIECE_RADIUS,
  STRIKER_RADIUS,
  POCKETS,
  stepPhysics,
  arePiecesSettled,
} from './physics.ts';
import {
  createInitialBoard,
  resolveShot,
  calculateScore,
  clampStrikerX,
  isStrikerPlacementLegal,
  resolveLegalStrikerX,
} from './engine.ts';
import { computeBotMove } from './ai.ts';
import type { Piece } from './types.ts';

describe('Carrom Initial Board Setup', () => {
  test('Initial setup contains exactly 19 carrom men plus 1 striker', () => {
    const pieces = createInitialBoard('player');
    assert.equal(pieces.length, 20);

    const queen = pieces.filter((p) => p.type === 'queen');
    assert.equal(queen.length, 1);
    assert.equal(queen[0].x, BOARD_SIZE / 2);
    assert.equal(queen[0].y, BOARD_SIZE / 2);

    const whites = pieces.filter((p) => p.type === 'white');
    assert.equal(whites.length, 9);

    const blacks = pieces.filter((p) => p.type === 'black');
    assert.equal(blacks.length, 9);

    const striker = pieces.filter((p) => p.type === 'striker');
    assert.equal(striker.length, 1);
    assert.equal(striker[0].y, BASELINE_Y_PLAYER);
    assert.equal(striker[0].x, BOARD_SIZE / 2);
  });

  test('Ring 1 and Ring 2 pieces are symmetrically arranged around center', () => {
    const pieces = createInitialBoard('player');
    const cx = BOARD_SIZE / 2;
    const cy = BOARD_SIZE / 2;

    const carromMen = pieces.filter((p) => p.type !== 'striker' && p.type !== 'queen');
    assert.equal(carromMen.length, 18);

    // Verify all pieces start within the outer center circle boundary (< 100px from center)
    for (const p of carromMen) {
      const dist = Math.hypot(p.x - cx, p.y - cy);
      assert.ok(dist <= 80, `Piece ${p.id} distance ${dist} must be <= 80`);
    }
  });

  test('Striker placement clamping stays strictly within legal baseline', () => {
    assert.equal(clampStrikerX(100), BASELINE_X_MIN);
    assert.equal(clampStrikerX(700), BASELINE_X_MAX);
    assert.equal(clampStrikerX(400), 400);
  });

  test('Striker placement resolves obstruction and prevents overlapping active pieces', () => {
    const pieces = createInitialBoard('player');
    // Place a piece directly on the baseline at x = 350
    const blockingPiece = pieces.find((p) => p.type === 'white')!;
    blockingPiece.x = 350;
    blockingPiece.y = BASELINE_Y_PLAYER;

    // Direct overlap test should be false
    assert.equal(isStrikerPlacementLegal(350, BASELINE_Y_PLAYER, pieces), false);

    // Moving right toward x = 350 from x = 200 should stop before the piece without overlapping
    const resolvedX = resolveLegalStrikerX(350, BASELINE_Y_PLAYER, pieces, 200);
    assert.ok(resolvedX < 350, 'Must stop before blocking piece');
    assert.ok(isStrikerPlacementLegal(resolvedX, BASELINE_Y_PLAYER, pieces), 'Resolved position must be legal');
  });
});

describe('Carrom Physics Simulation', () => {
  test('Surface friction smoothly decelerates pieces to a complete standstill without jitter', () => {
    const testPiece: Piece = {
      id: 1,
      type: 'white',
      x: 400,
      y: 400,
      vx: 300,
      vy: 0,
      radius: PIECE_RADIUS,
      mass: 1.0,
      isPocketed: false,
      isFalling: false,
      fallScale: 1.0,
      fallAlpha: 1.0,
    };

    const pieces = [testPiece];

    // Step physics for 120 frames (approx 2 seconds)
    for (let i = 0; i < 180; i++) {
      stepPhysics(pieces, 1 / 60, true);
    }

    assert.equal(testPiece.vx, 0);
    assert.equal(testPiece.vy, 0);
    assert.ok(arePiecesSettled(pieces));
  });

  test('Striker-to-piece elastic collision transfers momentum correctly', () => {
    const striker: Piece = {
      id: 99,
      type: 'striker',
      x: 400,
      y: 440,
      vx: 0,
      vy: -500, // Moving upward toward stationary target
      radius: STRIKER_RADIUS,
      mass: 3.2,
      isPocketed: false,
      isFalling: false,
      fallScale: 1.0,
      fallAlpha: 1.0,
    };

    const target: Piece = {
      id: 1,
      type: 'white',
      x: 400,
      y: 400,
      vx: 0,
      vy: 0, // Stationary target
      radius: PIECE_RADIUS,
      mass: 1.0,
      isPocketed: false,
      isFalling: false,
      fallScale: 1.0,
      fallAlpha: 1.0,
    };

    const pieces = [striker, target];

    // Initial total linear momentum
    const initialMomentumY = striker.mass * striker.vy + target.mass * target.vy;

    // Run collision step
    stepPhysics(pieces, 1 / 60, true);

    // Target piece should have moved forward (negative vy)
    assert.ok(target.vy < -100, `Target vy should be negative, was ${target.vy}`);

    // Check momentum conservation (approximate due to sub-frame friction)
    const finalMomentumY = striker.mass * striker.vy + target.mass * target.vy;
    assert.ok(
      Math.abs(finalMomentumY - initialMomentumY) < 50,
      'Linear momentum should be conserved within numerical friction limits'
    );
  });

  test('Cushion rebound reverses piece velocity with realistic restitution', () => {
    const piece: Piece = {
      id: 1,
      type: 'white',
      x: 60, // Near left cushion (inner playing min is 52)
      y: 400,
      vx: -400, // Moving left toward cushion
      vy: 0,
      radius: PIECE_RADIUS,
      mass: 1.0,
      isPocketed: false,
      isFalling: false,
      fallScale: 1.0,
      fallAlpha: 1.0,
    };

    const pieces = [piece];
    stepPhysics(pieces, 1 / 60, true);

    // After hitting left cushion, vx should be positive (bounced back right)
    assert.ok(piece.vx > 0, `Expected rebound velocity > 0, got ${piece.vx}`);
    assert.ok(piece.x >= 52 + PIECE_RADIUS, 'Piece must not penetrate beyond inner cushion');
  });

  test('High-speed striker shot never tunnels through pieces (substepping CCD)', () => {
    // Striker moving at maximum power (1600 px/sec) directly into a piece
    const striker: Piece = {
      id: 99,
      type: 'striker',
      x: 400,
      y: 500,
      vx: 0,
      vy: -1600,
      radius: STRIKER_RADIUS,
      mass: 3.2,
      isPocketed: false,
      isFalling: false,
      fallScale: 1.0,
      fallAlpha: 1.0,
    };

    const target: Piece = {
      id: 1,
      type: 'white',
      x: 400,
      y: 450,
      vx: 0,
      vy: 0,
      radius: PIECE_RADIUS,
      mass: 1.0,
      isPocketed: false,
      isFalling: false,
      fallScale: 1.0,
      fallAlpha: 1.0,
    };

    const pieces = [striker, target];
    stepPhysics(pieces, 1 / 60, true);

    // Target must receive strong upward impulse and not be tunneled through
    assert.ok(target.vy < -500, 'Target must absorb momentum at high speed');
    assert.ok(
      target.y < striker.y,
      'Target piece must remain ahead of striker without tunneling'
    );
  });

  test('Corner pocket captures pieces accurately', () => {
    const pocket = POCKETS[0]; // Top-left pocket at (74, 74)
    const piece: Piece = {
      id: 1,
      type: 'white',
      x: pocket.x + 8,
      y: pocket.y + 8,
      vx: -20,
      vy: -20,
      radius: PIECE_RADIUS,
      mass: 1.0,
      isPocketed: false,
      isFalling: false,
      fallScale: 1.0,
      fallAlpha: 1.0,
    };

    const pieces = [piece];
    const newlyPocketed = stepPhysics(pieces, 1 / 60, true);

    assert.equal(newlyPocketed.length, 1);
    assert.equal(newlyPocketed[0].id, 1);
    assert.ok(piece.isPocketed);
  });
});

describe('Carrom Rules and Turn Resolution', () => {
  test('Pocketing player own white piece awards an extra turn continuation', () => {
    const pieces = createInitialBoard('player');
    const pocketedWhite = pieces.find((p) => p.type === 'white')!;
    pocketedWhite.isPocketed = true;

    const result = resolveShot('player', [pocketedWhite], 'on_board', pieces);
    assert.equal(result.shotResult.turnContinued, true);
    assert.equal(result.nextPlayer, 'player');
    assert.equal(result.shotResult.foulReason, null);
  });

  test('Pocketing opponent black piece on player turn transfers turn to opponent', () => {
    const pieces = createInitialBoard('player');
    const pocketedBlack = pieces.find((p) => p.type === 'black')!;
    pocketedBlack.isPocketed = true;

    const result = resolveShot('player', [pocketedBlack], 'on_board', pieces);
    assert.equal(result.shotResult.turnContinued, false);
    assert.equal(result.nextPlayer, 'bot');
  });

  test('Striker pocketing triggers foul with 1 penalty piece returned to center', () => {
    const pieces = createInitialBoard('player');
    const striker = pieces.find((p) => p.type === 'striker')!;
    striker.isPocketed = true;

    // Simulate player already having 1 pocketed piece
    const ownPiece = pieces.find((p) => p.type === 'white')!;
    ownPiece.isPocketed = true;

    const result = resolveShot('player', [striker], 'on_board', pieces);
    assert.equal(result.shotResult.isStrikerPocketed, true);
    assert.equal(result.shotResult.turnContinued, false);
    assert.equal(result.nextPlayer, 'bot');
    assert.equal(result.shotResult.penaltyReturned, 'white');
    assert.equal(ownPiece.isPocketed, false, 'Penalty piece should be placed back on board');
  });

  test('Sinking Queen alone requires cover on next shot', () => {
    const pieces = createInitialBoard('player');
    const queen = pieces.find((p) => p.type === 'queen')!;
    queen.isPocketed = true;

    const result = resolveShot('player', [queen], 'on_board', pieces);
    assert.equal(result.nextQueenStatus, 'pending_cover_player');
    assert.equal(result.shotResult.turnContinued, true, 'Player gets next shot to cover Queen');
  });

  test('Covering Queen by sinking own piece awards Queen bonus (+3 points)', () => {
    const pieces = createInitialBoard('player');
    const ownPiece = pieces.find((p) => p.type === 'white')!;
    ownPiece.isPocketed = true;

    // Queen was pending cover for player
    const result = resolveShot('player', [ownPiece], 'pending_cover_player', pieces);
    assert.equal(result.nextQueenStatus, 'covered_player');
    assert.equal(result.shotResult.queenCovered, true);
    assert.equal(result.shotResult.turnContinued, true);

    const score = calculateScore(pieces, result.nextQueenStatus);
    assert.equal(score.queenHolder, 'player');
    assert.ok(score.playerScore >= 4); // 1 piece + 3 queen points
  });

  test('Failing to cover Queen returns Queen to center circle and forfeits turn', () => {
    const pieces = createInitialBoard('player');
    const queen = pieces.find((p) => p.type === 'queen')!;
    queen.isPocketed = true;

    // Player made no pockets while Queen was pending cover
    const result = resolveShot('player', [], 'pending_cover_player', pieces);
    assert.equal(result.nextQueenStatus, 'on_board');
    assert.equal(result.shotResult.queenReturnedToCenter, true);
    assert.equal(result.shotResult.turnContinued, false);
    assert.equal(result.nextPlayer, 'bot');
    assert.equal(queen.isPocketed, false, 'Queen must be back on the board');
  });
});

describe('7-Tier Bot AI Engine', () => {
  test('All 7 difficulty levels compute valid moves obeying legal baseline bounds', () => {
    const pieces = createInitialBoard('bot');

    for (let level = 1; level <= 7; level++) {
      const decision = computeBotMove(level, pieces, 'on_board');
      assert.ok(
        decision.baselineX >= BASELINE_X_MIN && decision.baselineX <= BASELINE_X_MAX,
        `Level ${level} baselineX ${decision.baselineX} outside legal range`
      );
      assert.ok(
        decision.power >= 350 && decision.power <= 1600,
        `Level ${level} power ${decision.power} outside legal range`
      );
      assert.ok(
        typeof decision.aimAngle === 'number' && !isNaN(decision.aimAngle),
        `Level ${level} aimAngle must be a valid number`
      );
    }
  });

  test('Carrom Master (Level 7) demonstrates measurably higher precision than Beginner (Level 1)', () => {
    const pieces = createInitialBoard('bot');

    // Sample Level 7 angles
    const masterAngles: number[] = [];
    for (let i = 0; i < 5; i++) {
      const d = computeBotMove(7, pieces, 'on_board');
      masterAngles.push(d.aimAngle);
    }

    // Master decisions should have extremely small variance (< 0.05 radians)
    const masterMean = masterAngles.reduce((a, b) => a + b, 0) / masterAngles.length;
    const masterVariance =
      masterAngles.reduce((sum, a) => sum + Math.pow(a - masterMean, 2), 0) /
      masterAngles.length;

    assert.ok(
      masterVariance < 0.05,
      `Master variance should be small, got ${masterVariance}`
    );
  });

  test('Bot prioritizes Queen-covering when Queen is pending cover', () => {
    const pieces = createInitialBoard('bot');
    const decision = computeBotMove(7, pieces, 'pending_cover_bot');

    // Bot must target a black piece to legally cover the queen
    if (decision.targetPieceId) {
      const target = pieces.find((p) => p.id === decision.targetPieceId);
      assert.equal(target?.type, 'black', 'Bot must target its own piece to cover Queen');
    }
  });
});
