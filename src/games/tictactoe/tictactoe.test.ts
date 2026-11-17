import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmptyBoard,
  checkWinner,
  getLegalMoves,
  type Board,
} from './engine.ts';
import { getBotMove } from './ai.ts';

test('Tic-Tac-Toe Engine: Win detection for rows, columns, diagonals, and draw', () => {
  // 1. Row win
  const rowBoard: Board = ['X', 'X', 'X', null, 'O', null, 'O', null, null];
  const rowResult = checkWinner(rowBoard);
  assert.equal(rowResult.winner, 'X');
  assert.deepEqual(rowResult.winningLine, [0, 1, 2]);

  // 2. Column win
  const colBoard: Board = ['O', 'X', null, 'O', 'X', null, 'O', null, null];
  const colResult = checkWinner(colBoard);
  assert.equal(colResult.winner, 'O');
  assert.deepEqual(colResult.winningLine, [0, 3, 6]);

  // 3. Diagonal win
  const diagBoard: Board = ['X', 'O', null, null, 'X', 'O', null, null, 'X'];
  const diagResult = checkWinner(diagBoard);
  assert.equal(diagResult.winner, 'X');
  assert.deepEqual(diagResult.winningLine, [0, 4, 8]);

  // 4. Draw game
  const drawBoard: Board = [
    'X', 'O', 'X',
    'X', 'O', 'O',
    'O', 'X', 'X',
  ];
  const drawResult = checkWinner(drawBoard);
  assert.equal(drawResult.winner, 'draw');
  assert.equal(drawResult.winningLine, null);

  // 5. In-progress game
  const emptyBoard = createEmptyBoard();
  assert.equal(checkWinner(emptyBoard).winner, null);
  assert.equal(getLegalMoves(emptyBoard).length, 9);
});

test('Tic-Tac-Toe AI: Seizes wins, blocks threats, and hard difficulty never loses', () => {
  // 1. Immediate Win: Bot 'O' has [0, 1], index 2 is open
  const winBoard: Board = ['O', 'O', null, 'X', 'X', null, null, null, null];
  const winMove = getBotMove(winBoard, 'O', 'medium');
  assert.equal(winMove, 2, 'Medium/hard bot must seize immediate winning cell');

  // 2. Immediate Block: Opponent 'X' has [3, 4], index 5 is open
  const blockBoard: Board = [null, null, null, 'X', 'X', null, 'O', null, null];
  const blockMove = getBotMove(blockBoard, 'O', 'medium');
  assert.equal(blockMove, 5, 'Medium/hard bot must block opponent immediate win');

  // 3. Hard bot (Minimax) invariant: Never loses from any opening
  for (const openingMove of [0, 1, 4]) {
    const simBoard = createEmptyBoard();
    simBoard[openingMove] = 'X'; // Human plays opening move
    let turn: 'X' | 'O' = 'O';

    while (true) {
      const winnerResult = checkWinner(simBoard);
      if (winnerResult.winner !== null) {
        assert.notEqual(
          winnerResult.winner,
          'X',
          `Hard bot must never lose against any move sequence (opening ${openingMove})`
        );
        break;
      }

      if (turn === 'O') {
        const botM = getBotMove(simBoard, 'O', 'hard');
        simBoard[botM] = 'O';
        turn = 'X';
      } else {
        const legal = getLegalMoves(simBoard);
        if (legal.length === 0) break;
        simBoard[legal[0]] = 'X';
        turn = 'O';
      }
    }
  }
});
