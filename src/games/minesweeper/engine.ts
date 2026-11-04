// Minesweeper engine: board generation (after first click so first click is safe),
// flood reveal, adjacency counts, win/loss detection.

export type Difficulty = 'easy' | 'medium' | 'hard';

type Config = { rows: number; cols: number; mines: number };
export const CONFIG: Record<Difficulty, Config> = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 12, cols: 12, mines: 24 },
  hard: { rows: 16, cols: 16, mines: 45 },
};

export type Cell = {
  isMine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
};

export type Board = Cell[][];

function makeBoard(rows: number, cols: number): Board {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ isMine: false, revealed: false, flagged: false, adjacent: 0 }))
  );
}

function placeMines(board: Board, mines: number, safeR: number, safeC: number) {
  const rows = board.length;
  const cols = board[0].length;
  const forbidden = new Set<string>();
  // First-click cell + neighbors are safe.
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = safeR + dr;
      const c = safeC + dc;
      if (r >= 0 && r < rows && c >= 0 && c < cols) forbidden.add(`${r},${c}`);
    }
  }
  let placed = 0;
  while (placed < mines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (board[r][c].isMine || forbidden.has(`${r},${c}`)) continue;
    board[r][c].isMine = true;
    placed++;
  }
  // adjacency counts
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].isMine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].isMine) count++;
        }
      }
      board[r][c].adjacent = count;
    }
  }
}

export function createInitialBoard(difficulty: Difficulty): { board: Board; difficulty: Difficulty; started: boolean } {
  const cfg = CONFIG[difficulty];
  return { board: makeBoard(cfg.rows, cfg.cols), difficulty, started: false };
}

/** Place mines on a fresh board, keeping the first-click cell + neighbors safe. */
export function startBoard(board: Board, mines: number, safeR: number, safeC: number): Board {
  const next = board.map((row) => row.map((cell) => ({ ...cell, isMine: false, adjacent: 0 })));
  placeMines(next, mines, safeR, safeC);
  return next;
}

export function revealCell(board: Board, r: number, c: number): { board: Board; hitMine: boolean } {
  const rows = board.length;
  const cols = board[0].length;
  const next = board.map((row) => row.map((cell) => ({ ...cell })));
  const stack: [number, number][] = [[r, c]];
  let hitMine = false;

  while (stack.length) {
    const [cr, cc] = stack.pop()!;
    const cell = next[cr][cc];
    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    if (cell.isMine) {
      hitMine = true;
      continue;
    }
    if (cell.adjacent === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const nr = cr + dr;
          const nc = cc + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            if (!next[nr][nc].revealed && !next[nr][nc].flagged) stack.push([nr, nc]);
          }
        }
      }
    }
  }
  return { board: next, hitMine };
}

export function toggleFlag(board: Board, r: number, c: number): Board {
  return board.map((row, ri) =>
    row.map((cell, ci) =>
      ri === r && ci === c && !cell.revealed ? { ...cell, flagged: !cell.flagged } : cell
    )
  );
}

export function checkWin(board: Board): boolean {
  for (const row of board) {
    for (const cell of row) {
      if (!cell.isMine && !cell.revealed) return false;
    }
  }
  return true;
}

export function revealAllMines(board: Board): Board {
  return board.map((row) => row.map((cell) => (cell.isMine ? { ...cell, revealed: true } : cell)));
}
