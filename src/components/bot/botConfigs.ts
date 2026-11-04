export type DifficultyTier = {
  level: number;
  id: string;
  name: string;
  badge: string;
  color: string; // Tailwind color token
  description: string;
  depthOrDetail?: string;
  honestyNote?: string;
};

// Chess: 10 Levels
export const CHESS_DIFFICULTIES: DifficultyTier[] = [
  {
    level: 1,
    id: 'chess-1',
    name: 'Absolute Beginner',
    badge: 'Level 1',
    color: 'emerald',
    description: 'Makes frequent simple mistakes, overlooks basic tactics, and misses obvious threats.',
    depthOrDetail: 'Randomized blunders & 1-ply search',
  },
  {
    level: 2,
    id: 'chess-2',
    name: 'Beginner',
    badge: 'Level 2',
    color: 'emerald',
    description: 'Understands legal moves and basic captures but frequently misses tactical opportunities.',
    depthOrDetail: 'Engine Skill 1 · Limited evaluation',
  },
  {
    level: 3,
    id: 'chess-3',
    name: 'Casual',
    badge: 'Level 3',
    color: 'teal',
    description: 'Prioritizes material and simple threats, with limited forward planning.',
    depthOrDetail: 'Engine Skill 3 · Depth 2-3',
  },
  {
    level: 4,
    id: 'chess-4',
    name: 'Intermediate',
    badge: 'Level 4',
    color: 'sky',
    description: 'Uses basic tactical patterns, checks, captures, and threat detection.',
    depthOrDetail: 'Engine Skill 6 · Depth 4-5',
  },
  {
    level: 5,
    id: 'chess-5',
    name: 'Advanced',
    badge: 'Level 5',
    color: 'indigo',
    description: 'Searches deeper, considers king safety, pawn structure, and positional advantages.',
    depthOrDetail: 'Engine Skill 9 · Positional heuristic',
  },
  {
    level: 6,
    id: 'chess-6',
    name: 'Expert',
    badge: 'Level 6',
    color: 'purple',
    description: 'Strong tactical play, deeper search, and improved positional evaluation.',
    depthOrDetail: 'Engine Skill 12 · Tactical search',
  },
  {
    level: 7,
    id: 'chess-7',
    name: 'Master',
    badge: 'Level 7',
    color: 'amber',
    description: 'Strong search with iterative deepening, move ordering, and quiescence search.',
    depthOrDetail: 'Engine Skill 15 · Quiescence & ordering',
  },
  {
    level: 8,
    id: 'chess-8',
    name: 'Grandmaster',
    badge: 'Level 8',
    color: 'orange',
    description: 'Advanced engine search, pruning, opening knowledge, and endgame awareness.',
    depthOrDetail: 'Engine Skill 18 · Deep pruning',
  },
  {
    level: 9,
    id: 'chess-9',
    name: 'Super Grandmaster',
    badge: 'Level 9',
    color: 'rose',
    description: 'Higher search limits, stronger evaluation, and selective tactical search.',
    depthOrDetail: 'Engine Skill 20 · Depth 10-12',
  },
  {
    level: 10,
    id: 'chess-10',
    name: 'Magnus Challenge',
    badge: 'Boss Level 10',
    color: 'fuchsia',
    description: 'The maximum available engine computation configured to challenge elite players.',
    depthOrDetail: 'Stockfish Max · Full Depth & UCI search',
    honestyNote: 'Represents the peak local Stockfish engine depth configured for browser play.',
  },
];

// Connect Four: 6 Levels
export const CONNECT4_DIFFICULTIES: DifficultyTier[] = [
  {
    level: 1,
    id: 'c4-beginner',
    name: 'Beginner',
    badge: 'Level 1',
    color: 'emerald',
    description: 'Mostly heuristic decisions with occasional poor choices and missed connections.',
    depthOrDetail: 'Randomized heuristic',
  },
  {
    level: 2,
    id: 'c4-easy',
    name: 'Easy',
    badge: 'Level 2',
    color: 'teal',
    description: 'Takes obvious immediate winning moves but misses multi-step setups.',
    depthOrDetail: 'Immediate win checks',
  },
  {
    level: 3,
    id: 'c4-normal',
    name: 'Normal',
    badge: 'Level 3',
    color: 'sky',
    description: 'Blocks immediate opponent wins and aggressively seeks direct scoring opportunities.',
    depthOrDetail: 'Immediate win & block · Depth 2',
  },
  {
    level: 4,
    id: 'c4-hard',
    name: 'Hard',
    badge: 'Level 4',
    color: 'amber',
    description: 'Evaluates center column control, connected sequences, and positional responses.',
    depthOrDetail: 'Minimax search · Depth 4',
  },
  {
    level: 5,
    id: 'c4-expert',
    name: 'Expert',
    badge: 'Level 5',
    color: 'orange',
    description: 'Deeper minimax search with alpha-beta pruning, move ordering, and strong evaluation.',
    depthOrDetail: 'Alpha-Beta Minimax · Depth 6',
  },
  {
    level: 6,
    id: 'c4-impossible',
    name: 'Impossible',
    badge: 'Level 6 (Peak)',
    color: 'rose',
    description: 'Deep exhaustive alpha-beta search with transposition tables and forced win detection.',
    depthOrDetail: 'Alpha-Beta + Transposition Table · Depth 8+',
  },
];

