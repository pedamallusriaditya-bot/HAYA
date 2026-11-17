import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMaze, type Maze, type Difficulty } from './engine.ts';

function isMazeSolvable(maze: Maze): boolean {
  const { grid, start, exit, rows, cols } = maze;
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const queue: [number, number][] = [start];
  visited[start[0]][start[1]] = true;

  const dirs = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ];

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    if (r === exit[0] && c === exit[1]) {
      return true;
    }

    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (
        nr >= 0 &&
        nr < rows &&
        nc >= 0 &&
        nc < cols &&
        !grid[nr][nc] && // passage
        !visited[nr][nc]
      ) {
        visited[nr][nc] = true;
        queue.push([nr, nc]);
      }
    }
  }

  return false;
}

test('Maze Runner: Grid generation, boundaries, and path solvability', () => {
  const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];

  for (const diff of difficulties) {
    const maze = generateMaze(diff);

    // 1. Grid structure
    assert.equal(maze.grid.length, maze.rows);
    assert.equal(maze.grid[0].length, maze.cols);

    // 2. Start and Exit must be walkable passages
    assert.equal(maze.grid[maze.start[0]][maze.start[1]], false, 'Start must be a passage');
    assert.equal(maze.grid[maze.exit[0]][maze.exit[1]], false, 'Exit must be a passage');

    // 3. Perimeter walls must be fully enclosed
    for (let c = 0; c < maze.cols; c++) {
      assert.equal(maze.grid[0][c], true, 'Top boundary must be a wall');
      assert.equal(maze.grid[maze.rows - 1][c], true, 'Bottom boundary must be a wall');
    }
    for (let r = 0; r < maze.rows; r++) {
      assert.equal(maze.grid[r][0], true, 'Left boundary must be a wall');
      assert.equal(maze.grid[r][maze.cols - 1], true, 'Right boundary must be a wall');
    }

    // 4. Guaranteed solvability from start to exit
    assert.equal(isMazeSolvable(maze), true, `Generated maze (${diff}) must have a valid path from start to exit`);
  }
});
