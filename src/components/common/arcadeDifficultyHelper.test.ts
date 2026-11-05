import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sortDifficultiesAscending,
  getPercentForIndex,
  getIndexFromPercent,
  findDifficultyIndex,
  getMiddleIndex,
  type UniversalDifficultyItem,
} from './arcadeDifficultyHelper.ts';

test('Arcade Difficulty Helper: Sorts difficulties by level ascending regardless of input order', () => {
  // 1. Hardest-first list (e.g. Carrom levels 7 down to 1)
  const carromHardestFirst: UniversalDifficultyItem[] = [
    { level: 7, id: 'carrom-master', name: 'Carrom Master' },
    { level: 6, id: 'carrom-gm', name: 'Grandmaster' },
    { level: 5, id: 'carrom-expert', name: 'Expert' },
    { level: 4, id: 'carrom-adv', name: 'Advanced' },
    { level: 3, id: 'carrom-inter', name: 'Intermediate' },
    { level: 2, id: 'carrom-casual', name: 'Casual' },
    { level: 1, id: 'carrom-beginner', name: 'Beginner' },
  ];

  const sortedCarrom = sortDifficultiesAscending(carromHardestFirst);
  assert.equal(sortedCarrom.length, 7);
  assert.equal(sortedCarrom[0].level, 1, 'Index 0 on left must be easiest (Level 1)');
  assert.equal(sortedCarrom[0].name, 'Beginner');
  assert.equal(sortedCarrom[6].level, 7, 'Last index on right must be hardest (Level 7)');
  assert.equal(sortedCarrom[6].name, 'Carrom Master');

  // Verify non-destructive sorting (original array unmodified)
  assert.equal(carromHardestFirst[0].level, 7);

  // 2. Easiest-first list (e.g. Chess levels 1 up to 10)
  const chessEasiestFirst: UniversalDifficultyItem[] = [
    { level: 1, id: 'chess-1', name: 'Level 1' },
    { level: 2, id: 'chess-2', name: 'Level 2' },
    { level: 3, id: 'chess-3', name: 'Level 3' },
    { level: 4, id: 'chess-4', name: 'Level 4' },
    { level: 5, id: 'chess-5', name: 'Level 5' },
    { level: 6, id: 'chess-6', name: 'Level 6' },
    { level: 7, id: 'chess-7', name: 'Level 7' },
    { level: 8, id: 'chess-8', name: 'Level 8' },
    { level: 9, id: 'chess-9', name: 'Level 9' },
    { level: 10, id: 'chess-10', name: 'Level 10' },
  ];

  const sortedChess = sortDifficultiesAscending(chessEasiestFirst);
  assert.equal(sortedChess.length, 10);
  assert.equal(sortedChess[0].level, 1);
  assert.equal(sortedChess[9].level, 10);

  // 3. Difficulties without level: preserve given order (treated as easiest-first)
  const unlevelledList: UniversalDifficultyItem[] = [
    { id: 'easy', name: 'Easy' },
    { id: 'medium', name: 'Medium' },
    { id: 'hard', name: 'Hard' },
  ];

  const sortedUnlevelled = sortDifficultiesAscending(unlevelledList);
  assert.deepEqual(
    sortedUnlevelled.map((d) => d.id),
    ['easy', 'medium', 'hard'],
    'Unlevelled lists preserve their authored order'
  );
});

test('Arcade Difficulty Helper: Index to Percent mapping (0% to 100%)', () => {
  const maxIndex = 6; // 7 levels: 0..6

  assert.equal(getPercentForIndex(0, maxIndex), 0, 'Index 0 is 0%');
  assert.equal(getPercentForIndex(3, maxIndex), 50, 'Middle index 3 is 50%');
  assert.equal(getPercentForIndex(6, maxIndex), 100, 'Last index 6 is 100%');

  // Clamping checks
  assert.equal(getPercentForIndex(-1, maxIndex), 0, 'Negative index clamps to 0%');
  assert.equal(getPercentForIndex(10, maxIndex), 100, 'Index beyond max clamps to 100%');

  // Single-level fallback (maxIndex = 0)
  assert.equal(getPercentForIndex(0, 0), 50);
});

test('Arcade Difficulty Helper: Percent to Index mapping and nearest snapping', () => {
  const maxIndex = 6; // 7 levels: 0..6

  assert.equal(getIndexFromPercent(0, maxIndex), 0);
  assert.equal(getIndexFromPercent(100, maxIndex), 6);
  assert.equal(getIndexFromPercent(50, maxIndex), 3);

  // Nearest level rounding
  assert.equal(getIndexFromPercent(8, maxIndex), 0); // 8% of 6 is 0.48 -> 0
  assert.equal(getIndexFromPercent(12, maxIndex), 1); // 12% of 6 is 0.72 -> 1
  assert.equal(getIndexFromPercent(85, maxIndex), 5); // 85% of 6 is 5.1 -> 5
  assert.equal(getIndexFromPercent(95, maxIndex), 6); // 95% of 6 is 5.7 -> 6
});

test('Arcade Difficulty Helper: Difficulty index search and middle index fallback', () => {
  const list: UniversalDifficultyItem[] = [
    { level: 1, id: 'c4-beginner', name: 'Beginner' },
    { level: 2, id: 'c4-easy', name: 'Easy' },
    { level: 3, id: 'c4-normal', name: 'Normal' },
    { level: 4, id: 'c4-hard', name: 'Hard' },
    { level: 5, id: 'c4-expert', name: 'Expert' },
    { level: 6, id: 'c4-impossible', name: 'Impossible' },
  ];

  // Match by id string
  assert.equal(findDifficultyIndex(list, 'c4-beginner'), 0);
  assert.equal(findDifficultyIndex(list, 'c4-hard'), 3);

  // Match by level number
  assert.equal(findDifficultyIndex(list, 1), 0);
  assert.equal(findDifficultyIndex(list, 6), 5);

  // Not found returns -1
  assert.equal(findDifficultyIndex(list, 'nonexistent'), -1);
  assert.equal(findDifficultyIndex(list, 999), -1);

  // Middle index calculations
  assert.equal(getMiddleIndex(7), 3, 'Middle of 7 levels is index 3 (Level 4)');
  assert.equal(getMiddleIndex(6), 3, 'Middle of 6 levels is index 3 (Level 4)');
  assert.equal(getMiddleIndex(3), 1, 'Middle of 3 levels is index 1');
  assert.equal(getMiddleIndex(10), 5, 'Middle of 10 levels is index 5');
  assert.equal(getMiddleIndex(0), 0);
});