// Ludo: 6 Levels
export const LUDO_DIFFICULTIES: DifficultyTier[] = [
  {
    level: 1,
    id: 'ludo-beginner',
    name: 'Beginner',
    badge: 'Level 1',
    color: 'emerald',
    description: 'Makes legal moves with mostly random token selection without tactical bias.',
    depthOrDetail: 'Random legal selection',
  },
  {
    level: 2,
    id: 'ludo-easy',
    name: 'Easy',
    badge: 'Level 2',
    color: 'teal',
    description: 'Prefers moving tokens forward and leaving the starting yard whenever possible.',
    depthOrDetail: 'Yard release & forward progress',
  },
  {
    level: 3,
    id: 'ludo-normal',
    name: 'Normal',
    badge: 'Level 3',
    color: 'sky',
    description: 'Balances token progress, opponent captures, and basic token safety.',
    depthOrDetail: 'Capture prioritization & safe zones',
  },
  {
    level: 4,
    id: 'ludo-hard',
    name: 'Hard',
    badge: 'Level 4',
    color: 'amber',
    description: 'Considers capture opportunities, star safe squares, token spread, and home stretch entries.',
    depthOrDetail: 'Risk exposure & home scoring',
  },
  {
    level: 5,
    id: 'ludo-expert',
    name: 'Expert',
    badge: 'Level 5',
    color: 'orange',
    description: 'Evaluates future exposure, distance to opponent chasers, home progress, and strategic spacing.',
    depthOrDetail: 'Multi-token safety & probability',
  },
  {
    level: 6,
    id: 'ludo-master',
    name: 'Master',
    badge: 'Level 6 (Master)',
    color: 'rose',
    description: 'Uses deep rule-aware lookahead over all legal choices to maximize win expectancy.',
    depthOrDetail: 'Expected value & lookahead simulation',
  },
];

// Snakes & Ladders: 6 Levels
export const SNAKES_DIFFICULTIES: DifficultyTier[] = [
  {
    level: 1,
    id: 'snakes-beginner',
    name: 'Beginner',
    badge: 'Level 1',
    color: 'emerald',
    description: 'Plays standard fair dice turns with basic arcade presentation.',
    depthOrDetail: 'Standard fair dice (1-6)',
    honestyNote: 'Fair dice game: outcomes are predominantly governed by roll probability.',
  },
  {
    level: 2,
    id: 'snakes-easy',
    name: 'Easy',
    badge: 'Level 2',
    color: 'teal',
    description: 'Follows rules with standard animations and automatic move pacing.',
    depthOrDetail: 'Standard fair dice (1-6)',
    honestyNote: 'Dice rolls are 100% fair and unrigged across all difficulty tiers.',
  },
  {
    level: 3,
    id: 'snakes-normal',
    name: 'Normal',
    badge: 'Level 3',
    color: 'sky',
    description: 'Reliably handles ladders, snake slides, and bounce-back finish rules.',
    depthOrDetail: 'Standard rules & exact finish check',
    honestyNote: 'Skill differences reflect analytical telemetry, not rigged rolls.',
  },
  {
    level: 4,
    id: 'snakes-hard',
    name: 'Hard',
    badge: 'Level 4',
    color: 'amber',
    description: 'Calculates shortest expected paths and tracks distance to winning square 100.',
    depthOrDetail: 'Trajectory tracking & board telemetry',
    honestyNote: 'Fair dice rules strictly enforced.',
  },
  {
    level: 5,
    id: 'snakes-expert',
    name: 'Expert',
    badge: 'Level 5',
    color: 'orange',
    description: 'Uses Markov chain probability to compute exact turn-to-finish distributions.',
    depthOrDetail: 'Markov chain finish expectancy',
    honestyNote: 'Telemetry displays real-time mathematical odds; dice remain fair.',
  },
  {
    level: 6,
    id: 'snakes-master',
    name: 'Master',
    badge: 'Level 6 (Master)',
    color: 'rose',
    description: 'Real-time probability analysis comparing player vs bot finish trajectories.',
    depthOrDetail: 'Optimal probability & analytical display',
    honestyNote: 'Full mathematical transparency: genuine 1-6 dice with no artificial cheating.',
  },
];

