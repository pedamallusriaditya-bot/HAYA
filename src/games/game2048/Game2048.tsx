import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RotateCcw, Trophy, Undo2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import {
  spawnInitial,
  move,
  addRandomTile,
  canMove,
  hasWon,
  type Grid,
  type Move,
} from './engine';
import { useHighScore } from '@/lib/useHighScore';
import { useGameRecorder } from '@/lib/useGameRecorder';
import { arcadeAudio } from '@/lib/arcadeAudio';

function getTileStyle(value: number): { bg: string; text: string; fontSize: string } {
  // Dynamic font sizing to prevent overflowing large numbers
  let fontSize = 'text-2xl sm:text-3xl md:text-4xl font-extrabold';
  if (value >= 1000) {
    fontSize = 'text-base sm:text-xl md:text-2xl font-black tracking-tight';
  } else if (value >= 100) {
    fontSize = 'text-xl sm:text-2xl md:text-3xl font-black';
  }

  switch (value) {
    case 2:
      return {
        bg: 'bg-[#eee4da] shadow-sm',
        text: 'text-[#6e6357]',
        fontSize,
      };
    case 4:
      return {
        bg: 'bg-[#ede0c8] shadow-sm',
        text: 'text-[#6e6357]',
        fontSize,
      };
    case 8:
      return {
        bg: 'bg-[#f2b179] shadow-md shadow-orange-500/20',
        text: 'text-white',
        fontSize,
      };
    case 16:
      return {
        bg: 'bg-[#f59563] shadow-md shadow-orange-600/30',
        text: 'text-white',
        fontSize,
      };
    case 32:
      return {
        bg: 'bg-[#f67c5f] shadow-lg shadow-rose-500/30',
        text: 'text-white',
        fontSize,
      };
    case 64:
      return {
        bg: 'bg-[#f65e3b] shadow-lg shadow-rose-600/30',
        text: 'text-white',
        fontSize,
      };
    case 128:
      return {
        bg: 'bg-[#edcf72] shadow-lg shadow-yellow-500/40 ring-1 ring-yellow-300',
        text: 'text-slate-950 font-black',
        fontSize,
      };
    case 256:
      return {
        bg: 'bg-[#edcc61] shadow-xl shadow-yellow-500/50 ring-2 ring-yellow-300',
        text: 'text-slate-950 font-black',
        fontSize,
      };
    case 512:
      return {
        bg: 'bg-[#edc850] shadow-xl shadow-amber-500/50 ring-2 ring-amber-300',
        text: 'text-slate-950 font-black',
        fontSize,
      };
    case 1024:
      return {
        bg: 'bg-[#00d26a] shadow-xl shadow-emerald-500/50 ring-2 ring-emerald-300',
        text: 'text-slate-950 font-black',
        fontSize,
      };
    case 2048:
      return {
        bg: 'bg-gradient-to-tr from-amber-400 via-fuchsia-500 to-indigo-500 shadow-2xl shadow-fuchsia-500/50 ring-2 ring-amber-300',
        text: 'text-white font-black',
        fontSize,
      };
    default:
      if (value > 2048) {
        return {
          bg: 'bg-gradient-to-tr from-violet-600 to-rose-600 shadow-2xl ring-2 ring-rose-400',
          text: 'text-white font-black',
          fontSize,
        };
      }
      return {
        bg: 'bg-transparent',
        text: 'text-transparent',
        fontSize,
      };
  }
}

