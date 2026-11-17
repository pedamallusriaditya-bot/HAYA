import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialBoard,
  startBoard,
  revealCell,
  toggleFlag,
  checkWin,
  CONFIG,
  type Board,
} from './engine.ts';

test('Minesweeper: First-click safety and mine adjacency counts', () => {
  const { board } = createInitialBoard('easy');
  const safeR = 4;
  const safeC = 4;
  const mines = CONFIG.easy.mines; // 10 mines

  const activeBoard = startBoard(board, mines, safeR, safeC);

  // 1. Verify first click cell and its 8 neighbors are NEVER mines
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = safeR + dr;
      const nc = safeC + dc;
      assert.equal(
        activeBoard[nr][nc].isMine,
        false,
        `Safe zone cell (${nr},${nc}) must never contain a mine`
      );
    }
  }

  // 2. Count total mines on board
  let totalMines = 0;
  for (let r = 0; r < activeBoard.length; r++) {
    for (let c = 0; c < activeBoard[0].length; c++) {
      if (activeBoard[r][c].isMine) totalMines++;
    }
  }
  assert.equal(totalMines, mines, `Total placed mines must equal ${mines}`);

  // 3. Verify adjacency count invariant for all non-mine cells
  for (let r = 0; r < activeBoard.length; r++) {
    for (let c = 0; c < activeBoard[0].length; c++) {
      if (activeBoard[r][c].isMine) continue;
      let surrounding = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (
            nr >= 0 &&
            nr < activeBoard.length &&
            nc >= 0 &&
            nc < activeBoard[0].length &&
            activeBoard[nr][nc].isMine
          ) {
            surrounding++;
          }
        }
      }
      assert.equal(
        activeBoard[r][c].adjacent,
        surrounding,
        `Cell (${r},${c}) adjacent count must match surrounding mines`
      );
    }
  }
});

test('Minesweeper: Flood reveal, flags, and win/loss detection', () => {
  // Construct a deterministic 3x3 board
  // Row 0: M  1  0
  // Row 1: 1  1  0
  // Row 2: 0  0  0
  const deterministicBoard: Board = [
    [
      { isMine: true, revealed: false, flagged: false, adjacent: 0 },
      { isMine: false, revealed: false, flagged: false, adjacent: 1 },
      { isMine: false, revealed: false, flagged: false, adjacent: 0 },
    ],
    [
      { isMine: false, revealed: false, flagged: false, adjacent: 1 },
      { isMine: false, revealed: false, flagged: false, adjacent: 1 },
      { isMine: false, revealed: false, flagged: false, adjacent: 0 },
    ],
    [
      { isMine: false, revealed: false, flagged: false, adjacent: 0 },
      { isMine: false, revealed: false, flagged: false, adjacent: 0 },
      { isMine: false, revealed: false, flagged: false, adjacent: 0 },
    ],
  ];

  // 1. Flagging a cell prevents revealing
  const flaggedBoard = toggleFlag(deterministicBoard, 0, 0);
  assert.equal(flaggedBoard[0][0].flagged, true);
  const clickFlagged = revealCell(flaggedBoard, 0, 0);
  assert.equal(clickFlagged.hitMine, false, 'Clicking flagged cell must not trigger mine');
  assert.equal(clickFlagged.board[0][0].revealed, false, 'Clicking flagged cell must not reveal it');

  // Unflag
  const unflaggedBoard = toggleFlag(flaggedBoard, 0, 0);
  assert.equal(unflaggedBoard[0][0].flagged, false);

  // 2. Flood reveal starting at (2, 2) which has adjacent === 0
  const { board: afterFlood, hitMine: floodHit } = revealCell(unflaggedBoard, 2, 2);
  assert.equal(floodHit, false);
  // All non-mine cells should be revealed by flood fill
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (r === 0 && c === 0) {
        assert.equal(afterFlood[r][c].revealed, false, 'Mine at (0,0) must remain unrevealed');
      } else {
        assert.equal(afterFlood[r][c].revealed, true, `Non-mine cell (${r},${c}) should be revealed`);
      }
    }
  }

  // 3. Win check on fully cleared board
  assert.equal(checkWin(afterFlood), true, 'All non-mine cells revealed should report win');

  // 4. Hit mine triggers loss
  const { hitMine: mineHit } = revealCell(unflaggedBoard, 0, 0);
  assert.equal(mineHit, true, 'Clicking unflagged mine must return hitMine: true');
});
