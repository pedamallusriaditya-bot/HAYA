import type { Piece, Pocket } from './types.ts';
import { carromAudio } from './carromAudio.ts';

export const BOARD_SIZE = 800;
export const CUSHION_INSET = 52;
export const PLAYING_MIN = CUSHION_INSET;
export const PLAYING_MAX = BOARD_SIZE - CUSHION_INSET;

export const PIECE_RADIUS = 17.5;
export const STRIKER_RADIUS = 22.5;
export const PIECE_MASS = 1.0;
export const STRIKER_MASS = 3.2;

export const POCKET_RADIUS = 36;
export const POCKET_SUCTION_RADIUS = 42;
export const POCKET_FALL_RADIUS = 24;

// 4 Corner Pockets
export const POCKETS: Pocket[] = [
  { id: 0, x: 74, y: 74, radius: POCKET_RADIUS },       // Top-Left
  { id: 1, x: 726, y: 74, radius: POCKET_RADIUS },      // Top-Right
  { id: 2, x: 74, y: 726, radius: POCKET_RADIUS },      // Bottom-Left
  { id: 3, x: 726, y: 726, radius: POCKET_RADIUS },     // Bottom-Right
];

// Baselines
export const BASELINE_Y_PLAYER = 650;
export const BASELINE_Y_BOT = 150;
export const BASELINE_X_MIN = 185;
export const BASELINE_X_MAX = 615;

// Physics tuning constants
const FRICTION_DECAY = 1.15; // Dynamic surface friction
const ROLLING_RESISTANCE = 45.0; // Steady rolling deceleration
const RESTITUTION_PIECE = 0.91; // Elastic collision between smooth carrom pieces
const RESTITUTION_WALL = 0.82; // Wood cushion bounce
const VELOCITY_ZERO_THRESHOLD = 0.4; // Clamped to zero to prevent micro-jitter

/**
 * Checks if a point is within the corner pocket cutout zone
 * where the wooden cushion gives way to the pocket opening.
 */
function isNearCornerCutout(x: number, y: number): boolean {
  const cornerThreshold = 95;
  const nearLeft = x < cornerThreshold;
  const nearRight = x > BOARD_SIZE - cornerThreshold;
  const nearTop = y < cornerThreshold;
  const nearBottom = y > BOARD_SIZE - cornerThreshold;
  return (nearLeft && nearTop) || (nearRight && nearTop) || (nearLeft && nearBottom) || (nearRight && nearBottom);
}

/**
 * Advances the carrom physics simulation by one frame, using fixed substeps
 * for maximum numerical stability and zero tunneling.
 *
 * @param pieces Active pieces array (mutated in place for high-performance physics)
 * @param dt Delta time for this frame (seconds, typically ~0.0166)
 * @param isHeadless If true, suppresses sound effects and drop animations (for AI lookahead)
 * @returns Array of newly pocketed pieces during this step
 */
