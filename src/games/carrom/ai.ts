import {
  BASELINE_Y_BOT,
  BASELINE_X_MIN,
  BASELINE_X_MAX,
  POCKETS,
  PIECE_RADIUS,
  STRIKER_RADIUS,
  simulateShotOutcome,
} from './physics.ts';
import type { Piece, QueenStatus, BotDecision } from './types.ts';

interface CandidateShot {
  baselineX: number;
  aimAngle: number;
  power: number;
  targetId: number;
  pocketId: number;
  score: number;
  isBankShot?: boolean;
}

/**
 * Checks if a line segment between (x1, y1) and (x2, y2) is blocked
 * by any other active piece.
 */
function isPathBlocked(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  pieces: Piece[],
  ignoredIds: number[],
  clearanceRadius: number = PIECE_RADIUS * 1.5
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq < 1) return false;

  for (const p of pieces) {
    if (p.isPocketed || ignoredIds.includes(p.id)) continue;

    // Projection of piece center onto line segment
    const t = Math.max(
      0,
      Math.min(1, ((p.x - x1) * dx + (p.y - y1) * dy) / lengthSq)
    );
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;

    const distSq = (p.x - projX) * (p.x - projX) + (p.y - projY) * (p.y - projY);
    if (distSq < clearanceRadius * clearanceRadius) {
      return true; // Path is blocked
    }
  }

  return false;
}

/**
 * Generates candidate direct shots from legal baseline positions to all 4 pockets.
 */
function generateDirectCandidates(
  pieces: Piece[],
  queenStatus: QueenStatus,
  sampleXSteps: number,
  maxCutAngleDegrees: number
): CandidateShot[] {
  const candidates: CandidateShot[] = [];
  const strikerY = BASELINE_Y_BOT;
  const maxCutCos = Math.cos((maxCutAngleDegrees * Math.PI) / 180);

  // Determine target pieces
  // Bot plays Black
  const isQueenPendingCover = queenStatus === 'pending_cover_bot';
  let targetPieces: Piece[] = [];

  if (isQueenPendingCover) {
    // Bot must cover queen by pocketing black piece
    targetPieces = pieces.filter((p) => p.type === 'black' && !p.isPocketed);
  } else {
    // Normal: Black pieces, plus Queen if on board
    targetPieces = pieces.filter(
      (p) =>
        (p.type === 'black' || (p.type === 'queen' && queenStatus === 'on_board')) &&
        !p.isPocketed
    );
  }

  if (targetPieces.length === 0) {
    // Fallback if somehow no targets found
    targetPieces = pieces.filter((p) => !p.isPocketed && p.type !== 'striker');
  }

  // Generate baseline X samples
  const xSpan = BASELINE_X_MAX - BASELINE_X_MIN;
  const stepSize = xSpan / (sampleXSteps - 1);
  const baselineXs: number[] = [];
  for (let i = 0; i < sampleXSteps; i++) {
    baselineXs.push(BASELINE_X_MIN + i * stepSize);
  }

  const striker = pieces.find((p) => p.type === 'striker');
  const strikerId = striker ? striker.id : -1;

  for (const sx of baselineXs) {
    for (const target of targetPieces) {
      for (const pocket of POCKETS) {
        // Target to pocket vector
        const tpX = pocket.x - target.x;
        const tpY = pocket.y - target.y;
        const distTP = Math.sqrt(tpX * tpX + tpY * tpY);
        if (distTP < 10) continue;

        const uTPX = tpX / distTP;
        const uTPY = tpY / distTP;

        // Ghost ball contact center
        const contactDist = STRIKER_RADIUS + PIECE_RADIUS;
        const gx = target.x - uTPX * contactDist;
        const gy = target.y - uTPY * contactDist;

        // Striker to ghost ball vector
        const sgX = gx - sx;
        const sgY = gy - strikerY;
        const distSG = Math.sqrt(sgX * sgX + sgY * sgY);
        if (distSG < 15) continue;

        const uSGX = sgX / distSG;
        const uSGY = sgY / distSG;

        // Cut angle cosine (dot product of striker direction and target->pocket direction)
        const dot = uSGX * uTPX + uSGY * uTPY;
        if (dot < maxCutCos) {
          // Cut angle is too sharp or backward
          continue;
        }

        // Aim angle
        const aimAngle = Math.atan2(sgY, sgX);

        // Check path obstructions
        const isStrikerPathBlocked = isPathBlocked(
          sx,
          strikerY,
          gx,
          gy,
          pieces,
          [strikerId, target.id],
          (STRIKER_RADIUS + PIECE_RADIUS) * 0.8
        );

        const isTargetPathBlocked = isPathBlocked(
          target.x,
          target.y,
          pocket.x,
          pocket.y,
          pieces,
          [strikerId, target.id],
          PIECE_RADIUS * 1.4
        );

        // Base power calculation based on distance and cut angle
        const cutFactor = 1.0 + (1.0 - dot) * 1.5;
        const totalDist = distSG + distTP * 1.1;
        const power = Math.max(
          420,
          Math.min(1550, totalDist * 1.75 * cutFactor + 180)
        );

        // Score this candidate shot
        let score = 0;

        // 1. Straightness & Cut Quality (0 to 100)
        score += dot * 100;

        // 2. Proximity of target to pocket (closer target is easier, up to 50)
        score += Math.max(0, 50 - (distTP / 800) * 50);

        // 3. Proximity of striker to target (up to 30)
        score += Math.max(0, 30 - (distSG / 800) * 30);

        // 4. Queen high priority
        if (target.type === 'queen') {
          score += 85;
        } else if (isQueenPendingCover && target.type === 'black') {
          score += 110; // Vital to cover Queen!
        }

        // 5. Penalties for obstructions
        if (isStrikerPathBlocked) score -= 140;
        if (isTargetPathBlocked) score -= 160;

        // 6. Check if striker line points directly into a pocket (foul danger)
        for (const p of POCKETS) {
          const dpx = p.x - sx;
          const dpy = p.y - strikerY;
          const distP = Math.sqrt(dpx * dpx + dpy * dpy);
          if (distP > 10) {
            const pDot = (dpx / distP) * uSGX + (dpy / distP) * uSGY;
            if (pDot > 0.985 && distP < 600) {
              score -= 300; // Dangerous foul risk!
            }
          }
        }

        candidates.push({
          baselineX: sx,
          aimAngle,
          power,
          targetId: target.id,
          pocketId: pocket.id,
          score,
        });
      }
    }
  }

  return candidates;
}

