import {
  COLS,
  ROWS,
  dropPiece,
  undoDropPiece,
  getLegalColumns,
  checkWinner,
  type Connect4Board,
  type Connect4Piece,
} from './engine';

// Center-first column ordering for high-performance alpha-beta pruning
const COLUMN_ORDER = [3, 2, 4, 1, 5, 0, 6];

// Positional weight matrix favoring center column and strategic heights
const POSITION_TABLE = [
  [3, 4, 5, 7, 5, 4, 3],
  [4, 6, 8, 10, 8, 6, 4],
  [5, 8, 11, 13, 11, 8, 5],
  [5, 8, 11, 13, 11, 8, 5],
  [4, 6, 8, 10, 8, 6, 4],
  [3, 4, 5, 7, 5, 4, 3],
];

// Transposition table for Impossible difficulty
const transpositionTable = new Map<string, { depth: number; score: number }>();

function boardToKey(board: Connect4Board, turn: Connect4Piece): string {
  let key = turn + ':';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      key += board[r][c] || '.';
    }
  }
  return key;
}

function evaluateWindow(window: (Connect4Piece | null)[], piece: Connect4Piece, opponent: Connect4Piece): number {
  let score = 0;
  let pieceCount = 0;
  let opponentCount = 0;
  let emptyCount = 0;

  for (const cell of window) {
    if (cell === piece) pieceCount++;
    else if (cell === opponent) opponentCount++;
    else emptyCount++;
  }

  if (pieceCount === 4) {
    score += 10000;
  } else if (pieceCount === 3 && emptyCount === 1) {
    score += 100;
  } else if (pieceCount === 2 && emptyCount === 2) {
    score += 10;
  }

  if (opponentCount === 3 && emptyCount === 1) {
    score -= 120; // Strongly penalize opponent 3-in-a-row
  } else if (opponentCount === 2 && emptyCount === 2) {
    score -= 15;
  }

  return score;
}

function evaluateBoard(board: Connect4Board, piece: Connect4Piece): number {
  const opponent: Connect4Piece = piece === 'R' ? 'Y' : 'R';
  let score = 0;

  // 1. Positional Table Evaluation
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] === piece) {
        score += POSITION_TABLE[r][c];
      } else if (board[r][c] === opponent) {
        score -= POSITION_TABLE[r][c];
      }
    }
  }

  // 2. Horizontal Windows
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const window = [board[r][c], board[r][c + 1], board[r][c + 2], board[r][c + 3]];
      score += evaluateWindow(window, piece, opponent);
    }
  }

  // 3. Vertical Windows
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c < COLS; c++) {
      const window = [board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]];
      score += evaluateWindow(window, piece, opponent);
    }
  }

  // 4. Diagonal Down-Right (\)
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const window = [board[r][c], board[r + 1][c + 1], board[r + 2][c + 2], board[r + 3][c + 3]];
      score += evaluateWindow(window, piece, opponent);
    }
  }

  // 5. Diagonal Up-Right (/)
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const window = [board[r][c], board[r - 1][c + 1], board[r - 2][c + 2], board[r - 3][c + 3]];
      score += evaluateWindow(window, piece, opponent);
    }
  }

  return score;
}

function minimax(
  board: Connect4Board,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  botPiece: Connect4Piece,
  humanPiece: Connect4Piece,
  useTransposition: boolean = false
): number {
  const result = checkWinner(board);
  if (result.winner === botPiece) return 50000 + depth;
  if (result.winner === humanPiece) return -50000 - depth;
  if (result.winner === 'draw') return 0;
  if (depth === 0) return evaluateBoard(board, botPiece);

  const key = useTransposition ? boardToKey(board, isMaximizing ? botPiece : humanPiece) : '';
  if (useTransposition) {
    const cached = transpositionTable.get(key);
    if (cached && cached.depth >= depth) {
      return cached.score;
    }
  }

  const legalMoves = COLUMN_ORDER.filter((col) => board[0][col] === null);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const col of legalMoves) {
      dropPiece(board, col, botPiece);
      const evaluation = minimax(board, depth - 1, alpha, beta, false, botPiece, humanPiece, useTransposition);
      undoDropPiece(board, col);
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break;
    }
    if (useTransposition && transpositionTable.size < 50000) {
      transpositionTable.set(key, { depth, score: maxEval });
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const col of legalMoves) {
      dropPiece(board, col, humanPiece);
      const evaluation = minimax(board, depth - 1, alpha, beta, true, botPiece, humanPiece, useTransposition);
      undoDropPiece(board, col);
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break;
    }
    if (useTransposition && transpositionTable.size < 50000) {
      transpositionTable.set(key, { depth, score: minEval });
    }
    return minEval;
  }
}

/**
 * Returns the best move for the bot based on the selected difficulty tier.
 */
