import { ArrowLeft, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { Link, useRouter } from '@/router';
import { getGame } from '@/games/registry';
import SudokuGame from '@/games/sudoku/SudokuGame';
import MinesweeperGame from '@/games/minesweeper/MinesweeperGame';
import Game2048 from '@/games/game2048/Game2048';
import MazeGame from '@/games/maze/MazeGame';
import MemoryGame from '@/games/memory/MemoryGame';
import TicTacToeGame from '@/games/tictactoe/TicTacToeGame';
import ChessGame from '@/games/chess/ChessGame';
import Connect4Game from '@/games/connect4/Connect4Game';
import LudoGame from '@/games/ludo/LudoGame';
import SnakesGame from '@/games/snakes/SnakesGame';
import CarromGame from '@/games/carrom/CarromGame';

export default function GamePlay({ gameId }: { gameId: string }) {
  const game = getGame(gameId);
  const { navigate } = useRouter();
  const [showRules, setShowRules] = useState(false);

  if (!game || game.status !== 'playable') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center animate-in">
        <h1 className="text-2xl font-bold mb-2 text-slate-100" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Machine Under Repair
        </h1>
        <p className="text-slate-400 mb-6">This arcade cabinet is currently being calibrated by our engineers.</p>
        <Link to="/" className="btn-primary">Return to Arcade Floor</Link>
      </div>
    );
  }

  const backRoute = game.mode === 'multi' ? '/multiplayer' : '/singleplayer';

  return (
    <div className="mx-auto max-w-5xl px-2 xs:px-3 sm:px-6 lg:px-8 py-3 sm:py-6 animate-in">
      <div className="flex items-center justify-between gap-2 mb-3 sm:mb-5">
        <button
          onClick={() => navigate(backRoute)}
          className="btn-ghost !py-1.5 !px-2.5 sm:!py-2 sm:!px-3.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1 shrink-0"
          title="Exit to lobby"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden xs:inline">Exit Machine</span>
          <span className="xs:hidden">Exit</span>
        </button>

        <div className="text-center min-w-0 flex-1 px-1">
          <div className="inline-flex items-center gap-1.5">
            <span className="token-badge !text-[9px] !px-2 !py-0.5">
              {game.mode === 'multi' ? '2P ARCADE' : '1P ARCADE'}
            </span>
          </div>
          <h1 className="text-base xs:text-xl sm:text-2xl font-black tracking-tight text-slate-100 truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {game.name}
          </h1>
        </div>

        <button
          onClick={() => setShowRules((s) => !s)}
          className={`btn-ghost !py-1.5 !px-2.5 sm:!py-2 sm:!px-3.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 ${
            showRules ? 'bg-amber-400/20 text-amber-300 border-amber-400/40' : ''
          }`}
          title="View game rules"
        >
          <BookOpen className="h-4 w-4" />
          <span>Rules</span>
        </button>
      </div>

      {showRules && (
        <div className="arcade-cabinet p-4 sm:p-5 mb-4 animate-pop border-amber-400/40">
          <h2 className="font-bold text-amber-400 mb-2 flex items-center gap-2 text-xs sm:text-sm uppercase tracking-wider">
            <span>📜 {game.name} Instructions</span>
          </h2>
          <ul className="space-y-1.5 text-xs sm:text-sm text-slate-300 list-disc list-inside">
            {game.rules.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}

      <div className="arcade-cabinet p-2.5 xs:p-3.5 sm:p-6 lg:p-7">
        {gameId === 'sudoku' && <SudokuGame />}
        {gameId === 'minesweeper' && <MinesweeperGame />}
        {gameId === '2048' && <Game2048 />}
        {gameId === 'maze' && <MazeGame />}
        {gameId === 'memory' && <MemoryGame />}
        {gameId === 'tictactoe' && <TicTacToeGame />}
        {gameId === 'chess' && <ChessGame />}
        {gameId === 'connect4' && <Connect4Game />}
        {gameId === 'ludo' && <LudoGame />}
        {gameId === 'snakes' && <SnakesGame />}
        {gameId === 'carrom' && <CarromGame />}
      </div>
    </div>
  );
}
