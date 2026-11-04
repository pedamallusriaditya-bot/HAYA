import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, Trophy, Footprints, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { generateMaze, type Difficulty, type Maze } from './engine';
import { useHighScore } from '@/lib/useHighScore';
import { useGameRecorder } from '@/lib/useGameRecorder';

export default function MazeGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [maze, setMaze] = useState<Maze>(() => generateMaze('easy'));
  const [pos, setPos] = useState<[number, number]>(maze.start);
  const [start, setStart] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [won, setWon] = useState(false);
  const { best, submit } = useHighScore('maze', difficulty);
  const { recordResult, resetSession } = useGameRecorder('maze', difficulty);

  const touchRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const reset = useCallback((d: Difficulty) => {
    resetSession();
    const m = generateMaze(d);
    setDifficulty(d);
    setMaze(m);
    setPos(m.start);
    setStart(Date.now());
    setElapsed(0);
    setWon(false);
  }, [resetSession]);

  useEffect(() => {
    if (won || start === null) return;
    const t = setInterval(() => setElapsed(Date.now() - start), 100);
    return () => clearInterval(t);
  }, [won, start]);

  useEffect(() => {
    if (!won && pos[0] === maze.exit[0] && pos[1] === maze.exit[1]) {
      setWon(true);
      if (start) {
        const timeMs = Date.now() - start;
        void submit(timeMs, 'time');
        void recordResult({
          result: 'win',
          score: Math.round(timeMs / 1000),
          scoreType: 'time',
          opponentType: 'none',
          botDifficulty: difficulty,
          durationSeconds: Math.round(timeMs / 1000),
        });
      }
    }
  }, [pos, maze.exit, won, start, submit, recordResult, difficulty]);

  const move = useCallback(
    (dr: number, dc: number) => {
      if (won) return;
      setPos(([r, c]) => {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= maze.rows || nc < 0 || nc >= maze.cols) return [r, c];
        if (maze.grid[nr][nc]) return [r, c];
        return [nr, nc];
      });
    },
    [maze, won]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const map: Record<string, [number, number]> = {
        ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
        w: [-1, 0], s: [1, 0], a: [0, -1], d: [0, 1],
      };
      const d = map[e.key];
      if (d) { e.preventDefault(); move(d[0], d[1]); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move]);

  // Touch swipe with persistent ref
  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length > 0) {
      touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (e.changedTouches.length === 0) return;
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) move(0, dx > 0 ? 1 : -1);
    else move(dy > 0 ? 1 : -1, 0);
  }

  const cellSize = maze.cols > 26 ? 13 : maze.cols > 18 ? 16 : 20;

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
              {d}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs xs:text-sm">
          <span className="text-slate-400 tabular-nums font-mono">{(elapsed / 1000).toFixed(1)}s</span>
          {best !== null && <span className="chip bg-amber-500/15 text-amber-300"><Trophy className="h-3 w-3" /> Best {(best / 1000).toFixed(1)}s</span>}
        </div>
      </div>

      {won && (
        <div className="card p-3 sm:p-4 bg-emerald-500/10 border-emerald-500/30 animate-pop">
          <div className="font-semibold text-emerald-300">You reached the exit!</div>
          <p className="text-sm text-emerald-200/80 mt-1">Time: {(elapsed / 1000).toFixed(1)}s</p>
        </div>
      )}

      {/* Maze Container */}
      <div
        className="w-full overflow-x-auto pb-2 flex justify-start sm:justify-center touch-none select-none"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="inline-block mx-auto rounded-2xl bg-slate-900 border border-slate-800 p-2 sm:p-2.5 shadow-xl">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${maze.cols}, ${cellSize}px)`,
              gridTemplateRows: `repeat(${maze.rows}, ${cellSize}px)`,
            }}
          >
            {maze.grid.map((row, r) =>
              row.map((isWall, c) => {
                const isStart = r === maze.start[0] && c === maze.start[1];
                const isExit = r === maze.exit[0] && c === maze.exit[1];
                const isPlayer = pos[0] === r && pos[1] === c;
                return (
                  <div
                    key={`${r}-${c}`}
                    className={`rounded-[2px] transition-colors ${
                      isWall
                        ? 'bg-slate-700'
                        : isExit
                          ? 'bg-emerald-500/80'
                          : isStart
                            ? 'bg-sky-500/40'
                            : 'bg-slate-900'
                    }`}
                  >
                    {isPlayer && (
                      <div className="h-full w-full grid place-items-center">
                        <Footprints className="text-sky-300" style={{ width: cellSize - 4, height: cellSize - 4 }} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Mobile On-Screen D-Pad Controls */}
      <div className="grid grid-cols-3 gap-2 max-w-[190px] mx-auto pt-1 sm:hidden">
        <div />
        <button
          type="button"
          onClick={() => move(-1, 0)}
          className="btn-ghost !py-3 flex items-center justify-center min-h-[44px] active:bg-sky-500/20 active:scale-95"
          aria-label="Move Up"
        >
          <ArrowUp className="h-5 w-5 text-sky-400" />
        </button>
        <div />
        <button
          type="button"
          onClick={() => move(0, -1)}
          className="btn-ghost !py-3 flex items-center justify-center min-h-[44px] active:bg-sky-500/20 active:scale-95"
          aria-label="Move Left"
        >
          <ArrowLeft className="h-5 w-5 text-sky-400" />
        </button>
        <button
          type="button"
          onClick={() => move(1, 0)}
          className="btn-ghost !py-3 flex items-center justify-center min-h-[44px] active:bg-sky-500/20 active:scale-95"
          aria-label="Move Down"
        >
          <ArrowDown className="h-5 w-5 text-sky-400" />
        </button>
        <button
          type="button"
          onClick={() => move(0, 1)}
          className="btn-ghost !py-3 flex items-center justify-center min-h-[44px] active:bg-sky-500/20 active:scale-95"
          aria-label="Move Right"
        >
          <ArrowRight className="h-5 w-5 text-sky-400" />
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-xs text-slate-500 text-center sm:text-left">
          Use the D-pad, swipe on board, or keyboard Arrow keys to reach the green exit.
        </p>
        <button onClick={() => reset(difficulty)} className="btn-ghost !py-2"><RotateCcw className="h-4 w-4" /> New maze</button>
      </div>
    </div>
  );
}
