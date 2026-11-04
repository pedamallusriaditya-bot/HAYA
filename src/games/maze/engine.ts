// Recursive-backtracking maze generator. Grid is (2*rows+1) x (2*cols+1);
// cells at even coords are walls, odd coords are passages. Start at (1,1),
// exit at the bottom-right cell.

export type Maze = {
  grid: boolean[][]; // true = wall, false = passage
  rows: number;
  cols: number;
  start: [number, number];
  exit: [number, number];
};

export type Difficulty = 'easy' | 'medium' | 'hard';

const SIZES: Record<Difficulty, { r: number; c: number }> = {
  easy: { r: 8, c: 8 },
  medium: { r: 12, c: 12 },
  hard: { r: 18, c: 18 },
};

export function generateMaze(difficulty: Difficulty): Maze {
  const { r, c } = SIZES[difficulty];
  const rows = 2 * r + 1;
  const cols = 2 * c + 1;
  const grid: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(true));

  const visited = Array.from({ length: r }, () => Array(c).fill(false));
  const stack: [number, number][] = [[0, 0]];
  visited[0][0] = true;
  grid[1][1] = false;

  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  while (stack.length) {
    const [cr, cc] = stack[stack.length - 1];
    const neighbors: [number, number, number, number][] = [];
    for (const [dr, dc] of dirs) {
      const nr = cr + dr;
      const nc = cc + dc;
      if (nr >= 0 && nr < r && nc >= 0 && nc < c && !visited[nr][nc]) {
        neighbors.push([nr, nc, cr, cc]);
      }
    }
    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }
    const [nr, nc, pr, pc] = neighbors[Math.floor(Math.random() * neighbors.length)];
    visited[nr][nc] = true;
    // carve wall between (pr,pc) and (nr,nc)
    grid[2 * nr + 1][2 * nc + 1] = false;
    grid[pr + nr + 1][pc + nc + 1] = false;
    stack.push([nr, nc]);
  }

  return {
    grid,
    rows,
    cols,
    start: [1, 1],
    exit: [2 * (r - 1) + 1, 2 * (c - 1) + 1],
  };
}
