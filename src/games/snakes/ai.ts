import {
  calculateMove,
  getExpectedTurnsToFinish,
  estimateWinProbability,
  type MoveResult,
} from './engine';

export type BotTelemetry = {
  playerExpectedTurns: number;
  botExpectedTurns: number;
  playerWinPercent: number;
  botWinPercent: number;
  distanceToGoal: { player: number; bot: number };
  nearestLadders: number[];
  dangerousSnakes: number[];
};

/**
 * Generates real-time analytical telemetry for Hard, Expert, and Master difficulties
 */
export function generateTelemetry(playerSquare: number, botSquare: number): BotTelemetry {
  const playerExpected = getExpectedTurnsToFinish(playerSquare);
  const botExpected = getExpectedTurnsToFinish(botSquare);
  const playerWinPercent = estimateWinProbability(playerSquare, botSquare);

  return {
    playerExpectedTurns: playerExpected,
    botExpectedTurns: botExpected,
    playerWinPercent,
    botWinPercent: 100 - playerWinPercent,
    distanceToGoal: {
      player: Math.max(0, 100 - playerSquare),
      bot: Math.max(0, 100 - botSquare),
    },
    nearestLadders: [28, 51, 71].filter((sq) => sq > Math.max(playerSquare, botSquare)),
    dangerousSnakes: [87, 93, 95, 99].filter((sq) => sq > Math.max(playerSquare, botSquare)),
  };
}

/**
 * Rolls a fair 1-6 dice for the bot.
 * In Master difficulty, bot computes analytical move telemetry.
 */
export async function getBotRoll(
  currentSquare: number,
  level: number
): Promise<{ roll: number; moveResult: MoveResult; delayMs: number }> {
  // Fair physical dice roll (1 - 6)
  const roll = Math.floor(Math.random() * 6) + 1;
  const moveResult = calculateMove(currentSquare, roll);

  // Calibrated thinking delay based on bot level
  // Level 1: Quick (500ms)
  // Level 6: Thoughtful calculation delay (900ms)
  const baseDelay = 450 + level * 75;
  const jitter = Math.floor(Math.random() * 150);
  const delayMs = baseDelay + jitter;

  await new Promise((resolve) => setTimeout(resolve, delayMs));

  return { roll, moveResult, delayMs };
}
