// Sudoku puzzle generator + solver. Generates a full valid solution, then
// removes cells to create a puzzle of the requested difficulty.

type Board = number[][]; // 9x9, 0 = empty
export type { Board };

function empty(): Board {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isValid(b: Board, r: number, c: number, n: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (b[r][i] === n || b[i][c] === n) return false;
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (b[br + i][bc + j] === n) return false;
    }
  }
  return true;
}

function fill(b: Board): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (b[r][c] === 0) {
        for (const n of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
          if (isValid(b, r, c, n)) {
            b[r][c] = n;
            if (fill(b)) return true;
            b[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function countSolutions(b: Board, limit = 2): number {
  let count = 0;
  function recurse(): boolean {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (b[r][c] === 0) {
          for (let n = 1; n <= 9; n++) {
            if (isValid(b, r, c, n)) {
              b[r][c] = n;
              if (recurse()) {
                b[r][c] = 0;
                return true;
              }
              b[r][c] = 0;
            }
          }
          return false;
        }
      }
    }
    count++;
    return count >= limit;
  }
  recurse();
  return count;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

const removeCounts: Record<Difficulty, number> = {
  easy: 36,   // leave 45 clues
  medium: 48, // leave 33 clues
  hard: 56,   // leave 25 clues
};

export function generatePuzzle(difficulty: Difficulty): { puzzle: Board; solution: Board } {
  const solution = empty();
  fill(solution);
  const puzzle = solution.map((row) => [...row]);

  const positions = shuffle(Array.from({ length: 81 }, (_, i) => i));
  let removed = 0;
  for (const p of positions) {
    if (removed >= removeCounts[difficulty]) break;
    const r = Math.floor(p / 9);
    const c = p % 9;
    const backup = puzzle[r][c];
    if (backup === 0) continue;
    puzzle[r][c] = 0;
    // For easy/medium, ensure unique solution. For hard, skip uniqueness check
    // to allow deeper removal (still solvable, may have >1 solution).
    if (difficulty !== 'hard') {
      const copy = puzzle.map((row) => [...row]);
      if (countSolutions(copy) !== 1) {
        puzzle[r][c] = backup;
        continue;
      }
    }
    removed++;
  }
  return { puzzle, solution };
}

export function isSolved(board: Board, solution: Board): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== solution[r][c]) return false;
    }
  }
  return true;
}

export function findConflicts(board: Board): Set<string> {
  const bad = new Set<string>();
  // rows
  for (let r = 0; r < 9; r++) {
    const seen = new Map<number, number[]>();
    for (let c = 0; c < 9; c++) {
      const v = board[r][c];
      if (!v) continue;
      seen.set(v, (seen.get(v) ?? []).concat(c));
    }
    for (const cols of seen.values()) {
      if (cols.length > 1) cols.forEach((c) => bad.add(`${r},${c}`));
    }
  }
  // cols
  for (let c = 0; c < 9; c++) {
    const seen = new Map<number, number[]>();
    for (let r = 0; r < 9; r++) {
      const v = board[r][c];
      if (!v) continue;
      seen.set(v, (seen.get(v) ?? []).concat(r));
    }
    for (const rows of seen.values()) {
      if (rows.length > 1) rows.forEach((r) => bad.add(`${r},${c}`));
    }
  }
  // boxes
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const seen = new Map<number, [number, number][]>();
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const r = br * 3 + i;
          const c = bc * 3 + j;
          const v = board[r][c];
          if (!v) continue;
          seen.set(v, (seen.get(v) ?? []).concat([[r, c]]));
        }
      }
      for (const cells of seen.values()) {
        if (cells.length > 1) cells.forEach(([r, c]) => bad.add(`${r},${c}`));
      }
    }
  }
  return bad;
}
