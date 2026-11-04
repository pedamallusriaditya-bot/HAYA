import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyGrid,
  processLine,
  move,
  canMove,
  hasWon,
  addRandomTile,
  type Grid,
} from './engine.ts';

test('processLine single line compression and merge rules', () => {
  // [2, 2, 0, 0] -> [4, 0, 0, 0], gained 4
  const res1 = processLine([2, 2, 0, 0]);
  assert.deepEqual(res1.line, [4, 0, 0, 0]);
  assert.equal(res1.scoreGained, 4);

  // [2, 2, 2, 0] -> [4, 2, 0, 0], gained 4
  const res2 = processLine([2, 2, 2, 0]);
  assert.deepEqual(res2.line, [4, 2, 0, 0]);
  assert.equal(res2.scoreGained, 4);

  // [2, 2, 2, 2] -> [4, 4, 0, 0], gained 8
  const res3 = processLine([2, 2, 2, 2]);
  assert.deepEqual(res3.line, [4, 4, 0, 0]);
  assert.equal(res3.scoreGained, 8);

  // [2, 2, 4, 0] -> [4, 4, 0, 0], gained 4 (NOT 8)
  const res4 = processLine([2, 2, 4, 0]);
  assert.deepEqual(res4.line, [4, 4, 0, 0]);
  assert.equal(res4.scoreGained, 4);

  // [4, 4, 8, 0] -> [8, 8, 0, 0], gained 8
  const res5 = processLine([4, 4, 8, 0]);
  assert.deepEqual(res5.line, [8, 8, 0, 0]);
  assert.equal(res5.scoreGained, 8);

  // [0, 2, 0, 2] -> [4, 0, 0, 0], gained 4
  const res6 = processLine([0, 2, 0, 2]);
  assert.deepEqual(res6.line, [4, 0, 0, 0]);
  assert.equal(res6.scoreGained, 4);
});

test('Left movement rules', () => {
  const g1: Grid = [
    [2, 2, 0, 0],
    [2, 2, 2, 2],
    [0, 0, 0, 0],
    [4, 0, 4, 0],
  ];
  const res1 = move(g1, 'left');
  assert.equal(res1.moved, true);
  assert.deepEqual(res1.grid[0], [4, 0, 0, 0]);
  assert.deepEqual(res1.grid[1], [4, 4, 0, 0]);
  assert.deepEqual(res1.grid[2], [0, 0, 0, 0]);
  assert.deepEqual(res1.grid[3], [8, 0, 0, 0]);
  assert.equal(res1.gained, 4 + 8 + 8); // 20
});

test('Right movement rules', () => {
  const g1: Grid = [
    [2, 2, 0, 0],
    [2, 2, 2, 2],
    [0, 0, 0, 0],
    [0, 4, 0, 4],
  ];
  const res1 = move(g1, 'right');
  assert.equal(res1.moved, true);
  assert.deepEqual(res1.grid[0], [0, 0, 0, 4]);
  assert.deepEqual(res1.grid[1], [0, 0, 4, 4]);
  assert.deepEqual(res1.grid[2], [0, 0, 0, 0]);
  assert.deepEqual(res1.grid[3], [0, 0, 0, 8]);
  assert.equal(res1.gained, 4 + 8 + 8);
});

test('Up movement rules', () => {
  const g1: Grid = [
    [2, 2, 4, 0],
    [2, 0, 4, 0],
    [0, 2, 4, 0],
    [0, 0, 4, 0],
  ];
  const res1 = move(g1, 'up');
  assert.equal(res1.moved, true);
  // Col 0: [2, 2, 0, 0] -> [4, 0, 0, 0]
  assert.equal(res1.grid[0][0], 4);
  assert.equal(res1.grid[1][0], 0);
  assert.equal(res1.grid[2][0], 0);
  assert.equal(res1.grid[3][0], 0);

  // Col 1: [2, 0, 2, 0] -> [4, 0, 0, 0]
  assert.equal(res1.grid[0][1], 4);
  assert.equal(res1.grid[1][1], 0);
  assert.equal(res1.grid[2][1], 0);
  assert.equal(res1.grid[3][1], 0);

  // Col 2: [4, 4, 4, 4] -> [8, 8, 0, 0]
  assert.equal(res1.grid[0][2], 8);
  assert.equal(res1.grid[1][2], 8);
  assert.equal(res1.grid[2][2], 0);
  assert.equal(res1.grid[3][2], 0);

  assert.equal(res1.gained, 4 + 4 + 16);
});