export function stepPhysics(
  pieces: Piece[],
  dt: number = 1 / 60,
  isHeadless: boolean = false
): Piece[] {
  const substeps = 8;
  const subDt = dt / substeps;
  const newlyPocketed: Piece[] = [];

  for (let step = 0; step < substeps; step++) {
    // 1. Move active pieces and apply friction
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      if (p.isPocketed) continue;

      if (p.isFalling) {
        // Falling into pocket animation
        if (!isHeadless) {
          p.fallScale = Math.max(0, p.fallScale - subDt * 5.0);
          p.fallAlpha = Math.max(0, p.fallAlpha - subDt * 6.0);
          if (p.fallScale <= 0.05) {
            p.isPocketed = true;
            p.isFalling = false;
            p.vx = 0;
            p.vy = 0;
          }
        } else {
          p.isPocketed = true;
          p.isFalling = false;
        }
        continue;
      }
      p.x += p.vx * subDt;
      p.y += p.vy * subDt;

      const speedSq = p.vx * p.vx + p.vy * p.vy;
      if (speedSq > 0.0001) {
        const speed = Math.sqrt(speedSq);
        const newSpeed = Math.max(
          0,
          speed * (1 - FRICTION_DECAY * subDt) - ROLLING_RESISTANCE * subDt
        );

        if (newSpeed < VELOCITY_ZERO_THRESHOLD) {
          p.vx = 0;
          p.vy = 0;
        } else {
          const ratio = newSpeed / speed;
          p.vx *= ratio;
          p.vy *= ratio;
        }
      } else {
        p.vx = 0;
        p.vy = 0;
      }
      for (let k = 0; k < POCKETS.length; k++) {
        const pocket = POCKETS[k];
        const dx = pocket.x - p.x;
        const dy = pocket.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < POCKET_SUCTION_RADIUS) {
          const pull = 350 * subDt;
          const nx = dx / (dist || 1);
          const ny = dy / (dist || 1);
          p.vx += nx * pull;
          p.vy += ny * pull;
          if (dist < POCKET_FALL_RADIUS && !p.isFalling) {
            p.isFalling = true;
            p.fallScale = 1.0;
            p.fallAlpha = 1.0;
            p.vx *= 0.3;
            p.vy *= 0.3;
            newlyPocketed.push(p);
            if (!isHeadless) {
              carromAudio.playPocket();
            }
            break;
          }
        }
      }
      if (p.isFalling) continue;
      const inCutout = isNearCornerCutout(p.x, p.y);
      if (p.x - p.radius < PLAYING_MIN && (!inCutout || p.y > 110 && p.y < 690)) {
        p.x = PLAYING_MIN + p.radius;
        if (p.vx < 0) {
          const impact = Math.abs(p.vx);
          p.vx = -p.vx * RESTITUTION_WALL;
          if (!isHeadless && impact > 30) carromAudio.playCushionHit(impact);
        }
      }
      if (p.x + p.radius > PLAYING_MAX && (!inCutout || p.y > 110 && p.y < 690)) {
        p.x = PLAYING_MAX - p.radius;
        if (p.vx > 0) {
          const impact = Math.abs(p.vx);
          p.vx = -p.vx * RESTITUTION_WALL;
          if (!isHeadless && impact > 30) carromAudio.playCushionHit(impact);
        }
      }
      if (p.y - p.radius < PLAYING_MIN && (!inCutout || p.x > 110 && p.x < 690)) {
        p.y = PLAYING_MIN + p.radius;
        if (p.vy < 0) {
          const impact = Math.abs(p.vy);
          p.vy = -p.vy * RESTITUTION_WALL;
          if (!isHeadless && impact > 30) carromAudio.playCushionHit(impact);
        }
      }
      if (p.y + p.radius > PLAYING_MAX && (!inCutout || p.x > 110 && p.x < 690)) {
        p.y = PLAYING_MAX - p.radius;
        if (p.vy > 0) {
          const impact = Math.abs(p.vy);
          p.vy = -p.vy * RESTITUTION_WALL;
          if (!isHeadless && impact > 30) carromAudio.playCushionHit(impact);
        }
      }
    }
    for (let i = 0; i < pieces.length; i++) {
      const p1 = pieces[i];
      if (p1.isPocketed || p1.isFalling) continue;
      for (let j = i + 1; j < pieces.length; j++) {
        const p2 = pieces[j];
        if (p2.isPocketed || p2.isFalling) continue;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distSq = dx * dx + dy * dy;
        const minDist = p1.radius + p2.radius;
        if (distSq < minDist * minDist && distSq > 0.00001) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = minDist - dist;
          const totalMass = p1.mass + p2.mass;
          const sep1 = overlap * (p2.mass / totalMass);
          const sep2 = overlap * (p1.mass / totalMass);
          p1.x -= nx * sep1;
          p1.y -= ny * sep1;
          p2.x += nx * sep2;
          p2.y += ny * sep2;
          const dvx = p2.vx - p1.vx;
          const dvy = p2.vy - p1.vy;
          const velAlongNormal = dvx * nx + dvy * ny;
          if (velAlongNormal < 0) {
            const impulseMagnitude =
              (-(1 + RESTITUTION_PIECE) * velAlongNormal) /
              (1 / p1.mass + 1 / p2.mass);
            const impX = impulseMagnitude * nx;
            const impY = impulseMagnitude * ny;
            p1.vx -= impX / p1.mass;
            p1.vy -= impY / p1.mass;
            p2.vx += impX / p2.mass;
            p2.vy += impY / p2.mass;
            if (!isHeadless) {
              const impactSpeed = Math.abs(velAlongNormal);
              if (impactSpeed > 25) {
                carromAudio.playPieceHit(impactSpeed);
              }
            }
          }
        }
      }
    }
  }
  return newlyPocketed;
}
export function arePiecesSettled(pieces: Piece[]): boolean {
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i];
    if (p.isPocketed) continue;
    if (p.isFalling) return false;
    if (p.vx * p.vx + p.vy * p.vy > 0.05) {
      return false;
    }
  }
  return true;
}
export function simulateShotOutcome(
  pieces: Piece[],
  strikerBaselineX: number,
  strikerBaselineY: number,
  impulseX: number,
  impulseY: number,
  maxSteps: number = 80
): {
  pocketed: Piece[];
  strikerPocketed: boolean;
  strikerFinalPos: { x: number; y: number };
  settled: boolean;
} {
  const simPieces: Piece[] = pieces.map((p) => ({
    ...p,
  }));
  const striker = simPieces.find((p) => p.type === 'striker');
  if (striker) {
    striker.x = strikerBaselineX;
    striker.y = strikerBaselineY;
    striker.vx = impulseX;
    striker.vy = impulseY;
    striker.isPocketed = false;
    striker.isFalling = false;
    striker.fallScale = 1.0;
    striker.fallAlpha = 1.0;
  }
  const allPocketed: Piece[] = [];
  let strikerPocketed = false;
  for (let s = 0; s < maxSteps; s++) {
    const newly = stepPhysics(simPieces, 1 / 60, true);
    for (const p of newly) {
      allPocketed.push(p);
      if (p.type === 'striker') {
        strikerPocketed = true;
      }
    }
    if (arePiecesSettled(simPieces)) {
      return {
        pocketed: allPocketed,
        strikerPocketed,
        strikerFinalPos: striker ? { x: striker.x, y: striker.y } : { x: 0, y: 0 },
        settled: true,
      };
    }
  }
  return {
    pocketed: allPocketed,
    strikerPocketed,
    strikerFinalPos: striker ? { x: striker.x, y: striker.y } : { x: 0, y: 0 },
    settled: false,
  };
}