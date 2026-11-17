import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { GameId } from './registry';

export const GAME_COMPONENTS: Record<GameId, LazyExoticComponent<ComponentType>> = {
  sudoku: lazy(() => import('@/games/sudoku/SudokuGame')),
  minesweeper: lazy(() => import('@/games/minesweeper/MinesweeperGame')),
  '2048': lazy(() => import('@/games/game2048/Game2048')),
  maze: lazy(() => import('@/games/maze/MazeGame')),
  memory: lazy(() => import('@/games/memory/MemoryGame')),
  tictactoe: lazy(() => import('@/games/tictactoe/TicTacToeGame')),
  chess: lazy(() => import('@/games/chess/ChessGame')),
  connect4: lazy(() => import('@/games/connect4/Connect4Game')),
  ludo: lazy(() => import('@/games/ludo/LudoGame')),
  snakes: lazy(() => import('@/games/snakes/SnakesGame')),
  carrom: lazy(() => import('@/games/carrom/CarromGame')),
};
