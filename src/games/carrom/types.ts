export type PieceType = 'white' | 'black' | 'queen' | 'striker';

export interface Piece {
  id: number;
  type: PieceType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
  isPocketed: boolean;
  isFalling: boolean;
  fallScale: number;
  fallAlpha: number;
}

export interface Pocket {
  id: number;
  x: number;
  y: number;
  radius: number;
}

export type PlayerSide = 'player' | 'bot'; // Player is White (breaks first), Bot is Black

export type QueenStatus =
  | 'on_board'
  | 'pending_cover_player'
  | 'pending_cover_bot'
  | 'covered_player'
  | 'covered_bot';

export type TurnPhase =
  | 'placement'     // Player/Bot choosing striker baseline position
  | 'aiming'        // Setting aim angle and strike power
  | 'shooting'      // Shot impulse released
  | 'settling'      // Physics simulation running until pieces settle
  | 'game_over';

export interface ShotResult {
  pocketedPieces: Piece[];
  isStrikerPocketed: boolean;
  foulReason: string | null;
  penaltyReturned: PieceType | null;
  queenCovered: boolean;
  queenReturnedToCenter: boolean;
  turnContinued: boolean;
  winner: PlayerSide | null;
}

export interface CarromScore {
  playerScore: number;
  botScore: number;
  remainingWhite: number;
  remainingBlack: number;
  playerPiecesPocketed: number;
  botPiecesPocketed: number;
  queenHolder: PlayerSide | null;
}

export interface BotDecision {
  baselineX: number;
  aimAngle: number;   // In radians
  power: number;      // Impulse magnitude
  targetPieceId: number | null;
  targetPocketId: number | null;
}

