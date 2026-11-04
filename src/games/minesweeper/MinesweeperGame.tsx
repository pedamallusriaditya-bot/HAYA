import { useCallback, useEffect, useState } from 'react';
import { RotateCcw, Flag, Bomb, Trophy } from 'lucide-react';
import {
  CONFIG,
  createInitialBoard,
  startBoard,
  revealCell,
  toggleFlag,
  checkWin,
  revealAllMines,
  type Difficulty,
} from './engine';
import { useHighScore } from '@/lib/useHighScore';
import { useGameRecorder } from '@/lib/useGameRecorder';

const NUM_COLORS = [
  '',
  'text-sky-400',
  'text-emerald-400',
  'text-amber-400',
  'text-fuchsia-400',
  'text-rose-400',
  'text-cyan-400',
  'text-orange-400',
  'text-slate-300',
];

export default function MinesweeperGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [state, setState] = useState(() => createInitialBoard('easy'));
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [flags, setFlags] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [flagMode, setFlagMode] = useState(false);
  const { best, submit } = useHighScore('minesweeper', difficulty);
  const { recordResult, resetSession } = useGameRecorder('minesweeper', difficulty);

  useEffect(() => {
    if (status !== 'playing' || startTime === null) return;
    const t = setInterval(() => setElapsed(Date.now() - startTime), 100);
    return () => clearInterval(t);
  }, [status, startTime]);

  const reset = useCallback((d: Difficulty) => {
    resetSession();
    setDifficulty(d);
    setState(createInitialBoard(d));
    setStatus('playing');
    setFlags(0);
    setStartTime(null);
    setElapsed(0);
    setFlagMode(false);
  }, [resetSession]);

  function handleFlagAction(r: number, c: number) {
    if (status !== 'playing') return;
    const cell = state.board[r][c];
    if (cell.revealed) return;
    const next = toggleFlag(state.board, r, c);
    setState({ board: next, difficulty: state.difficulty, started: state.started });
    setFlags(next.flat().filter((x) => x.flagged).length);
  }

  function onClick(r: number, c: number) {
    if (status !== 'playing') return;
    if (flagMode) {
      handleFlagAction(r, c);
      return;
    }
    let board = state.board;
    if (!state.started) {
      board = startBoard(state.board, CONFIG[state.difficulty].mines, r, c);
      setState({ board, difficulty: state.difficulty, started: true });
      setStartTime(Date.now());
    }
    const cell = board[r][c];
    if (cell.flagged || cell.revealed) return;
    const { board: next, hitMine } = revealCell(board, r, c);
    if (hitMine) {
      setState({ board: revealAllMines(next), difficulty: state.difficulty, started: true });
      setStatus('lost');
      const timeSpent = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
      void recordResult({
        result: 'loss',
        score: timeSpent,
        scoreType: 'time',
        opponentType: 'none',
        botDifficulty: difficulty,
        durationSeconds: timeSpent,
      });
    } else if (checkWin(next)) {
      setState({ board: next, difficulty: state.difficulty, started: true });
      setStatus('won');
      setStartTime((s) => {
        if (s) {
          const duration = Date.now() - s;
          void submit(duration, 'time');
          void recordResult({
            result: 'win',
            score: Math.round(duration / 1000),
            scoreType: 'time',
            opponentType: 'none',
            botDifficulty: difficulty,
            durationSeconds: Math.round(duration / 1000),
          });
        }
        return s;
      });
    } else {
      setState({ board: next, difficulty: state.difficulty, started: true });
    }
  }

  function onRightClick(e: React.MouseEvent, r: number, c: number) {
    e.preventDefault();
    handleFlagAction(r, c);
  }

  const cfg = CONFIG[difficulty];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 xs:gap-2">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => reset(d)}
              className={`btn !py-1.5 !px-2.5 xs:!px-3 capitalize text-xs xs:text-sm ${difficulty === d ? 'btn-primary' : 'btn-ghost'}`}
            >
              {d} <span className="opacity-60 ml-1">({CONFIG[d].mines})</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 xs:gap-3 text-xs xs:text-sm">
          {/* Flag Mode Mobile Toggle */}
          <button
            onClick={() => setFlagMode((f) => !f)}
            className={`btn !py-1.5 !px-3 text-xs flex items-center gap-1.5 transition ${
              flagMode ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-lg shadow-amber-500/20' : 'btn-ghost text-slate-300'
            }`}
          >
            <Flag className={`h-3.5 w-3.5 ${flagMode ? 'fill-slate-950 text-slate-950' : 'text-amber-400'}`} />
            <span>Flag Mode: {flagMode ? 'ON' : 'OFF'}</span>
          </button>
          <span className="chip bg-slate-800 text-slate-300"><Flag className="h-3 w-3 text-amber-400" /> {flags}/{cfg.mines}</span>
          <span className="text-slate-400 tabular-nums">{(elapsed / 1000).toFixed(1)}s</span>
          {best !== null && <span className="chip bg-amber-500/15 text-amber-300"><Trophy className="h-3 w-3" /> Best {(best / 1000).toFixed(1)}s</span>}
        </div>
      </div>

      {status !== 'playing' && (
        <div className={`card p-3 sm:p-4 animate-pop ${status === 'won' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
          <div className={`font-semibold flex items-center gap-2 ${status === 'won' ? 'text-emerald-300' : 'text-rose-300'}`}>
            {status === 'won' ? 'You cleared the field!' : 'You hit a mine.'}
          </div>
          <p className="text-sm text-slate-300 mt-1">
            {status === 'won' ? `Time: ${(elapsed / 1000).toFixed(1)}s` : 'Try again with a new board.'}
          </p>
        </div>
      )}

      {/* Board Scroll/Center Container */}
      <div className="w-full overflow-x-auto pb-2 flex justify-start sm:justify-center">
        <div className="inline-block mx-auto min-w-fit">
          <div
            className="grid gap-1 bg-slate-900 border border-slate-800 p-2 sm:p-3 rounded-2xl shadow-xl"
            style={{ gridTemplateColumns: `repeat(${cfg.cols}, minmax(0, 1fr))` }}
          >
            {state.board.map((row, r) =>
              row.map((cell, c) => (
                <button
                  key={`${r}-${c}`}
                  onClick={() => onClick(r, c)}
                  onContextMenu={(e) => onRightClick(e, r, c)}
                  className={`h-7 w-7 xs:h-8 xs:w-8 sm:h-8 sm:w-8 text-xs xs:text-sm font-bold rounded grid place-items-center select-none transition active:scale-95
                    ${cell.revealed
                      ? cell.isMine
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-800/60 text-slate-200'
                      : 'bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-slate-100'}
                    ${!cell.revealed ? 'shadow-sm' : ''}`}
                >
                  {cell.revealed
                    ? cell.isMine
                      ? <Bomb className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      : cell.adjacent > 0
                        ? <span className={NUM_COLORS[cell.adjacent]}>{cell.adjacent}</span>
                        : ''
                    : cell.flagged
                      ? <Flag className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400 fill-amber-400" />
                      : ''}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-xs text-slate-400 text-center sm:text-left">
          {flagMode ? '🚩 Flag Mode Active: Tap any cell to place/remove a flag.' : 'Tap to reveal. Switch to Flag Mode or right-click to flag mines.'}
        </p>
        <button onClick={() => reset(difficulty)} className="btn-ghost !py-2"><RotateCcw className="h-4 w-4" /> New board</button>
      </div>
    </div>
  );
}
