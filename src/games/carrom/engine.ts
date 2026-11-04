import {
  BOARD_SIZE,
  BASELINE_Y_PLAYER,
  BASELINE_Y_BOT,
  BASELINE_X_MIN,
  BASELINE_X_MAX,
  PIECE_RADIUS,
  STRIKER_RADIUS,
  PIECE_MASS,
  STRIKER_MASS,
} from './physics.ts';
import type {
  Piece,
  PieceType,
  PlayerSide,
  QueenStatus,
  ShotResult,
  CarromScore,
} from './types.ts';
import { carromAudio } from './carromAudio.ts';

/**
 * Creates the authentic initial 19-piece carrom rosette:
 * - 1 Red Queen at the exact center (400, 400)
 * - Ring 1: 6 pieces snugly surrounding Queen (3 White, 3 Black alternating)
 * - Ring 2: 12 pieces surrounding Ring 1 (6 White, 6 Black alternating)
 * Plus 1 striker positioned on the starting player's baseline.
 */
export function createInitialBoard(startingPlayer: PlayerSide = 'player'): Piece[] {
  const pieces: Piece[] = [];
  const cx = BOARD_SIZE / 2;
  const cy = BOARD_SIZE / 2;
  let idCounter = 1;

  // 1. Red Queen at exact center
  pieces.push({
    id: idCounter++,
    type: 'queen',
    x: cx,
    y: cy,
    vx: 0,
    vy: 0,
    radius: PIECE_RADIUS,
    mass: PIECE_MASS,
    isPocketed: false,
    isFalling: false,
    fallScale: 1.0,
    fallAlpha: 1.0,
  });

  // 2. Ring 1 (6 pieces alternating White & Black, distance = 2 * PIECE_RADIUS)
  const ring1Dist = PIECE_RADIUS * 2;
  const ring1Types: PieceType[] = ['white', 'black', 'white', 'black', 'white', 'black'];

  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3; // 0, 60, 120, 180, 240, 300 degrees
    pieces.push({
      id: idCounter++,
      type: ring1Types[i],
      x: cx + Math.cos(angle) * ring1Dist,
      y: cy + Math.sin(angle) * ring1Dist,
      vx: 0,
      vy: 0,
      radius: PIECE_RADIUS,
      mass: PIECE_MASS,
      isPocketed: false,
      isFalling: false,
      fallScale: 1.0,
      fallAlpha: 1.0,
    });
  }

  // 3. Ring 2 (12 pieces: 6 corners at 4 * PIECE_RADIUS, 6 edges at 2 * sqrt(3) * PIECE_RADIUS)
  // Ordered consecutively around the circle to create alternating White & Black perimeter
  const cornerDist = PIECE_RADIUS * 4;
  const edgeDist = PIECE_RADIUS * 2 * Math.sqrt(3);

  for (let i = 0; i < 12; i++) {
    const isCorner = i % 2 === 0;
    const angle = (i * Math.PI) / 6;
    const dist = isCorner ? cornerDist : edgeDist;
    // Alternating types: 6 White, 6 Black
    const type: PieceType = i % 2 === 0 ? 'black' : 'white';

    pieces.push({
      id: idCounter++,
      type,
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      vx: 0,
      vy: 0,
      radius: PIECE_RADIUS,
      mass: PIECE_MASS,
      isPocketed: false,
      isFalling: false,
      fallScale: 1.0,
      fallAlpha: 1.0,
    });
  }

  // 4. Striker
  const strikerY = startingPlayer === 'player' ? BASELINE_Y_PLAYER : BASELINE_Y_BOT;
  pieces.push({
    id: idCounter++,
    type: 'striker',
    x: cx,
    y: strikerY,
    vx: 0,
    vy: 0,
    radius: STRIKER_RADIUS,
    mass: STRIKER_MASS,
    isPocketed: false,
    isFalling: false,
    fallScale: 1.0,
    fallAlpha: 1.0,
  });

  return pieces;
}

/**
 * Finds a safe, non-overlapping spot in or near the center circle
 * to return a penalty piece or uncovered Queen.
 */