export default function Game2048() {
  const [grid, setGrid] = useState<Grid>(() => spawnInitial());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem('haya-2048-best') ?? '0') || 0);
  const [history, setHistory] = useState<{ grid: Grid; score: number } | null>(null);
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const [keptGoing, setKeptGoing] = useState(false);
  const { best: dbBest, submit } = useHighScore('2048', null);
  const { recordResult, resetSession } = useGameRecorder('2048');

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (dbBest !== null && dbBest > best) {
      setBest(dbBest);
    }
  }, [dbBest, best]);

  const reset = useCallback(() => {
    resetSession();
    setGrid(spawnInitial());
    setScore(0);
    setHistory(null);
    setOver(false);
    setWon(false);
    setKeptGoing(false);
    arcadeAudio.playCoin();
  }, [resetSession]);

  const undo = useCallback(() => {
    if (!history) return;
    setGrid(history.grid);
    setScore(history.score);
    setHistory(null);
    setOver(false);
    arcadeAudio.playBlip();
  }, [history]);

  const doMove = useCallback(
    (dir: Move) => {
      if (over) return;

      const res = move(grid, dir);
      if (!res.moved) return;

      // Save previous state for undo
      setHistory({
        grid: grid.map((r) => [...r]),
        score,
      });

      // Spawn exactly one new tile
      const nextGrid = addRandomTile(res.grid);
      const newScore = score + res.gained;

      setGrid(nextGrid);
      setScore(newScore);

      // Audio feedback
      if (res.gained > 0) {
        arcadeAudio.playScore();
      } else {
        arcadeAudio.playMove(true);
      }

      // Update High Scores
      if (newScore > best) {
        setBest(newScore);
        localStorage.setItem('haya-2048-best', String(newScore));
        void submit(newScore, 'score');
      }

      // Check Victory
      if (hasWon(nextGrid) && !won && !keptGoing) {
        setWon(true);
        arcadeAudio.playWin();
        void recordResult({
          result: 'win',
          score: newScore,
          scoreType: 'score',
          opponentType: 'none',
        });
      }

      // Check Game Over
      if (!canMove(nextGrid)) {
        setOver(true);
        arcadeAudio.playDraw();
        void recordResult({
          result: won ? 'win' : 'completed',
          score: newScore,
          scoreType: 'score',
          opponentType: 'none',
        });
      }
    },
    [grid, score, best, over, won, keptGoing, submit, recordResult]
  );

  // Keyboard navigation (Arrow keys & WASD)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Ignore when user is typing into input, textarea, or contentEditable
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Prevent key repeat duplicate moves
      if (e.repeat) return;

      const key = e.key.toLowerCase();
      let dir: Move | null = null;

      if (e.key === 'ArrowLeft' || key === 'a') dir = 'left';
      else if (e.key === 'ArrowRight' || key === 'd') dir = 'right';
      else if (e.key === 'ArrowUp' || key === 'w') dir = 'up';
      else if (e.key === 'ArrowDown' || key === 's') dir = 'down';

      if (dir) {
        // Prevent default browser scrolling
        e.preventDefault();
        doMove(dir);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [doMove]);

  // Touch & Swipe handlers
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length === 0) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    // Minimum swipe threshold 24px
    if (absX < 24 && absY < 24) return;

    if (absX > absY) {
      doMove(dx > 0 ? 'right' : 'left');
    } else {
      doMove(dy > 0 ? 'down' : 'up');
    }
  };

  return (
    <div className="space-y-4 max-w-[440px] mx-auto select-none animate-in">
      {/* Header: Title, Instructions, Scoreboards, and Actions */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2
            className="text-2xl sm:text-3xl font-black tracking-tight text-slate-100"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            2048
          </h2>
          <p className="text-xs text-slate-400">Join matching numbers to reach 2048</p>
        </div>

        {/* Score & Best Boards */}
        <div className="flex items-center gap-1.5 xs:gap-2">
          {/* Current Score */}
          <div className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-900 border border-slate-800 text-center min-w-[62px] xs:min-w-[72px] sm:min-w-[76px] shadow-md">
            <span className="block text-[9px] xs:text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              SCORE
            </span>
            <span className="text-base sm:text-lg font-black text-slate-100 tabular-nums">
              {score}
            </span>
          </div>

          {/* Best Score */}
          <div className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-900 border border-slate-800 text-center min-w-[62px] xs:min-w-[72px] sm:min-w-[76px] shadow-md">
            <span className="block text-[9px] xs:text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center justify-center gap-1">
              <Trophy className="h-3 w-3" /> BEST
            </span>
            <span className="text-base sm:text-lg font-black text-amber-300 tabular-nums">
              {best}
            </span>
          </div>
        </div>
      </div>

      {/* Action Toolbar: Restart & Undo */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={reset}
          className="btn-primary py-2 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-amber-500/20"
        >
          <RotateCcw className="h-3.5 w-3.5" /> New Game
        </button>

        {history && (
          <button
            type="button"
            onClick={undo}
            className="btn-ghost py-2 px-3.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-slate-300 hover:text-white"
          >
            <Undo2 className="h-3.5 w-3.5" /> Undo
          </button>
        )}
      </div>

      {/* Unified 4x4 2048 Board Container */}
      <div className="relative">
        <div
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="w-full aspect-square mx-auto p-3 sm:p-3.5 rounded-3xl bg-slate-900/95 border-2 border-slate-700/80 shadow-2xl relative touch-none"
        >
          {/* 4x4 Grid of Cells */}
          <div className="grid grid-cols-4 grid-rows-4 gap-2 sm:gap-2.5 w-full h-full">
            {grid.map((row, r) =>
              row.map((val, c) => {
                const style = getTileStyle(val);
                return (
                  <div
                    key={`${r}-${c}`}
                    className="relative rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-center shadow-inner overflow-hidden"
                  >
                    {val !== 0 && (
                      <div
                        className={`absolute inset-0 rounded-2xl flex items-center justify-center ${style.bg} ${style.text} ${style.fontSize} animate-pop transition-all select-none`}
                      >
                        {val}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Victory Overlay Modal */}
          {won && !keptGoing && (
            <div className="absolute inset-0 rounded-3xl bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in z-20">
              <span className="text-4xl mb-2">🏆</span>
              <h3
                className="text-2xl font-black text-amber-400 mb-1"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                You Reached 2048!
              </h3>
              <p className="text-xs text-slate-300 max-w-xs mb-5">
                Outstanding strategic mastery! Continue playing to push for 4096, or start a fresh match.
              </p>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setKeptGoing(true)}
                  className="btn-primary py-2.5 px-5 text-xs font-bold uppercase tracking-wider"
                >
                  Keep Going
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="btn-ghost py-2.5 px-4 text-xs font-bold uppercase tracking-wider"
                >
                  New Game
                </button>
              </div>
            </div>
          )}

          {/* Game Over Overlay Modal */}
          {over && (
            <div className="absolute inset-0 rounded-3xl bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in z-20">
              <span className="text-4xl mb-2">💥</span>
              <h3
                className="text-2xl font-black text-rose-400 mb-1"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Game Over!
              </h3>
              <p className="text-xs text-slate-300 max-w-xs mb-1">
                No legal moves remaining on the board.
              </p>
              <p className="text-sm font-mono font-bold text-amber-300 mb-5">
                Final Score: {score}
              </p>
              <button
                type="button"
                onClick={reset}
                className="btn-primary py-2.5 px-6 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
              >
                <RotateCcw className="h-4 w-4" /> Try Again
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Touch Navigation Controls */}
      <div className="sm:hidden grid grid-cols-3 gap-2 max-w-[200px] mx-auto pt-1">
        <div />
        <button
          type="button"
          onClick={() => doMove('up')}
          className="btn-ghost py-2.5 flex items-center justify-center"
          aria-label="Move Up"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
        <div />
        <button
          type="button"
          onClick={() => doMove('left')}
          className="btn-ghost py-2.5 flex items-center justify-center"
          aria-label="Move Left"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => doMove('down')}
          className="btn-ghost py-2.5 flex items-center justify-center"
          aria-label="Move Down"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => doMove('right')}
          className="btn-ghost py-2.5 flex items-center justify-center"
          aria-label="Move Right"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Footer Instructions */}
      <p className="text-center text-[11px] font-mono text-slate-500">
        Controls: Arrow Keys, WASD, or Swipe on board
      </p>
    </div>
  );
}