// Carrom: 7 Levels (Hardest to Easiest: Carrom Master, Grandmaster, Expert, Advanced, Intermediate, Casual, Beginner)
export const CARROM_DIFFICULTIES: DifficultyTier[] = [
  {
    level: 1,
    id: 'carrom-beginner',
    name: 'Beginner',
    badge: 'Level 1',
    color: 'emerald',
    description: 'Aims roughly at nearby pieces with wide angle variance and inconsistent power. Friendly and beatable.',
    depthOrDetail: 'Wide aim jitter (±14°) · Rough power scaling',
  },
  {
    level: 2,
    id: 'carrom-casual',
    name: 'Casual',
    badge: 'Level 2',
    color: 'teal',
    description: 'Attempts simple direct shots without calculating cut angles or accounting for rebounds.',
    depthOrDetail: 'Direct line aim (±9.5° variance) · Simple power',
  },
  {
    level: 3,
    id: 'carrom-intermediate',
    name: 'Intermediate',
    badge: 'Level 3',
    color: 'sky',
    description: 'Prioritizes accessible front-pocket pieces, uses basic cut angles, and slides along the baseline.',
    depthOrDetail: 'Targeted cut angle search (±6.0° variance)',
  },
  {
    level: 4,
    id: 'carrom-advanced',
    name: 'Advanced',
    badge: 'Level 4',
    color: 'amber',
    description: 'Reliably executes moderate cut shots, selects appropriate shot power, and attempts basic rebounds.',
    depthOrDetail: 'Multi-pocket evaluation (±3.8° variance) · Rebound check',
  },
  {
    level: 5,
    id: 'carrom-expert',
    name: 'Expert',
    badge: 'Level 5',
    color: 'purple',
    description: 'Calculates sharp cut angles, baseline positions, and queen-cover opportunities with low error.',
    depthOrDetail: 'Trajectory estimation (±2.0° variance) · Queen-cover priority',
  },
  {
    level: 6,
    id: 'carrom-grandmaster',
    name: 'Grandmaster',
    badge: 'Level 6',
    color: 'orange',
    description: 'Deep multi-candidate shot evaluation, foul risk avoidance, cushion rebounds, and high-accuracy shooting.',
    depthOrDetail: 'Deep candidate search (±0.8° variance) · Foul avoidance',
  },
  {
    level: 7,
    id: 'carrom-master',
    name: 'Carrom Master',
    badge: 'Level 7 (Master)',
    color: 'rose',
    description: 'Peak AI precision. Full lookahead physics simulation, combination shots, rebounds, and tactical positioning.',
    depthOrDetail: 'Full physics simulation rollout · Master precision (±0.2°)',
  },
];

export const CHESS_DIFFICULTIES_HARDEST_FIRST: DifficultyTier[] = [...CHESS_DIFFICULTIES].reverse();
export const CONNECT4_DIFFICULTIES_HARDEST_FIRST: DifficultyTier[] = [...CONNECT4_DIFFICULTIES].reverse();
export const LUDO_DIFFICULTIES_HARDEST_FIRST: DifficultyTier[] = [...LUDO_DIFFICULTIES].reverse();
export const SNAKES_DIFFICULTIES_HARDEST_FIRST: DifficultyTier[] = [...SNAKES_DIFFICULTIES].reverse();
export const CARROM_DIFFICULTIES_HARDEST_FIRST: DifficultyTier[] = [...CARROM_DIFFICULTIES].reverse();

