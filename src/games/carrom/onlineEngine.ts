import {
  BOARD_SIZE,
  BASELINE_X_MIN,
  BASELINE_X_MAX,
  BASELINE_Y_PLAYER,
} from './physics.ts';
import type {
  Piece,
  PieceType,
  PlayerSide,
  QueenStatus,
  CarromScore,
} from './types.ts';
import {
  createInitialBoard,
  calculateScore,
} from './engine.ts';

export type SerializedPiece = {
  id: number;
  type: PieceType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isPocketed: boolean;
  isFalling: boolean;
  fallScale: number;
  fallAlpha: number;
};

export type CarromShotPayload = {
  position: { x: number; y: number };
  angle: number;
  power: number;
  seq: number;
};

export type CarromSnapshot = {
  seq: number;
  pieces: SerializedPiece[];
  pocketedThisShotIds: number[];
  scores: CarromScore;
  queenStatus: QueenStatus;
  nextTurn: PlayerSide;
  winner: PlayerSide | null;
  notification: string;
};

export function serializePieces(pieces: Piece[]): SerializedPiece[] {
  return pieces.map((p) => ({
    id: p.id,
    type: p.type,
    x: Math.round(p.x * 100) / 100,
    y: Math.round(p.y * 100) / 100,
    vx: Math.round(p.vx * 100) / 100,
    vy: Math.round(p.vy * 100) / 100,
    isPocketed: p.isPocketed,
    isFalling: p.isFalling,
    fallScale: p.fallScale,
    fallAlpha: p.fallAlpha,
  }));
}

export function applyPieceSnapshot(targetPieces: Piece[], snapshot: SerializedPiece[]): Piece[] {
  const map = new Map<number, SerializedPiece>();
  for (const s of snapshot) {
    map.set(s.id, s);
  }

  for (const p of targetPieces) {
    const s = map.get(p.id);
    if (s) {
      p.x = s.x;
      p.y = s.y;
      p.vx = s.vx;
      p.vy = s.vy;
      p.isPocketed = s.isPocketed;
      p.isFalling = s.isFalling;
      p.fallScale = s.fallScale;
      p.fallAlpha = s.fallAlpha;
    }
  }

  return targetPieces;
}

export function flipCoordinates(x: number, y: number): { x: number; y: number } {
  return {
    x: BOARD_SIZE - x,
    y: BOARD_SIZE - y,
  };
}

export function flipAngle(angle: number): number {
  let a = angle + Math.PI;
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

export function flipStrikerShot(
  position: { x: number; y: number },
  angle: number
): { position: { x: number; y: number }; angle: number } {
  return {
    position: flipCoordinates(position.x, position.y),
    angle: flipAngle(angle),
  };
}

export function isLegalShot(
  position: { x: number; y: number },
  power: number,
  expectedY: number = BASELINE_Y_PLAYER
): boolean {
  if (position.x < BASELINE_X_MIN || position.x > BASELINE_X_MAX) return false;
  if (Math.abs(position.y - expectedY) > 5) return false;
  if (power < 100 || power > 2500) return false;
  return true;
}

export function shouldAdoptSnapshot(currentSeq: number, incomingSeq: number): boolean {
  return incomingSeq > currentSeq;
}

export function createInitialOnlineCarromState(startingPlayer: PlayerSide = 'player') {
  const pieces = createInitialBoard(startingPlayer);
  const queenStatus: QueenStatus = 'on_board';
  const scores = calculateScore(pieces, queenStatus);

  return {
    pieces,
    currentTurn: startingPlayer,
    queenStatus,
    scores,
    lastAppliedSeq: 0,
    winner: null as PlayerSide | null,
    notification: 'White breaks first. Position striker along baseline, then tap Aim Shot.',
  };
}