export function findSafeCenterSpot(pieces: Piece[]): { x: number; y: number } {
  const cx = BOARD_SIZE / 2;
  const cy = BOARD_SIZE / 2;

  // Check if exact center is free
  let safe = true;
  for (const p of pieces) {
    if (p.isPocketed) continue;
    const dx = p.x - cx;
    const dy = p.y - cy;
    if (dx * dx + dy * dy < (p.radius + PIECE_RADIUS) * (p.radius + PIECE_RADIUS)) {
      safe = false;
      break;
    }
  }
  if (safe) return { x: cx, y: cy };

  // Spiral outwards in search of an open position
  for (let radius = 25; radius <= 160; radius += 20) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      let spotOpen = true;

      for (const p of pieces) {
        if (p.isPocketed) continue;
        const dx = p.x - x;
        const dy = p.y - y;
        if (dx * dx + dy * dy < (p.radius + PIECE_RADIUS + 4) * (p.radius + PIECE_RADIUS + 4)) {
          spotOpen = false;
          break;
        }
      }

      if (spotOpen) {
        return { x, y };
      }
    }
  }

  return { x: cx, y: cy + 30 };
}

/**
 * Calculates current game score and pieces status.
 */
export function calculateScore(
  pieces: Piece[],
  queenStatus: QueenStatus
): CarromScore {
  let remainingWhite = 0;
  let remainingBlack = 0;

  for (const p of pieces) {
    if (p.type === 'white' && !p.isPocketed) remainingWhite++;
    if (p.type === 'black' && !p.isPocketed) remainingBlack++;
  }

  const playerPiecesPocketed = 9 - remainingWhite;
  const botPiecesPocketed = 9 - remainingBlack;

  let playerScore = playerPiecesPocketed;
  let botScore = botPiecesPocketed;
  let queenHolder: PlayerSide | null = null;

  if (queenStatus === 'covered_player') {
    playerScore += 3;
    queenHolder = 'player';
  } else if (queenStatus === 'covered_bot') {
    botScore += 3;
    queenHolder = 'bot';
  }

  return {
    playerScore,
    botScore,
    remainingWhite,
    remainingBlack,
    playerPiecesPocketed,
    botPiecesPocketed,
    queenHolder,
  };
}

/**
 * Evaluates the outcome of a completed shot according to standard Carrom rules:
 * - Striker pocketed = Foul! (1 penalty piece returned to center, turn lost).
 * - Queen pocketed = Requires covering by pocketing an own piece in same or subsequent turn.
 * - Sinking own piece = Continue turn.
 * - Sinking no piece / opponent piece only = Turn passes to opponent.
 * - Win condition checked.
 */