export async function getConnect4BotMove(
  board: Connect4Board,
  botPiece: Connect4Piece,
  tierLevel: number // 1 to 6
): Promise<number> {
  const legalCols = getLegalColumns(board);
  if (legalCols.length === 0) return -1;
  if (legalCols.length === 1) return legalCols[0];

  const humanPiece: Connect4Piece = botPiece === 'R' ? 'Y' : 'R';
  const startTime = Date.now();

  let chosenCol = legalCols[0];

  // 1. Beginner (Level 1): Mostly heuristic with 40% blunder
  if (tierLevel === 1) {
    if (Math.random() < 0.45) {
      chosenCol = legalCols[Math.floor(Math.random() * legalCols.length)];
    } else {
      // Pick center or near-center
      const ordered = COLUMN_ORDER.filter((c) => legalCols.includes(c));
      chosenCol = ordered[Math.floor(Math.random() * Math.min(3, ordered.length))];
    }
  }

  // 2. Easy (Level 2): Takes immediate winning moves, otherwise misses multi-step threats
  else if (tierLevel === 2) {
    // Check immediate win
    for (const col of legalCols) {
      dropPiece(board, col, botPiece);
      const { winner } = checkWinner(board);
      undoDropPiece(board, col);
      if (winner === botPiece) {
        chosenCol = col;
        break;
      }
    }
    if (chosenCol === legalCols[0]) {
      // 35% random, otherwise pick best shallow column
      if (Math.random() < 0.35) {
        chosenCol = legalCols[Math.floor(Math.random() * legalCols.length)];
      } else {
        const ordered = COLUMN_ORDER.filter((c) => legalCols.includes(c));
        chosenCol = ordered[0];
      }
    }
  }

  // 3. Normal (Level 3): Takes immediate win & blocks immediate player win
  else if (tierLevel === 3) {
    let found = false;

    // Check immediate win
    for (const col of legalCols) {
      dropPiece(board, col, botPiece);
      const { winner } = checkWinner(board);
      undoDropPiece(board, col);
      if (winner === botPiece) {
        chosenCol = col;
        found = true;
        break;
      }
    }

    // Check immediate block
    if (!found) {
      for (const col of legalCols) {
        dropPiece(board, col, humanPiece);
        const { winner } = checkWinner(board);
        undoDropPiece(board, col);
        if (winner === humanPiece) {
          chosenCol = col;
          found = true;
          break;
        }
      }
    }

    if (!found) {
      // 2-ply shallow search
      let bestScore = -Infinity;
      for (const col of COLUMN_ORDER.filter((c) => legalCols.includes(c))) {
        dropPiece(board, col, botPiece);
        const score = minimax(board, 2, -Infinity, Infinity, false, botPiece, humanPiece);
        undoDropPiece(board, col);
        if (score > bestScore) {
          bestScore = score;
          chosenCol = col;
        }
      }
    }
  }

  // 4. Hard (Level 4): Minimax with Alpha-Beta at Depth 4
  else if (tierLevel === 4) {
    let bestScore = -Infinity;
    for (const col of COLUMN_ORDER.filter((c) => legalCols.includes(c))) {
      dropPiece(board, col, botPiece);
      const score = minimax(board, 4, -Infinity, Infinity, false, botPiece, humanPiece);
      undoDropPiece(board, col);
      if (score > bestScore) {
        bestScore = score;
        chosenCol = col;
      }
    }
  }

  // 5. Expert (Level 5): Minimax with Alpha-Beta at Depth 6
  else if (tierLevel === 5) {
    let bestScore = -Infinity;
    for (const col of COLUMN_ORDER.filter((c) => legalCols.includes(c))) {
      dropPiece(board, col, botPiece);
      const score = minimax(board, 6, -Infinity, Infinity, false, botPiece, humanPiece);
      undoDropPiece(board, col);
      if (score > bestScore) {
        bestScore = score;
        chosenCol = col;
      }
    }
  }

  // 6. Impossible (Level 6): Alpha-Beta with Transposition Table at Depth 8+
  else {
    transpositionTable.clear();
    let bestScore = -Infinity;
    for (const col of COLUMN_ORDER.filter((c) => legalCols.includes(c))) {
      dropPiece(board, col, botPiece);
      const score = minimax(board, 8, -Infinity, Infinity, false, botPiece, humanPiece, true);
      undoDropPiece(board, col);
      if (score > bestScore) {
        bestScore = score;
        chosenCol = col;
      }
    }
  }

  // Natural thinking delay (350ms to 650ms)
  const elapsed = Date.now() - startTime;
  const targetDelay = 350 + Math.floor(Math.random() * 250);
  if (elapsed < targetDelay) {
    await new Promise((resolve) => setTimeout(resolve, targetDelay - elapsed));
  }

  return chosenCol;
}
