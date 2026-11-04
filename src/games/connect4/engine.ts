export type Connect4Piece = 'R' | 'Y'; // 'R' = Red (Player), 'Y' = Yellow (Bot)
export type Cell = Connect4Piece | null;
export type Connect4Board = Cell[][]; // 6 rows x 7 cols

export const ROWS = 6;
export const COLS = 7;

export type WinningLine = [number, number][]; // 4 [row, col] coordinates

export type CheckWinnerResult = {
  winner: Connect4Piece | 'draw' | null;
  winningLine: WinningLine | null;
};

export function createEmptyBoard(): Connect4Board {
  const board: Connect4Board = [];
  for (let r = 0; r < ROWS; r++) {
    board.push(new Array(COLS).fill(null));
  }
  return board;
}

export function cloneBoard(board: Connect4Board): Connect4Board {
  return board.map((row) => [...row]);
}

export function isColumnFull(board: Connect4Board, col: number): boolean {
  if (col < 0 || col >= COLS) return true;
  return board[0][col] !== null;
}

export function getLegalColumns(board: Connect4Board): number[] {
  const legal: number[] = [];
  for (let c = 0; c < COLS; c++) {
    if (board[0][c] === null) {
      legal.push(c);
    }
  }
  return legal;
}

/**
 * Drops a piece in the given column.
 * Returns the landing row, or -1 if the column is full.
 */
export function dropPiece(board: Connect4Board, col: number, piece: Connect4Piece): number {
  if (col < 0 || col >= COLS || board[0][col] !== null) {
    return -1;
  }

  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === null) {
      board[r][col] = piece;
      return r;
    }
  }
  return -1;
}

/**
 * Removes the top piece from a column (for search backtracking).
 */
export function undoDropPiece(board: Connect4Board, col: number): void {
  for (let r = 0; r < ROWS; r++) {
    if (board[r][col] !== null) {
      board[r][col] = null;
      return;
    }
  }
}

export function checkWinner(board: Connect4Board): CheckWinnerResult {
  // 1. Horizontal Check
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const piece = board[r][c];
      if (
        piece &&
        piece === board[r][c + 1] &&
        piece === board[r][c + 2] &&
        piece === board[r][c + 3]
      ) {
        return {
          winner: piece,
          winningLine: [
            [r, c],
            [r, c + 1],
            [r, c + 2],
            [r, c + 3],
          ],
        };
      }
    }
  }

  // 2. Vertical Check
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c < COLS; c++) {
      const piece = board[r][c];
      if (
        piece &&
        piece === board[r + 1][c] &&
        piece === board[r + 2][c] &&
        piece === board[r + 3][c]
      ) {
        return {
          winner: piece,
          winningLine: [
            [r, c],
            [r + 1, c],
            [r + 2, c],
            [r + 3, c],
          ],
        };
      }
    }
  }

  // 3. Diagonal Down-Right Check (\)
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const piece = board[r][c];
      if (
        piece &&
        piece === board[r + 1][c + 1] &&
        piece === board[r + 2][c + 2] &&
        piece === board[r + 3][c + 3]
      ) {
        return {
          winner: piece,
          winningLine: [
            [r, c],
            [r + 1, c + 1],
            [r + 2, c + 2],
            [r + 3, c + 3],
          ],
        };
      }
    }
  }

  // 4. Diagonal Up-Right Check (/)
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const piece = board[r][c];
      if (
        piece &&
        piece === board[r - 1][c + 1] &&
        piece === board[r - 2][c + 2] &&
        piece === board[r - 3][c + 3]
      ) {
        return {
          winner: piece,
          winningLine: [
            [r, c],
            [r - 1, c + 1],
            [r - 2, c + 2],
            [r - 3, c + 3],
          ],
        };
      }
    }
  }

  // 5. Draw Check (top row all filled)
  let isFull = true;
  for (let c = 0; c < COLS; c++) {
    if (board[0][c] === null) {
      isFull = false;
      break;
    }
  }

  if (isFull) {
    return { winner: 'draw', winningLine: null };
  }

  return { winner: null, winningLine: null };
}
