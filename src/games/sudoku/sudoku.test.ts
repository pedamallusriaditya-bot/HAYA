import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generatePuzzle,
  isSolved,
  findConflicts,
  type Board,
} from './engine.ts';

function validateSudokuSolution(board: Board): boolean {
  // Check rows
  for (let r = 0; r < 9; r++) {
    const set = new Set<number>();
    for (let c = 0; c < 9; c++) {
      const v = board[r][c];
      if (v < 1 || v > 9 || set.has(v)) return false;
      set.add(v);
    }
  }

  // Check columns
  for (let c = 0; c < 9; c++) {
    const set = new Set<number>();
    for (let r = 0; r < 9; r++) {
      const v = board[r][c];
      if (v < 1 || v > 9 || set.has(v)) return false;
      set.add(v);
    }
  }

  // Check 3x3 boxes
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const set = new Set<number>();
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const v = board[br * 3 + i][bc * 3 + j];
          if (v < 1 || v > 9 || set.has(v)) return false;
          set.add(v);
        }
      }
    }
  }

  return true;
}

test('Sudoku: Generated puzzle and solution satisfy all Sudoku invariants', () => {
  const { puzzle, solution } = generatePuzzle('easy');

  // 1. Solution must be a completely valid 9x9 Sudoku
  assert.equal(solution.length, 9);
  assert.equal(solution[0].length, 9);
  assert.ok(validateSudokuSolution(solution), 'Generated solution must satisfy all row, column, and box constraints');

  // 2. Puzzle clues must match the solution
  let clueCount = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (puzzle[r][c] !== 0) {
        assert.equal(puzzle[r][c], solution[r][c], `Puzzle clue at (${r},${c}) must match solution`);
        clueCount++;
      }
    }
  }
  // Easy removes 36 clues -> leaves 45 clues
  assert.equal(clueCount, 45, 'Easy difficulty should have 45 clues');

  // 3. Solution check helper
  assert.equal(isSolved(solution, solution), true);
  assert.equal(isSolved(puzzle, solution), false);
});

test('Sudoku: Conflict detection for rows, columns, and 3x3 boxes', () => {
  const emptyBoard: Board = Array.from({ length: 9 }, () => Array(9).fill(0));
  assert.equal(findConflicts(emptyBoard).size, 0, 'Empty board must have zero conflicts');

  // 1. Row duplicate
  const rowConflictBoard: Board = Array.from({ length: 9 }, () => Array(9).fill(0));
  rowConflictBoard[2][1] = 5;
  rowConflictBoard[2][7] = 5;
  const rowBad = findConflicts(rowConflictBoard);
  assert.ok(rowBad.has('2,1'));
  assert.ok(rowBad.has('2,7'));
  assert.equal(rowBad.size, 2);

  // 2. Column duplicate
  const colConflictBoard: Board = Array.from({ length: 9 }, () => Array(9).fill(0));
  colConflictBoard[0][4] = 9;
  colConflictBoard[8][4] = 9;
  const colBad = findConflicts(colConflictBoard);
  assert.ok(colBad.has('0,4'));
  assert.ok(colBad.has('8,4'));
  assert.equal(colBad.size, 2);

  // 3. 3x3 Box duplicate (different row and column, same box)
  // Box 0: rows 0..2, cols 0..2
  const boxConflictBoard: Board = Array.from({ length: 9 }, () => Array(9).fill(0));
  boxConflictBoard[0][0] = 7;
  boxConflictBoard[1][2] = 7;
  const boxBad = findConflicts(boxConflictBoard);
  assert.ok(boxBad.has('0,0'));
  assert.ok(boxBad.has('1,2'));
  assert.equal(boxBad.size, 2);
});
