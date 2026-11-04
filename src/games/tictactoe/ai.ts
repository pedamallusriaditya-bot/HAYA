import { checkWinner, getLegalMoves, type Board, type Player } from './engine';

export type BotDifficulty = 'easy' | 'medium' | 'hard';

export function getBotMove(board: Board, botPlayer: Player, difficulty: BotDifficulty): number {
  const legalMoves = getLegalMoves(board);
  if (legalMoves.length === 0) return -1;
  if (legalMoves.length === 9) {
    // If board is empty, pick center or corner
    const preferredFirstMoves = [4, 0, 2, 6, 8];
    return preferredFirstMoves[Math.floor(Math.random() * preferredFirstMoves.length)];
  }

  const humanPlayer: Player = botPlayer === 'X' ? 'O' : 'X';

  // 1. Easy: Random legal move
  if (difficulty === 'easy') {
    const randomIndex = Math.floor(Math.random() * legalMoves.length);
    return legalMoves[randomIndex];
  }

  // 2. Medium: Immediate win / Immediate block, otherwise 50% optimal
  if (difficulty === 'medium') {
    // Check immediate win
    for (const move of legalMoves) {
      board[move] = botPlayer;
      const { winner } = checkWinner(board);
      board[move] = null;
      if (winner === botPlayer) return move;
    }

    // Check immediate block
    for (const move of legalMoves) {
      board[move] = humanPlayer;
      const { winner } = checkWinner(board);
      board[move] = null;
      if (winner === humanPlayer) return move;
    }

    // Sometimes make a mistake (35% random)
    if (Math.random() < 0.35) {
      return legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }
  }

  // 3. Hard (Master): Unbeatable Minimax
  let bestScore = -Infinity;
  let bestMove = legalMoves[0];

  for (const move of legalMoves) {
    board[move] = botPlayer;
    const score = minimax(board, 0, false, botPlayer, humanPlayer, -Infinity, Infinity);
    board[move] = null;

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

function minimax(
  board: Board,
  depth: number,
  isMaximizing: boolean,
  botPlayer: Player,
  humanPlayer: Player,
  alpha: number,
  beta: number
): number {
  const { winner } = checkWinner(board);

  if (winner === botPlayer) return 10 - depth;
  if (winner === humanPlayer) return depth - 10;
  if (winner === 'draw') return 0;
  if (depth >= 6) return 0; // Practical depth bound

  const legalMoves = getLegalMoves(board);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of legalMoves) {
      board[move] = botPlayer;
      const evaluation = minimax(board, depth + 1, false, botPlayer, humanPlayer, alpha, beta);
      board[move] = null;
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of legalMoves) {
      board[move] = humanPlayer;
      const evaluation = minimax(board, depth + 1, true, botPlayer, humanPlayer, alpha, beta);
      board[move] = null;
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}
