export type LudoColor = 'red' | 'green' | 'yellow' | 'blue';

export type Token = {
  id: number; // 0, 1, 2, 3
  step: number; // -1 = Yard, 0..50 = Common track, 51..55 = Home stretch, 56 = Home
};

export type PlayerState = {
  color: LudoColor;
  name: string;
  isBot: boolean;
  tokens: Token[];
  startTrackIndex: number;
};

export const TRACK_LENGTH = 52;
export const HOME_STRETCH_START = 51;
export const GOAL_STEP = 56;

// Safe squares on the 52-tile common track (Standard 8 safe star squares)
export const SAFE_TRACK_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// Starting track indices for all four colors spaced exactly 13 tiles apart
export const COLOR_START_OFFSETS: Record<LudoColor, number> = {
  red: 0,
  yellow: 13,
  green: 26,
  blue: 39,
};

// Home stretch track paths for each of the 4 colors (steps 51..55)
export const HOME_STRETCHES: Record<LudoColor, [number, number][]> = {
  red: [
    [7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6],
  ],
  yellow: [
    [13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7],
  ],
  green: [
    [7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8],
  ],
  blue: [
    [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7],
  ],
};

export function createInitialTokens(): Token[] {
  return [
    { id: 0, step: -1 },
    { id: 1, step: -1 },
    { id: 2, step: -1 },
    { id: 3, step: -1 },
  ];
}

/**
 * Maps a token's internal step (0..50) to the board's 0..51 global track coordinate.
 */
export function getTrackCoordinate(color: LudoColor, step: number): number | null {
  if (step < 0 || step >= HOME_STRETCH_START) return null;
  const startOffset = COLOR_START_OFFSETS[color];
  return (startOffset + step) % TRACK_LENGTH;
}

export function isTokenSafe(color: LudoColor, step: number): boolean {
  if (step === -1) return true; // Safe in yard
  if (step >= HOME_STRETCH_START) return true; // Safe in home stretch & goal
  const trackCoord = getTrackCoordinate(color, step);
  if (trackCoord === null) return true;
  return SAFE_TRACK_INDICES.has(trackCoord);
}

export function getLegalMoves(player: PlayerState, diceRoll: number): number[] {
  const legalTokenIds: number[] = [];

  for (const token of player.tokens) {
    // 1. Token in Yard: Requires 6 to enter step 0
    if (token.step === -1) {
      if (diceRoll === 6) {
        legalTokenIds.push(token.id);
      }
      continue;
    }

    // 2. Token already Home: cannot move
    if (token.step === GOAL_STEP) {
      continue;
    }

    // 3. Advancing on track or home stretch: exact reach up to 56
    const nextStep = token.step + diceRoll;
    if (nextStep <= GOAL_STEP) {
      legalTokenIds.push(token.id);
    }
  }

  return legalTokenIds;
}

export type MoveResult = {
  capturedOpponentTokenId: number | null;
  capturedOpponentColor: LudoColor | null;
  reachedHome: boolean;
  givesExtraTurn: boolean;
};

/**
 * Executes a token move for the current player, checking for captures against ALL opponents.
 */
export function executeMove(
  player: PlayerState,
  opponents: PlayerState | PlayerState[],
  tokenId: number,
  diceRoll: number
): MoveResult {
  const token = player.tokens.find((t) => t.id === tokenId);
  if (!token) {
    return {
      capturedOpponentTokenId: null,
      capturedOpponentColor: null,
      reachedHome: false,
      givesExtraTurn: false,
    };
  }

  // Release from yard on a 6
  if (token.step === -1 && diceRoll === 6) {
    token.step = 0;
  } else {
    token.step += diceRoll;
  }

  const reachedHome = token.step === GOAL_STEP;
  let capturedTokenId: number | null = null;
  let capturedOpponentColor: LudoColor | null = null;

  // Check capture if on common track and not on safe square
  if (token.step >= 0 && token.step < HOME_STRETCH_START) {
    const landingCoord = getTrackCoordinate(player.color, token.step);

    if (landingCoord !== null && !SAFE_TRACK_INDICES.has(landingCoord)) {
      const oppList = Array.isArray(opponents) ? opponents : [opponents];

      for (const opp of oppList) {
        if (opp.color === player.color) continue;
        for (const oppToken of opp.tokens) {
          if (oppToken.step >= 0 && oppToken.step < HOME_STRETCH_START) {
            const oppCoord = getTrackCoordinate(opp.color, oppToken.step);
            if (oppCoord === landingCoord) {
              // Captured! Send back to yard
              oppToken.step = -1;
              capturedTokenId = oppToken.id;
              capturedOpponentColor = opp.color;
              break;
            }
          }
        }
        if (capturedTokenId !== null) break;
      }
    }
  }

  // Extra turn if: rolled 6, captured an opponent token, or reached home
  const givesExtraTurn = diceRoll === 6 || capturedTokenId !== null || reachedHome;

  return {
    capturedOpponentTokenId: capturedTokenId,
    capturedOpponentColor,
    reachedHome,
    givesExtraTurn,
  };
}

export function hasPlayerWon(player: PlayerState): boolean {
  return player.tokens.every((t) => t.step === GOAL_STEP);
}

export function countTokensHome(player: PlayerState): number {
  return player.tokens.filter((t) => t.step === GOAL_STEP).length;
}

/**
 * Predictable, deterministic bot color assignment order:
 * Given a human color choice and number of bots (1, 2, or 3),
 * returns an array of unique colors for the bots.
 */
export function getBotColors(humanColor: LudoColor, botCount: 1 | 2 | 3): LudoColor[] {
  // Ordered sequence of colors
  // Classic 2-player opposite pairing: Red <-> Green, Yellow <-> Blue
  const oppositeMap: Record<LudoColor, LudoColor> = {
    red: 'green',
    green: 'red',
    yellow: 'blue',
    blue: 'yellow',
  };

  if (botCount === 1) {
    return [oppositeMap[humanColor]];
  }

  // For 2 or 3 bots: start with opposite color, then pick remaining colors clockwise
  const allColors: LudoColor[] = ['red', 'green', 'yellow', 'blue'];
  const remaining = allColors.filter((c) => c !== humanColor);

  // Put the opposite color first, then the other remaining colors
  const opp = oppositeMap[humanColor];
  const sorted = [opp, ...remaining.filter((c) => c !== opp)];

  return sorted.slice(0, botCount);
}
