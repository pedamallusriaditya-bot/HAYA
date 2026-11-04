// 2048 engine: pure functions for grid logic. 0 = empty.

export type Grid = number[][];
export const SIZE = 4;

export function emptyGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

/**
 * Adds one new tile (90% chance of 2, 10% chance of 4) to a random empty cell.
 * If no empty cell exists, returns a clone of the grid unchanged.
 */
export function addRandomTile(grid: Grid): Grid {
  const empties: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) empties.push([r, c]);
    }
  }
  if (empties.length === 0) return grid.map((r) => [...r]);
  const [r, c] = empties[Math.floor(Math.random() * empties.length)];
  const next = grid.map((row) => [...row]);
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

export function spawnInitial(): Grid {
  return addRandomTile(addRandomTile(emptyGrid()));
}

export type LineProcessResult = {
  line: number[];
  scoreGained: number;
  mergedIndices: number[];
};

/**
 * Processes a single line of length SIZE towards index 0 (destination edge).
 * Tiles slide towards index 0, and identical adjacent tiles merge once.
 */
export function processLine(line: number[]): LineProcessResult {
  const nonZero = line.filter((v) => v !== 0);
  const result: number[] = [];
  const mergedIndices: number[] = [];
  let scoreGained = 0;

  for (let i = 0; i < nonZero.length; i++) {
    if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
      const mergedVal = nonZero[i] * 2;
      mergedIndices.push(result.length);
      result.push(mergedVal);
      scoreGained += mergedVal;
      i++; // Skip next tile because it merged
    } else {
      result.push(nonZero[i]);
    }
  }

  while (result.length < SIZE) {
    result.push(0);
  }

  return { line: result, scoreGained, mergedIndices };
}

export type Move = 'left' | 'right' | 'up' | 'down';
export type MoveResult = {
  grid: Grid;
  gained: number;
  moved: boolean;
};

/**
 * Executes a move in the given direction.
 * Every direction extracts lines towards its destination wall, processes with processLine,
 * and writes back without in-place mutation.
 */
export function move(grid: Grid, dir: Move): MoveResult {
  const nextGrid = emptyGrid();
  let gained = 0;

  if (dir === 'left') {
    for (let r = 0; r < SIZE; r++) {
      const line = [grid[r][0], grid[r][1], grid[r][2], grid[r][3]];
      const res = processLine(line);
      gained += res.scoreGained;
      for (let c = 0; c < SIZE; c++) {
        nextGrid[r][c] = res.line[c];
      }
    }
  } else if (dir === 'right') {
    for (let r = 0; r < SIZE; r++) {
      // Extract from right to left (col 3 down to 0)
      const line = [grid[r][3], grid[r][2], grid[r][1], grid[r][0]];
      const res = processLine(line);
      gained += res.scoreGained;
      for (let c = 0; c < SIZE; c++) {
        nextGrid[r][3 - c] = res.line[c];
      }
    }
  } else if (dir === 'up') {
    for (let c = 0; c < SIZE; c++) {
      // Extract from top to bottom (row 0 to 3)
      const line = [grid[0][c], grid[1][c], grid[2][c], grid[3][c]];
      const res = processLine(line);
      gained += res.scoreGained;
      for (let r = 0; r < SIZE; r++) {
        nextGrid[r][c] = res.line[r];
      }
    }
  } else if (dir === 'down') {
    for (let c = 0; c < SIZE; c++) {
      // Extract from bottom to top (row 3 down to 0)
      const line = [grid[3][c], grid[2][c], grid[1][c], grid[0][c]];
      const res = processLine(line);
      gained += res.scoreGained;
      for (let r = 0; r < SIZE; r++) {
        nextGrid[3 - r][c] = res.line[r];
      }
    }
  }

  // Check if grid actually changed
  let moved = false;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] !== nextGrid[r][c]) {
        moved = true;
        break;
      }
    }
    if (moved) break;
  }

  return { grid: nextGrid, gained, moved };
}

export function canMove(grid: Grid): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) return true;
      if (c + 1 < SIZE && grid[r][c] === grid[r][c + 1]) return true;
      if (r + 1 < SIZE && grid[r][c] === grid[r + 1][c]) return true;
    }
  }
  return false;
}

export function hasWon(grid: Grid): boolean {
  return grid.some((row) => row.includes(2048));
}
