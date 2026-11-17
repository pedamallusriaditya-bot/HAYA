import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LADDERS,
  SNAKES,
  calculateMove,
  getSquareCoordinates,
} from './engine.ts';

test('Snakes and Ladders: Ladders climb up and snakes slide down', () => {
  // Test every ladder
  for (const [fromStr, to] of Object.entries(LADDERS)) {
    const from = Number(fromStr);
    const result = calculateMove(from - 1, 1);
    assert.equal(result.intermediateSquare, from);
    assert.equal(result.finalSquare, to, `Landing on square ${from} must climb ladder to ${to}`);
    assert.equal(result.jumpType, 'ladder');
    assert.equal(result.jumpFrom, from);
    assert.equal(result.jumpTo, to);
    assert.equal(result.bounced, false);
  }

  // Test every snake
  for (const [fromStr, to] of Object.entries(SNAKES)) {
    const from = Number(fromStr);
    const result = calculateMove(from - 1, 1);
    assert.equal(result.intermediateSquare, from);
    assert.equal(result.finalSquare, to, `Landing on snake head ${from} must slide down to ${to}`);
    assert.equal(result.jumpType, 'snake');
    assert.equal(result.jumpFrom, from);
    assert.equal(result.jumpTo, to);
    assert.equal(result.bounced, false);
  }
});

test('Snakes and Ladders: Exact-roll rule, bounce-back, and win at square 100', () => {
  // Exact roll landing on 100 wins without bounce
  const winMove = calculateMove(95, 5);
  assert.equal(winMove.intermediateSquare, 100);
  assert.equal(winMove.finalSquare, 100);
  assert.equal(winMove.bounced, false);

  // Roll exceeding 100 bounces back
  // At 97, rolling 5 gives target 102 -> bounce to 100 - (102 - 100) = 98
  const bounceMove1 = calculateMove(97, 5);
  assert.equal(bounceMove1.intermediateSquare, 98);
  assert.equal(bounceMove1.finalSquare, 98);
  assert.equal(bounceMove1.bounced, true);

  // At 98, rolling 3 gives target 101 -> bounce to 99, which has a snake to 78!
  const bounceIntoSnake = calculateMove(98, 3);
  assert.equal(bounceIntoSnake.intermediateSquare, 99);
  assert.equal(bounceIntoSnake.finalSquare, 78, 'Bouncing into square 99 triggers snake down to 78');
  assert.equal(bounceIntoSnake.bounced, true);
  assert.equal(bounceIntoSnake.jumpType, 'snake');

  // Roll of 6 awards extra turn
  const roll6 = calculateMove(1, 6);
  assert.equal(roll6.givesExtraTurn, true);
  const roll3 = calculateMove(1, 3);
  assert.equal(roll3.givesExtraTurn, false);
});

test('Snakes and Ladders: Serpentine board coordinate mapping', () => {
  // Bottom row (row 0): 1 -> 10 goes Left to Right (col 0 to 9)
  const sq1 = getSquareCoordinates(1);
  assert.equal(sq1.row, 0);
  assert.equal(sq1.col, 0);

  const sq10 = getSquareCoordinates(10);
  assert.equal(sq10.row, 0);
  assert.equal(sq10.col, 9);

  // Second row (row 1): 11 -> 20 goes Right to Left (col 9 to 0)
  const sq11 = getSquareCoordinates(11);
  assert.equal(sq11.row, 1);
  assert.equal(sq11.col, 9);

  const sq20 = getSquareCoordinates(20);
  assert.equal(sq20.row, 1);
  assert.equal(sq20.col, 0);

  // Top row (row 9): 91 -> 100 goes Right to Left (col 9 to 0)
  const sq91 = getSquareCoordinates(91);
  assert.equal(sq91.row, 9);
  assert.equal(sq91.col, 9);

  const sq100 = getSquareCoordinates(100);
  assert.equal(sq100.row, 9);
  assert.equal(sq100.col, 0);
});
