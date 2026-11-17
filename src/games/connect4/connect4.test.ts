import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmptyBoard,
  dropPiece,
  isColumnFull,
  checkWinner,
  ROWS,
  COLS,
  type Connect4Board,
} from './engine.ts';
import { getConnect4BotMove } from './ai.ts';

test('Connect 4: Win detection in all 4 directions', () => {
  // 1. Horizontal win (row 5, cols 1, 2, 3, 4)
  const hBoard = createEmptyBoard();
  dropPiece(hBoard, 1, 'R');
  dropPiece(hBoard, 2, 'R');
  dropPiece(hBoard, 3, 'R');
  dropPiece(hBoard, 4, 'R');
  const hResult = checkWinner(hBoard);
  assert.equal(hResult.winner, 'R');
  assert.deepEqual(hResult.winningLine, [
    [5, 1],
    [5, 2],
    [5, 3],
    [5, 4],
  ]);

  // 2. Vertical win (col 3, 4 pieces stacked)
  const vBoard = createEmptyBoard();
  dropPiece(vBoard, 3, 'Y');
  dropPiece(vBoard, 3, 'Y');
  dropPiece(vBoard, 3, 'Y');
  dropPiece(vBoard, 3, 'Y');
  const vResult = checkWinner(vBoard);
  assert.equal(vResult.winner, 'Y');
  assert.deepEqual(vResult.winningLine, [
    [2, 3],
    [3, 3],
    [4, 3],
    [5, 3],
  ]);

  // 3. Diagonal Down-Right win (\)
  // (r, c): (2, 0), (3, 1), (4, 2), (5, 3)
  const d1Board = createEmptyBoard();
  // Col 0: 1 piece of 'R'
  d1Board[2][0] = 'R';
  d1Board[3][1] = 'R';
  d1Board[4][2] = 'R';
  d1Board[5][3] = 'R';
  const d1Result = checkWinner(d1Board);
  assert.equal(d1Result.winner, 'R');
  assert.deepEqual(d1Result.winningLine, [
    [2, 0],
    [3, 1],
    [4, 2],
    [5, 3],
  ]);

  // 4. Diagonal Up-Right win (/)
  // (r, c): (5, 0), (4, 1), (3, 2), (2, 3)
  const d2Board = createEmptyBoard();
  d2Board[5][0] = 'Y';
  d2Board[4][1] = 'Y';
  d2Board[3][2] = 'Y';
  d2Board[2][3] = 'Y';
  const d2Result = checkWinner(d2Board);
  assert.equal(d2Result.winner, 'Y');
  assert.deepEqual(d2Result.winningLine, [
    [5, 0],
    [4, 1],
    [3, 2],
    [2, 3],
  ]);
});

test('Connect 4: Full board / draw detection and column bounds', () => {
  const board = createEmptyBoard();

  // Fresh board has no winner and no full column
  assert.equal(checkWinner(board).winner, null);
  for (let c = 0; c < COLS; c++) {
    assert.equal(isColumnFull(board, c), false);
  }

  // Fill col 0 completely with 6 pieces
  for (let i = 0; i < ROWS; i++) {
    const row = dropPiece(board, 0, i % 2 === 0 ? 'R' : 'Y');
    assert.equal(row, ROWS - 1 - i);
  }
  assert.equal(isColumnFull(board, 0), true);
  assert.equal(dropPiece(board, 0, 'R'), -1, 'Dropping in a full column must return -1');

  // Fill entire board without 4-in-a-row to verify draw detection
  // Repeating 2x1 blocks:
  // Rows 0,1: R Y R Y R Y R
  // Rows 2,3: Y R Y R Y R Y
  // Rows 4,5: R Y R Y R Y R
  const drawBoard: Connect4Board = [
    ['R', 'Y', 'R', 'Y', 'R', 'Y', 'R'],
    ['R', 'Y', 'R', 'Y', 'R', 'Y', 'R'],
    ['Y', 'R', 'Y', 'R', 'Y', 'R', 'Y'],
    ['Y', 'R', 'Y', 'R', 'Y', 'R', 'Y'],
    ['R', 'Y', 'R', 'Y', 'R', 'Y', 'R'],
    ['R', 'Y', 'R', 'Y', 'R', 'Y', 'R'],
  ];

  const drawResult = checkWinner(drawBoard);
  assert.equal(drawResult.winner, 'draw');
  assert.equal(drawResult.winningLine, null);
});

test('Connect 4 AI: Never chooses a full column and seizes winning moves', async () => {
  // Setup a board where 6 of the 7 columns are completely filled
  const board = createEmptyBoard();
  for (let c = 0; c < COLS; c++) {
    if (c === 4) continue; // Only column 4 is open
    for (let r = 0; r < ROWS; r++) {
      board[r][c] = (r + c) % 2 === 0 ? 'R' : 'Y';
    }
  }

  // Test across all difficulty levels (1 to 6)
  for (let tier = 1; tier <= 6; tier++) {
    const move = await getConnect4BotMove(board, 'Y', tier);
    assert.equal(
      move,
      4,
      `AI at tier ${tier} must choose the only available column (4) and never a full column`
    );
  }

  // Setup immediate winning move: bot 'Y' has 3 pieces in column 2
  const winBoard = createEmptyBoard();
  dropPiece(winBoard, 2, 'Y');
  dropPiece(winBoard, 2, 'Y');
  dropPiece(winBoard, 2, 'Y');

  // Tier 2+ bot must seize immediate victory
  const winningMove = await getConnect4BotMove(winBoard, 'Y', 2);
  assert.equal(winningMove, 2, 'AI must play winning column 2');
});
