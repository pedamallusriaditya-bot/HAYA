import {
  Bomb,
  Grid3x3,
  Crosshair,
  MemoryStick,
  Dices,
  Disc,
  Crown,
  Hash,
  Columns3,
  Stars,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type GameId =
  | 'sudoku'
  | 'minesweeper'
  | '2048'
  | 'maze'
  | 'memory'
  | 'tictactoe'
  | 'connect4'
  | 'chess'
  | 'ludo'
  | 'carrom'
  | 'snakes';

export type GameMeta = {
  id: GameId;
  name: string;
  tagline: string;
  description: string;
  mode: 'single' | 'multi';
  status: 'playable' | 'soon';
  icon: LucideIcon;
  gradient: string;
  rules: string[];
};

export const GAMES: GameMeta[] = [
  {
    id: 'sudoku',
    name: 'Sudoku',
    tagline: 'Fill the grid with logic',
    description: 'Place digits 1-9 so every row, column and 3x3 box contains each number exactly once.',
    mode: 'single',
    status: 'playable',
    icon: Grid3x3,
    gradient: 'from-sky-500/30 to-cyan-500/10',
    rules: [
      'Each row must contain 1-9 with no repeats.',
      'Each column must contain 1-9 with no repeats.',
      'Each 3x3 box must contain 1-9 with no repeats.',
      'Clue cells are locked. Fill the rest using logic.',
    ],
  },
  {
    id: 'minesweeper',
    name: 'Minesweeper',
    tagline: 'Clear the field, avoid the mines',
    description: 'Reveal cells, use the numbers to deduce mine locations, and flag every mine to win.',
    mode: 'single',
    status: 'playable',
    icon: Bomb,
    gradient: 'from-rose-500/30 to-orange-500/10',
    rules: [
      'Click a cell to reveal it.',
      'Numbers show how many mines touch that cell.',
      'Right-click (or long-press) to flag a suspected mine.',
      'Reveal every non-mine cell to win.',
    ],
  },
  {
    id: '2048',
    name: '2048',
    tagline: 'Slide, merge, double',
    description: 'Combine equal tiles to build the 2048 tile. Keep going for an even higher score.',
    mode: 'single',
    status: 'playable',
    icon: Grid3x3,
    gradient: 'from-amber-500/30 to-yellow-500/10',
    rules: [
      'Use arrow keys or swipe to slide all tiles.',
      'Equal tiles merge into one doubled tile.',
      'Each merge adds to your score.',
      'The game ends when the board is full and no merges are possible.',
    ],
  },
  {
    id: 'maze',
    name: 'Maze Runner',
    tagline: 'Find the exit',
    description: 'Navigate a procedurally generated maze from start to finish. Smaller is faster.',
    mode: 'single',
    status: 'playable',
    icon: Crosshair,
    gradient: 'from-emerald-500/30 to-teal-500/10',
    rules: [
      'Move with arrow keys or swipe on mobile.',
      'Reach the green exit square to win.',
      'Each level generates a new, solvable maze.',
      'Your time is tracked - beat your best.',
    ],
  },
  {
    id: 'memory',
    name: 'Memory Match',
    tagline: 'Match the pairs',
    description: 'Flip cards two at a time to find matching pairs. Clear the board in as few moves as possible.',
    mode: 'single',
    status: 'playable',
    icon: MemoryStick,
    gradient: 'from-fuchsia-500/30 to-pink-500/10',
    rules: [
      'Click a card to flip it.',
      'Flip two cards per turn.',
      'A matching pair stays face up.',
      'Clear all pairs to win - fewer moves is better.',
    ],
  },
  {
    id: 'tictactoe',
    name: 'Tic-Tac-Toe',
    tagline: 'Three in a row',
    description: 'The classic 3x3 game. Play a friend online or challenge the unbeatable bot.',
    mode: 'multi',
    status: 'playable',
    icon: Hash,
    gradient: 'from-sky-500/30 to-indigo-500/10',
    rules: ['Take turns placing X and O.', 'First with three in a row wins.'],
  },
  {
    id: 'connect4',
    name: 'Connect Four',
    tagline: 'Stack to win',
    description: 'Drop pieces into a 7x6 grid. Connect four in a row - horizontal, vertical or diagonal.',
    mode: 'multi',
    status: 'playable',
    icon: Columns3,
    gradient: 'from-rose-500/30 to-amber-500/10',
    rules: ['Drop a piece in any column.', 'Pieces fall to the lowest empty slot.', 'Connect 4 in any direction to win.'],
  },
  {
    id: 'chess',
    name: 'Chess',
    tagline: 'The immortal game',
    description: 'Full legal-move chess with check, checkmate, castling and promotion.',
    mode: 'multi',
    status: 'playable',
    icon: Crown,
    gradient: 'from-slate-400/30 to-slate-600/10',
    rules: ['Standard chess rules apply.', 'Includes castling, en passant and promotion.'],
  },
  {
    id: 'ludo',
    name: 'Ludo',
    tagline: 'Roll, race, capture',
    description: 'Race your tokens around the board and home. Capture opponents on your way.',
    mode: 'multi',
    status: 'playable',
    icon: Dices,
    gradient: 'from-emerald-500/30 to-lime-500/10',
    rules: ['Roll a 6 to release a token.', 'Land on an opponent to send them home.', 'Get all tokens home to win.'],
  },
  {
    id: 'carrom',
    name: 'Carrom',
    tagline: 'Flick and pocket',
    description: 'Aim, power up and pocket your pieces in this classic tabletop game with smooth physics and 7 bot levels.',
    mode: 'multi',
    status: 'playable',
    icon: Disc,
    gradient: 'from-amber-500/30 to-orange-500/10',
    rules: [
      'Position the striker along your baseline, adjust your aim angle and strike power.',
      'White breaks first. Pocket all your assigned pieces (White for player, Black for bot) to win.',
      'Pocketing your own piece earns another turn. Sinking the striker is a foul (1 penalty piece returned).',
      'The red Queen awards 3 bonus points and must be covered by pocketing one of your own pieces.',
    ],
  },
  {
    id: 'snakes',
    name: "Snakes & Ladders",
    tagline: 'Climb the ladders, dodge the snakes',
    description: 'Roll the dice and race to square 100. Ladders lift you up, snakes send you down.',
    mode: 'multi',
    status: 'playable',
    icon: Stars,
    gradient: 'from-teal-500/30 to-green-500/10',
    rules: ['Roll the dice on your turn.', 'Ladders boost you up; snakes slide you down.', 'First to square 100 wins.'],
  },
];

export const SINGLE_GAMES = GAMES.filter((g) => g.mode === 'single' && g.status === 'playable');
export const MULTI_GAMES = GAMES.filter((g) => g.mode === 'multi');

export function getGame(id: string): GameMeta | undefined {
  return GAMES.find((g) => g.id === id);
}
