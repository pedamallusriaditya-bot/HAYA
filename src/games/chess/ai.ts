import { Chess } from 'chess.js';
import { stockfishEngine } from './stockfishWorker';
import { getFallbackMove } from './fallbackAi';

export type ChessDifficultyConfig = {
  level: number;
  stockfishSkill: number; // 0 to 20
  depth: number;
  movetimeMs: number;
  blunderRate: number; // For low tiers
  minDelayMs: number;
  maxDelayMs: number;
};

export const CHESS_ENGINE_CONFIGS: Record<number, ChessDifficultyConfig> = {
  1: { level: 1, stockfishSkill: 0, depth: 1, movetimeMs: 150, blunderRate: 0.45, minDelayMs: 400, maxDelayMs: 650 },
  2: { level: 2, stockfishSkill: 1, depth: 2, movetimeMs: 250, blunderRate: 0.25, minDelayMs: 400, maxDelayMs: 700 },
  3: { level: 3, stockfishSkill: 3, depth: 3, movetimeMs: 350, blunderRate: 0.10, minDelayMs: 450, maxDelayMs: 750 },
  4: { level: 4, stockfishSkill: 6, depth: 4, movetimeMs: 450, blunderRate: 0.00, minDelayMs: 500, maxDelayMs: 800 },
  5: { level: 5, stockfishSkill: 9, depth: 6, movetimeMs: 600, blunderRate: 0.00, minDelayMs: 500, maxDelayMs: 850 },
  6: { level: 6, stockfishSkill: 12, depth: 8, movetimeMs: 750, blunderRate: 0.00, minDelayMs: 550, maxDelayMs: 900 },
  7: { level: 7, stockfishSkill: 15, depth: 10, movetimeMs: 900, blunderRate: 0.00, minDelayMs: 600, maxDelayMs: 950 },
  8: { level: 8, stockfishSkill: 18, depth: 12, movetimeMs: 1050, blunderRate: 0.00, minDelayMs: 650, maxDelayMs: 1050 },
  9: { level: 9, stockfishSkill: 20, depth: 14, movetimeMs: 1200, blunderRate: 0.00, minDelayMs: 700, maxDelayMs: 1150 },
  10: { level: 10, stockfishSkill: 20, depth: 18, movetimeMs: 1400, blunderRate: 0.00, minDelayMs: 750, maxDelayMs: 1300 },
};

/**
 * Computes the bot's move using Stockfish Web Worker with fallback to local Minimax.
 */
export async function getBotChessMove(
  chess: Chess,
  level: number
): Promise<{ from: string; to: string; promotion?: string } | null> {
  const config = CHESS_ENGINE_CONFIGS[level] || CHESS_ENGINE_CONFIGS[3];
  const fen = chess.fen();
  const legalMoves = chess.moves({ verbose: true });
  if (legalMoves.length === 0) return null;

  const startTime = Date.now();

  // Try Stockfish Web Worker
  let selectedMove: { from: string; to: string; promotion?: string } | null = null;

  // If low tier has a random blunder roll, pick a legal random move
  if (config.blunderRate > 0 && Math.random() < config.blunderRate) {
    const randomLegal = legalMoves[Math.floor(Math.random() * legalMoves.length)];
    selectedMove = {
      from: randomLegal.from,
      to: randomLegal.to,
      promotion: randomLegal.promotion,
    };
  } else {
    try {
      const uciMove = await stockfishEngine.getBestMove(
        fen,
        config.stockfishSkill,
        config.depth,
        config.movetimeMs
      );

      if (uciMove && uciMove.length >= 4) {
        const from = uciMove.slice(0, 2);
        const to = uciMove.slice(2, 4);
        const promotion = uciMove.length > 4 ? uciMove.slice(4, 5) : undefined;

        // Verify the move is legal in current position
        const isLegal = legalMoves.some(
          (m) => m.from === from && m.to === to && (!promotion || m.promotion === promotion)
        );

        if (isLegal) {
          selectedMove = { from, to, promotion };
        }
      }
    } catch (err) {
      console.warn('[Chess Bot] Stockfish move error, using fallback:', err);
    }

    // Fallback if Stockfish was unavailable or timed out
    if (!selectedMove) {
      const fallbackDepth = Math.min(3, Math.max(1, Math.floor(config.depth / 3)));
      const fallback = getFallbackMove(chess, fallbackDepth, config.blunderRate);
      if (fallback) {
        selectedMove = {
          from: fallback.from,
          to: fallback.to,
          promotion: fallback.promotion,
        };
      } else {
        const randomLegal = legalMoves[0];
        selectedMove = {
          from: randomLegal.from,
          to: randomLegal.to,
          promotion: randomLegal.promotion,
        };
      }
    }
  }

  // Ensure natural thinking delay
  const elapsed = Date.now() - startTime;
  const targetDelay = Math.floor(
    config.minDelayMs + Math.random() * (config.maxDelayMs - config.minDelayMs)
  );

  if (elapsed < targetDelay) {
    await new Promise((resolve) => setTimeout(resolve, targetDelay - elapsed));
  }

  return selectedMove;
}
