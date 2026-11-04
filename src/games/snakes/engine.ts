export type BoardSquare = {
  number: number;
  row: number; // 0 (bottom) to 9 (top)
  col: number; // 0 (left) to 9 (right)
  xPercent: number; // center X percentage (5% to 95%)
  yPercent: number; // center Y percentage (5% to 95%, from top)
};

export type SnakeOrLadder = {
  from: number;
  to: number;
  type: 'ladder' | 'snake';
};

// Standard classic Snakes & Ladders mapping
export const LADDERS: Record<number, number> = {
  4: 14,
  9: 31,
  20: 38,
  28: 84,
  40: 59,
  51: 67,
  63: 81,
  71: 91,
};

export const SNAKES: Record<number, number> = {
  17: 7,
  54: 34,
  62: 19,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  99: 78,
};

export const ALL_SPECIALS: SnakeOrLadder[] = [
  ...Object.entries(LADDERS).map(([from, to]) => ({ from: Number(from), to, type: 'ladder' as const })),
  ...Object.entries(SNAKES).map(([from, to]) => ({ from: Number(from), to, type: 'snake' as const })),
];

/**
 * Returns grid row (0 at bottom, 9 at top) and col (0 at left, 9 at right)
 * Serpentine numbering:
 * Row 0: 1 -> 10 (L to R)
 * Row 1: 11 <- 20 (R to L)
 * Row 2: 21 -> 30 (L to R)
 * ...
 * Row 9: 91 <- 100 (R to L)
 */
export function getSquareCoordinates(square: number): BoardSquare {
  if (square < 1) square = 1;
  if (square > 100) square = 100;

  const zeroIndexed = square - 1;
  const rowFromBottom = Math.floor(zeroIndexed / 10);
  const remainder = zeroIndexed % 10;

  // Even rows go L-to-R (0, 2, 4, 6, 8)
  // Odd rows go R-to-L (1, 3, 5, 7, 9)
  const col = rowFromBottom % 2 === 0 ? remainder : 9 - remainder;

  // In CSS / SVG, Y starts from top: 0% at top, 100% at bottom
  const rowFromTop = 9 - rowFromBottom;

  const xPercent = (col + 0.5) * 10;
  const yPercent = (rowFromTop + 0.5) * 10;

  return {
    number: square,
    row: rowFromBottom,
    col,
    xPercent,
    yPercent,
  };
}

export type MoveResult = {
  intermediateSquare: number; // square after dice roll before snake/ladder
  finalSquare: number; // square after snake/ladder or bounce
  jumpType: 'ladder' | 'snake' | null;
  jumpFrom: number | null;
  jumpTo: number | null;
  bounced: boolean;
  givesExtraTurn: boolean;
};

/**
 * Calculates square transition with bounce-back at 100 and snakes & ladders
 */
export function calculateMove(currentSquare: number, roll: number): MoveResult {
  const target = currentSquare + roll;
  let intermediate = target;
  let bounced = false;

  // Exact 100 bounce-back rule
  if (target > 100) {
    intermediate = 100 - (target - 100);
    bounced = true;
  }

  let finalSquare = intermediate;
  let jumpType: 'ladder' | 'snake' | null = null;
  let jumpFrom: number | null = null;
  let jumpTo: number | null = null;

  if (LADDERS[intermediate]) {
    jumpType = 'ladder';
    jumpFrom = intermediate;
    jumpTo = LADDERS[intermediate];
    finalSquare = jumpTo;
  } else if (SNAKES[intermediate]) {
    jumpType = 'snake';
    jumpFrom = intermediate;
    jumpTo = SNAKES[intermediate];
    finalSquare = jumpTo;
  }

  return {
    intermediateSquare: intermediate,
    finalSquare,
    jumpType,
    jumpFrom,
    jumpTo,
    bounced,
    givesExtraTurn: roll === 6,
  };
}

// ==========================================
// Markov Chain Analytical Expected Value
// Precalculated exact expected turns to win from each square (0..100)
// ==========================================

function computeMarkovExpectancies(): number[] {
  // Solve linear system: E[i] = 1 + (1/6) * sum_{d=1..6} E[next(i, d)] for i in 0..99, with E[100] = 0
  // Solved via value iteration
  const E = new Array(101).fill(25.0);
  E[100] = 0.0;

  for (let iter = 0; iter < 400; iter++) {
    for (let s = 99; s >= 0; s--) {
      let sumNext = 0;
      for (let roll = 1; roll <= 6; roll++) {
        const res = calculateMove(s, roll);
        sumNext += E[res.finalSquare];
      }
      E[s] = 1.0 + sumNext / 6.0;
    }
    E[100] = 0.0;
  }

  return E.map((val) => Number(val.toFixed(1)));
}

const EXPECTED_TURNS = computeMarkovExpectancies();

export function getExpectedTurnsToFinish(square: number): number {
  if (square >= 100) return 0;
  if (square < 0) square = 0;
  return EXPECTED_TURNS[square] || 25;
}

/**
 * Calculates win probability estimate for player relative to bot
 */
export function estimateWinProbability(playerSquare: number, botSquare: number): number {
  if (playerSquare >= 100) return 100;
  if (botSquare >= 100) return 0;

  const playerExpected = getExpectedTurnsToFinish(playerSquare);
  const botExpected = getExpectedTurnsToFinish(botSquare);

  // Logistic comparison based on difference in expected remaining turns
  const diff = botExpected - playerExpected; // Positive means player is ahead (closer to finish)
  const prob = 1 / (1 + Math.exp(-0.35 * diff));
  return Math.min(99, Math.max(1, Math.round(prob * 100)));
}