test('Down movement rules (verified against specific required test cases)', () => {
  // Case A: A column containing [2, 2, 0, 0] from top to bottom must become [0, 0, 0, 4]
  // Case B: A column containing [2, 0, 0, 2] must become [0, 0, 0, 4]
  // Case C: A column containing [2, 2, 2, 2] must become [0, 0, 4, 4]
  // Case D: A column containing [2, 2, 4, 0] must become [0, 0, 4, 4]
  const g1: Grid = [
    [2, 2, 2, 2], // row 0
    [2, 0, 2, 2], // row 1
    [0, 0, 2, 4], // row 2
    [0, 2, 2, 0], // row 3
  ];
  // col 0: [2, 2, 0, 0]
  // col 1: [2, 0, 0, 2]
  // col 2: [2, 2, 2, 2]
  // col 3: [2, 2, 4, 0]

  const res1 = move(g1, 'down');
  assert.equal(res1.moved, true);

  // Verify Col 0: [0, 0, 0, 4]
  assert.equal(res1.grid[0][0], 0);
  assert.equal(res1.grid[1][0], 0);
  assert.equal(res1.grid[2][0], 0);
  assert.equal(res1.grid[3][0], 4);

  // Verify Col 1: [0, 0, 0, 4]
  assert.equal(res1.grid[0][1], 0);
  assert.equal(res1.grid[1][1], 0);
  assert.equal(res1.grid[2][1], 0);
  assert.equal(res1.grid[3][1], 4);

  // Verify Col 2: [0, 0, 4, 4]
  assert.equal(res1.grid[0][2], 0);
  assert.equal(res1.grid[1][2], 0);
  assert.equal(res1.grid[2][2], 4);
  assert.equal(res1.grid[3][2], 4);

  // Verify Col 3: [0, 0, 4, 4]
  assert.equal(res1.grid[0][3], 0);
  assert.equal(res1.grid[1][3], 0);
  assert.equal(res1.grid[2][3], 4);
  assert.equal(res1.grid[3][3], 4);

  // Gained score: Col 0 (4) + Col 1 (4) + Col 2 (8) + Col 3 (4) = 20
  assert.equal(res1.gained, 20);
});

test('No-op move does not change board or gain score', () => {
  const g: Grid = [
    [4, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  const res = move(g, 'left');
  assert.equal(res.moved, false);
  assert.equal(res.gained, 0);
  assert.deepEqual(res.grid, g);
});

test('canMove detects valid moves vs game over', () => {
  const openGrid: Grid = [
    [2, 4, 2, 4],
    [4, 2, 4, 2],
    [2, 4, 2, 4],
    [4, 2, 4, 0], // 1 empty
  ];
  assert.equal(canMove(openGrid), true);

  const fullWithMerge: Grid = [
    [2, 4, 2, 4],
    [4, 2, 4, 2],
    [2, 4, 2, 4],
    [4, 2, 4, 4], // mergeable 4 & 4 in bottom row
  ];
  assert.equal(canMove(fullWithMerge), true);

  const fullGameOver: Grid = [
    [2, 4, 2, 4],
    [4, 2, 4, 2],
    [2, 4, 2, 4],
    [4, 2, 4, 2],
  ];
  assert.equal(canMove(fullGameOver), false);
});

test('hasWon detects 2048 tile', () => {
  const noWin: Grid = [
    [1024, 512, 256, 128],
    [64, 32, 16, 8],
    [4, 2, 0, 0],
    [0, 0, 0, 0],
  ];
  assert.equal(hasWon(noWin), false);

  const winGrid: Grid = [
    [2048, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  assert.equal(hasWon(winGrid), true);
});

test('addRandomTile spawns exactly one 2 or 4 in an empty cell', () => {
  const grid = emptyGrid();
  grid[0][0] = 2;
  const after = addRandomTile(grid);
  let count = 0;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (after[r][c] !== 0) count++;
    }
  }
  assert.equal(count, 2);
  assert.equal(after[0][0], 2); // original tile untouched
});