export function resolveShot(
  shooter: PlayerSide,
  pocketedInShot: Piece[],
  currentQueenStatus: QueenStatus,
  pieces: Piece[]
): {
  shotResult: ShotResult;
  nextQueenStatus: QueenStatus;
  updatedPieces: Piece[];
  nextPlayer: PlayerSide;
} {
  const ownColor: PieceType = shooter === 'player' ? 'white' : 'black';

  const isStrikerPocketed = pocketedInShot.some((p) => p.type === 'striker');
  const ownPocketedCount = pocketedInShot.filter((p) => p.type === ownColor).length;
  const isQueenPocketedInThisShot = pocketedInShot.some((p) => p.type === 'queen');

  const updatedPieces = [...pieces];
  let nextQueenStatus = currentQueenStatus;
  let foulReason: string | null = null;
  let penaltyReturned: PieceType | null = null;
  let queenCovered = false;
  let queenReturnedToCenter = false;
  let turnContinued = false;

  // Case A: Striker Pocketed (FOUL)
  if (isStrikerPocketed) {
    foulReason = 'Striker Pocketed (Foul)';
    carromAudio.playFoul();

    // 1. If Queen was pocketed during this foul shot, return Queen to center
    if (isQueenPocketedInThisShot) {
      const q = updatedPieces.find((p) => p.type === 'queen');
      if (q) {
        const spot = findSafeCenterSpot(updatedPieces);
        q.x = spot.x;
        q.y = spot.y;
        q.vx = 0;
        q.vy = 0;
        q.isPocketed = false;
        q.isFalling = false;
        q.fallScale = 1.0;
        q.fallAlpha = 1.0;
      }
      nextQueenStatus = 'on_board';
      queenReturnedToCenter = true;
    } else if (
      (shooter === 'player' && currentQueenStatus === 'pending_cover_player') ||
      (shooter === 'bot' && currentQueenStatus === 'pending_cover_bot')
    ) {
      // If queen was previously pending cover, foul means failed cover -> return Queen to center
      const q = updatedPieces.find((p) => p.type === 'queen');
      if (q) {
        const spot = findSafeCenterSpot(updatedPieces);
        q.x = spot.x;
        q.y = spot.y;
        q.vx = 0;
        q.vy = 0;
        q.isPocketed = false;
        q.isFalling = false;
        q.fallScale = 1.0;
        q.fallAlpha = 1.0;
      }
      nextQueenStatus = 'on_board';
      queenReturnedToCenter = true;
    }

    // 2. Penalty piece: Return 1 of shooter's pocketed pieces to center circle
    const pocketedOwnPieces = updatedPieces.filter(
      (p) => p.type === ownColor && p.isPocketed
    );

    if (pocketedOwnPieces.length > 0) {
      const pieceToReturn = pocketedOwnPieces[0];
      const spot = findSafeCenterSpot(updatedPieces);
      pieceToReturn.x = spot.x;
      pieceToReturn.y = spot.y;
      pieceToReturn.vx = 0;
      pieceToReturn.vy = 0;
      pieceToReturn.isPocketed = false;
      pieceToReturn.isFalling = false;
      pieceToReturn.fallScale = 1.0;
      pieceToReturn.fallAlpha = 1.0;
      penaltyReturned = ownColor;
    }

    // Striker always respawns on baseline for next turn
    const striker = updatedPieces.find((p) => p.type === 'striker');
    if (striker) {
      striker.isPocketed = false;
      striker.isFalling = false;
      striker.fallScale = 1.0;
      striker.fallAlpha = 1.0;
      striker.vx = 0;
      striker.vy = 0;
    }

    // Foul forfeits turn
    turnContinued = false;
    const nextPlayer: PlayerSide = shooter === 'player' ? 'bot' : 'player';

    return {
      shotResult: {
        pocketedPieces: pocketedInShot,
        isStrikerPocketed: true,
        foulReason,
        penaltyReturned,
        queenCovered: false,
        queenReturnedToCenter,
        turnContinued: false,
        winner: null,
      },
      nextQueenStatus,
      updatedPieces,
      nextPlayer,
    };
  }

  // Case B: Legal Shot (Striker not pocketed)
  const isQueenPendingForShooter =
    (shooter === 'player' && currentQueenStatus === 'pending_cover_player') ||
    (shooter === 'bot' && currentQueenStatus === 'pending_cover_bot');

  // 1. Queen handling
  if (isQueenPocketedInThisShot) {
    if (ownPocketedCount > 0) {
      // Sunk Queen AND own piece together in the same stroke -> Queen covered immediately!
      nextQueenStatus = shooter === 'player' ? 'covered_player' : 'covered_bot';
      queenCovered = true;
      turnContinued = true;
      carromAudio.playQueenCovered();
    } else {
      // Sunk Queen alone -> Pending cover! Shooter gets another shot to cover.
      nextQueenStatus = shooter === 'player' ? 'pending_cover_player' : 'pending_cover_bot';
      turnContinued = true;
    }
  } else if (isQueenPendingForShooter) {
    // Queen was pending cover prior to this shot
    if (ownPocketedCount > 0) {
      // Successfully covered Queen!
      nextQueenStatus = shooter === 'player' ? 'covered_player' : 'covered_bot';
      queenCovered = true;
      turnContinued = true;
      carromAudio.playQueenCovered();
    } else {
      // Failed to cover Queen! Queen returns to center circle, turn passes to opponent
      const q = updatedPieces.find((p) => p.type === 'queen');
      if (q) {
        const spot = findSafeCenterSpot(updatedPieces);
        q.x = spot.x;
        q.y = spot.y;
        q.vx = 0;
        q.vy = 0;
        q.isPocketed = false;
        q.isFalling = false;
        q.fallScale = 1.0;
        q.fallAlpha = 1.0;
      }
      nextQueenStatus = 'on_board';
      queenReturnedToCenter = true;
      turnContinued = false;
    }
  } else {
    // Normal turn: Pocketing own piece earns another shot
    if (ownPocketedCount > 0) {
      turnContinued = true;
    } else {
      turnContinued = false;
    }
  }

  // 2. Check for Winner
  let winner: PlayerSide | null = null;
  const remainingWhite = updatedPieces.filter((p) => p.type === 'white' && !p.isPocketed).length;
  const remainingBlack = updatedPieces.filter((p) => p.type === 'black' && !p.isPocketed).length;

  if (remainingWhite === 0 && (nextQueenStatus === 'covered_player' || nextQueenStatus === 'covered_bot')) {
    winner = 'player';
  } else if (remainingBlack === 0 && (nextQueenStatus === 'covered_player' || nextQueenStatus === 'covered_bot')) {
    winner = 'bot';
  }

  const nextPlayer: PlayerSide = turnContinued ? shooter : shooter === 'player' ? 'bot' : 'player';

  return {
    shotResult: {
      pocketedPieces: pocketedInShot,
      isStrikerPocketed: false,
      foulReason: null,
      penaltyReturned: null,
      queenCovered,
      queenReturnedToCenter,
      turnContinued,
      winner,
    },
    nextQueenStatus,
    updatedPieces,
    nextPlayer,
  };
}