export const MINESWEEPER_DIFFICULTIES_HARDEST_FIRST: DifficultyTier[] = [
  {
    level: 3,
    id: 'hard',
    name: 'Hard (16×16)',
    badge: 'Hard',
    color: 'rose',
    description: 'Expert 16×16 minefield with 45 hidden mines. Requires sharp deductive reasoning.',
    depthOrDetail: '45 Mines · 17.6% Density',
  },
  {
    level: 2,
    id: 'medium',
    name: 'Medium (12×12)',
    badge: 'Medium',
    color: 'amber',
    description: 'Standard 12×12 grid with 24 mines. A balanced challenge of deduction and patience.',
    depthOrDetail: '24 Mines · 16.7% Density',
  },
  {
    level: 1,
    id: 'easy',
    name: 'Easy (9×9)',
    badge: 'Easy',
    color: 'emerald',
    description: 'Introductory 9×9 grid with 10 mines. First-click safety guaranteed.',
    depthOrDetail: '10 Mines · 12.3% Density',
  },
];

export const TICTACTOE_DIFFICULTIES: DifficultyTier[] = [
  {
    level: 1,
    id: 'easy',
    name: 'Rookie',
    badge: 'Easy',
    color: 'emerald',
    description: 'Casual beginner bot. Plays quickly with random moves suitable for warmup.',
    depthOrDetail: 'Randomized Move Selection',
  },
  {
    level: 2,
    id: 'medium',
    name: 'Veteran',
    badge: 'Medium',
    color: 'amber',
    description: 'Smart tactical bot. Blocks winning paths and seizes wins with occasional human-like slips.',
    depthOrDetail: '70% Optimal Play · Defensive Blocker',
  },
  {
    level: 3,
    id: 'hard',
    name: 'Master (Unbeatable)',
    badge: 'Hard',
    color: 'rose',
    description: 'Perfect minimax algorithm. Will never lose a match; best outcome is a draw.',
    depthOrDetail: 'Full Minimax Search · 0% Mistake Rate',
  },
];

export const TICTACTOE_DIFFICULTIES_HARDEST_FIRST: DifficultyTier[] = [...TICTACTOE_DIFFICULTIES].reverse();

export const SUDOKU_DIFFICULTIES_HARDEST_FIRST: DifficultyTier[] = [
  {
    level: 3,
    id: 'hard',
    name: 'Hard',
    badge: 'Hard',
    color: 'rose',
    description: 'Complex puzzle with 56 removed cells (25 initial clues). Requires advanced deduction.',
    depthOrDetail: '25 Initial Clues · 56 Removed',
  },
  {
    level: 2,
    id: 'medium',
    name: 'Medium',
    badge: 'Medium',
    color: 'amber',
    description: 'Balanced challenge with 48 removed cells (33 initial clues).',
    depthOrDetail: '33 Initial Clues · 48 Removed',
  },
  {
    level: 1,
    id: 'easy',
    name: 'Easy',
    badge: 'Easy',
    color: 'emerald',
    description: 'Introductory board with 36 removed cells (45 initial clues). Unique solution guaranteed.',
    depthOrDetail: '45 Initial Clues · 36 Removed',
  },
];

export function getDifficultiesForGame(gameId: string): DifficultyTier[] {
  switch (gameId) {
    case 'chess':
      return CHESS_DIFFICULTIES;
    case 'connect4':
      return CONNECT4_DIFFICULTIES;
    case 'ludo':
      return LUDO_DIFFICULTIES;
    case 'snakes':
      return SNAKES_DIFFICULTIES;
    case 'carrom':
      return CARROM_DIFFICULTIES;
    case 'tictactoe':
      return [...TICTACTOE_DIFFICULTIES_HARDEST_FIRST].reverse();
    default:
      return CONNECT4_DIFFICULTIES;
  }
}

export function getHardestFirstDifficultiesForGame(gameId: string): DifficultyTier[] {
  switch (gameId) {
    case 'chess':
      return CHESS_DIFFICULTIES_HARDEST_FIRST;
    case 'connect4':
      return CONNECT4_DIFFICULTIES_HARDEST_FIRST;
    case 'ludo':
      return LUDO_DIFFICULTIES_HARDEST_FIRST;
    case 'snakes':
      return SNAKES_DIFFICULTIES_HARDEST_FIRST;
    case 'carrom':
      return CARROM_DIFFICULTIES_HARDEST_FIRST;
    case 'tictactoe':
      return TICTACTOE_DIFFICULTIES_HARDEST_FIRST;
    case 'minesweeper':
      return MINESWEEPER_DIFFICULTIES_HARDEST_FIRST;
    case 'sudoku':
      return SUDOKU_DIFFICULTIES_HARDEST_FIRST;
    default:
      return CONNECT4_DIFFICULTIES_HARDEST_FIRST;
  }
}