/**
 * Computes the optimal bot shot based on selected difficulty level (1 to 7).
 */
export function computeBotMove(
  difficultyLevel: number,
  pieces: Piece[],
  queenStatus: QueenStatus
): BotDecision {
  const clampedLevel = Math.max(1, Math.min(7, difficultyLevel));

  // Difficulty Parameter Configurations
  let sampleSteps = 8;
  let maxCutDegrees = 50;
  let angleJitterDeg = 5.0;
  let powerJitterPercent = 0.12;
  let runPhysicsSimulation = false;
  let lookaheadCount = 0;

  switch (clampedLevel) {
    case 7: // Carrom Master (Level 7)
      sampleSteps = 24;
      maxCutDegrees = 68;
      angleJitterDeg = 0.2;
      powerJitterPercent = 0.015;
      runPhysicsSimulation = true;
      lookaheadCount = 6;
      break;

    case 6: // Grandmaster (Level 6)
      sampleSteps = 18;
      maxCutDegrees = 62;
      angleJitterDeg = 0.75;
      powerJitterPercent = 0.035;
      runPhysicsSimulation = true;
      lookaheadCount = 3;
      break;

    case 5: // Expert (Level 5)
      sampleSteps = 14;
      maxCutDegrees = 55;
      angleJitterDeg = 1.8;
      powerJitterPercent = 0.06;
      runPhysicsSimulation = false;
      break;

    case 4: // Advanced (Level 4)
      sampleSteps = 10;
      maxCutDegrees = 48;
      angleJitterDeg = 3.5;
      powerJitterPercent = 0.09;
      runPhysicsSimulation = false;
      break;

    case 3: // Intermediate (Level 3)
      sampleSteps = 7;
      maxCutDegrees = 40;
      angleJitterDeg = 5.8;
      powerJitterPercent = 0.13;
      runPhysicsSimulation = false;
      break;

    case 2: // Casual (Level 2)
      sampleSteps = 5;
      maxCutDegrees = 32;
      angleJitterDeg = 9.0;
      powerJitterPercent = 0.18;
      runPhysicsSimulation = false;
      break;

    case 1: // Beginner (Level 1)
    default:
      sampleSteps = 3;
      maxCutDegrees = 25;
      angleJitterDeg = 13.5;
      powerJitterPercent = 0.25;
      runPhysicsSimulation = false;
      break;
  }

  // 1. Generate candidate shots
  const candidates = generateDirectCandidates(
    pieces,
    queenStatus,
    sampleSteps,
    maxCutDegrees
  );

  // If no candidates generated, fallback to aiming at nearest active piece
  if (candidates.length === 0) {
    const activePieces = pieces.filter((p) => !p.isPocketed && p.type !== 'striker');
    const target = activePieces[0] || { x: 400, y: 400, id: 0 };
    const randomBaselineX =
      BASELINE_X_MIN + Math.random() * (BASELINE_X_MAX - BASELINE_X_MIN);
    const dx = target.x - randomBaselineX;
    const dy = target.y - BASELINE_Y_BOT;
    return {
      baselineX: randomBaselineX,
      aimAngle: Math.atan2(dy, dx),
      power: 700 + Math.random() * 300,
      targetPieceId: target.id || null,
      targetPocketId: null,
    };
  }

  // 2. Sort candidates by score descending
  candidates.sort((a, b) => b.score - a.score);

  // 3. For Master & Grandmaster: Run headless physics simulation on top candidates
  if (runPhysicsSimulation && lookaheadCount > 0) {
    const topCandidates = candidates.slice(0, lookaheadCount);
    for (const cand of topCandidates) {
      const impX = Math.cos(cand.aimAngle) * cand.power;
      const impY = Math.sin(cand.aimAngle) * cand.power;

      const sim = simulateShotOutcome(
        pieces,
        cand.baselineX,
        BASELINE_Y_BOT,
        impX,
        impY,
        70
      );

      // Heavy penalty if striker gets pocketed (foul prevention)
      if (sim.strikerPocketed) {
        cand.score -= 600;
      }

      // Bonus if target is pocketed in simulation
      const pocketedTarget = sim.pocketed.some((p) => p.id === cand.targetId);
      if (pocketedTarget) {
        cand.score += 250;
      }

      // Bonus if any own piece pocketed
      const pocketedOwn = sim.pocketed.some((p) => p.type === 'black');
      if (pocketedOwn) {
        cand.score += 150;
      }
    }

    // Re-sort after simulation scores
    candidates.sort((a, b) => b.score - a.score);
  }

  // 4. Select candidate based on difficulty level
  // Master/Grandmaster picks top 1. Lower difficulties pick from top N to add natural variety
  let chosenCand: CandidateShot;
  if (clampedLevel >= 6) {
    chosenCand = candidates[0];
  } else if (clampedLevel >= 4) {
    const pickIndex = Math.min(candidates.length - 1, Math.floor(Math.random() * 2));
    chosenCand = candidates[pickIndex];
  } else {
    const pickIndex = Math.min(candidates.length - 1, Math.floor(Math.random() * 4));
    chosenCand = candidates[pickIndex];
  }

  // 5. Apply difficulty-dependent jitter
  const angleJitterRad = ((Math.random() * 2 - 1) * angleJitterDeg * Math.PI) / 180;
  const powerJitter = 1.0 + (Math.random() * 2 - 1) * powerJitterPercent;

  const finalAimAngle = chosenCand.aimAngle + angleJitterRad;
  const finalPower = Math.max(350, Math.min(1600, chosenCand.power * powerJitter));

  return {
    baselineX: chosenCand.baselineX,
    aimAngle: finalAimAngle,
    power: finalPower,
    targetPieceId: chosenCand.targetId,
    targetPocketId: chosenCand.pocketId,
  };
}