/**
 * Clamps striker position within the legal baseline bounds.
 */
export function clampStrikerX(x: number): number {
  return Math.max(BASELINE_X_MIN, Math.min(BASELINE_X_MAX, x));
}

/**
 * Checks if a striker position along a baseline overlaps any active piece on the board.
 */
export function isStrikerPlacementLegal(
  x: number,
  y: number,
  pieces: Piece[]
): boolean {
  if (x < BASELINE_X_MIN || x > BASELINE_X_MAX) return false;

  for (const p of pieces) {
    if (p.isPocketed || p.type === 'striker') continue;
    const dx = p.x - x;
    const dy = p.y - y;
    const minDist = STRIKER_RADIUS + p.radius;
    if (dx * dx + dy * dy < minDist * minDist) {
      return false; // Overlaps a piece
    }
  }
  return true;
}

/**
 * Calculates a valid, non-overlapping striker X position along the baseline.
 * If the candidate position is blocked by an active piece, it smoothly clamps to
 * the nearest legal position without clipping through pieces.
 */
export function resolveLegalStrikerX(
  candidateX: number,
  baselineY: number,
  pieces: Piece[],
  currentX?: number
): number {
  const clampedX = clampStrikerX(candidateX);

  // If candidate is already completely legal and free of overlap, return it
  if (isStrikerPlacementLegal(clampedX, baselineY, pieces)) {
    return clampedX;
  }

  // Find all blocking pieces near the baseline
  const blockingPieces = pieces.filter((p) => {
    if (p.isPocketed || p.type === 'striker') return false;
    const dy = Math.abs(p.y - baselineY);
    const minDist = STRIKER_RADIUS + p.radius;
    return dy < minDist;
  });

  if (blockingPieces.length === 0) {
    return clampedX;
  }

  // If currentX was provided and moving toward a piece, stop at the piece's outer edge
  if (currentX !== undefined && currentX !== clampedX) {
    const movingRight = clampedX > currentX;
    let closestBoundaryX = clampedX;

    for (const p of blockingPieces) {
      const dy = p.y - baselineY;
      const minDist = STRIKER_RADIUS + p.radius;
      const xOffset = Math.sqrt(Math.max(0, minDist * minDist - dy * dy));
      const leftEdge = p.x - xOffset;
      const rightEdge = p.x + xOffset;

      if (movingRight && currentX <= leftEdge && clampedX > leftEdge) {
        closestBoundaryX = Math.min(closestBoundaryX, leftEdge - 0.5);
      } else if (!movingRight && currentX >= rightEdge && clampedX < rightEdge) {
        closestBoundaryX = Math.max(closestBoundaryX, rightEdge + 0.5);
      }
    }

    const testX = clampStrikerX(closestBoundaryX);
    if (isStrikerPlacementLegal(testX, baselineY, pieces)) {
      return testX;
    }
  }

  // Search locally around clampedX for the nearest open spot
  for (let delta = 1; delta <= 120; delta += 2) {
    const leftX = clampStrikerX(clampedX - delta);
    if (isStrikerPlacementLegal(leftX, baselineY, pieces)) {
      return leftX;
    }
    const rightX = clampStrikerX(clampedX + delta);
    if (isStrikerPlacementLegal(rightX, baselineY, pieces)) {
      return rightX;
    }
  }

  return currentX !== undefined ? currentX : clampedX;
}
