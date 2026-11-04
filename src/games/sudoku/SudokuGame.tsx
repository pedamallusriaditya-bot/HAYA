import { useCallback, useEffect, useMemo, useState } from 'react';
import { RotateCcw, Check, Eraser, Pencil, Trophy } from 'lucide-react';
import { generatePuzzle, findConflicts, isSolved, type Difficulty, type Board } from './engine';
import { useHighScore } from '@/lib/useHighScore';
import { useGameRecorder } from '@/lib/useGameRecorder';

type Cell = { value: number; isClue: boolean; notes: Set<number> };

function toCells(puzzle: Board): Cell[][] {
  return puzzle.map((row) => row.map((v) => ({ value: v, isClue: v !== 0, notes: new Set<number>() })));
}

export default function SudokuGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [{ puzzle, solution }, setGen] = useState(() => generatePuzzle('medium'));
  const [cells, setCells] = useState<Cell[][]>(() => toCells(puzzle));
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const [won, setWon] = useState(false);

  const { best, submit } = useHighScore('sudoku', difficulty);
  const { recordResult, resetSession } = useGameRecorder('sudoku', difficulty);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed((e) => e + 1000), 1000);
    return () => clearInterval(t);
  }, [running]);

  const conflicts = useMemo(() => {
    const board = cells.map((r) => r.map((c) => c.value));
    return findConflicts(board);
  }, [cells]);

  const reset = useCallback((diff: Difficulty) => {
    resetSession();
    setDifficulty(diff);
    const g = generatePuzzle(diff);
    setGen(g);
    setCells(toCells(g.puzzle));
    setSelected(null);
    setNotesMode(false);
    setElapsed(0);
    setRunning(true);
    setWon(false);
  }, [resetSession]);

  useEffect(() => {
    const board = cells.map((r) => r.map((c) => c.value));
    if (!won && isSolved(board, solution) && !conflicts.size) {
      setWon(true);
      setRunning(false);
      void submit(elapsed, 'time');
      void recordResult({
        result: 'completed',
        score: Math.round(elapsed / 1000),
        scoreType: 'time',
        opponentType: 'none',
        botDifficulty: difficulty,
        durationSeconds: Math.round(elapsed / 1000),
      });
    }
  }, [cells, solution, won, conflicts, elapsed, submit, recordResult, difficulty]);

  function input(n: number) {
    if (!selected || won) return;
    const [r, c] = selected;
    setCells((prev) => {
      const next = prev.map((row) => row.map((cell) => ({ ...cell, notes: new Set(cell.notes) })));
      const cell = next[r][c];
      if (cell.isClue) return prev;
      if (notesMode) {
        if (cell.value) cell.value = 0;
        if (cell.notes.has(n)) cell.notes.delete(n);
        else cell.notes.add(n);
      } else {
        cell.value = cell.value === n ? 0 : n;
        cell.notes.clear();
      }
      return next;
    });
  }

  function erase() {
    if (!selected) return;
    const [r, c] = selected;
    setCells((prev) => {
      const next = prev.map((row) => row.map((cell) => ({ ...cell, notes: new Set(cell.notes) })));
      const cell = next[r][c];
      if (cell.isClue) return prev;
      cell.value = 0;
      cell.notes.clear();
      return next;
    });
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!selected) return;
    const [r, c] = selected;
    if (e.key >= '1' && e.key <= '9') input(Number(e.key));
    else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') erase();
    else if (e.key === 'ArrowUp' && r > 0) setSelected([r - 1, c]);
    else if (e.key === 'ArrowDown' && r < 8) setSelected([r + 1, c]);
    else if (e.key === 'ArrowLeft' && c > 0) setSelected([r, c - 1]);
    else if (e.key === 'ArrowRight' && c < 8) setSelected([r, c + 1]);
  }

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, notesMode, won]);

  const selectedValue = selected ? cells[selected[0]][selected[1]].value : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => reset(d)}
              className={`btn !py-1.5 !px-3 capitalize ${difficulty === d ? 'btn-primary' : 'btn-ghost'}`}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400 tabular-nums">{formatTime(elapsed)}</span>
          {best !== null && <span className="chip bg-amber-500/15 text-amber-300"><Trophy className="h-3 w-3" /> Best {formatTime(best)}</span>}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-center lg:items-start justify-center">
        {/* Board */}
        <div className="w-full max-w-[min(100%,420px)] mx-auto flex justify-center">
          <div className="w-full aspect-square rounded-2xl bg-slate-900 border border-slate-800 p-1 xs:p-2 sm:p-3 shadow-2xl flex flex-col justify-center">
            <div className="grid grid-cols-9 grid-rows-9 w-full h-full aspect-square gap-0">
              {cells.map((row, r) =>
                row.map((cell, c) => {
                  const isSel = selected && selected[0] === r && selected[1] === c;
                  const sameVal = selectedValue && cell.value === selectedValue;
                  const conflict = conflicts.has(`${r},${c}`);
                  const boxBorderR = (c + 1) % 3 === 0 && c < 8;
                  const boxBorderB = (r + 1) % 3 === 0 && r < 8;
                  return (
                    <button
                      key={`${r}-${c}`}
                      onClick={() => !cell.isClue && setSelected([r, c])}
                      className={`relative aspect-square w-full h-full flex items-center justify-center text-sm xs:text-base sm:text-lg font-semibold tabular-nums transition select-none
                        ${isSel ? 'bg-sky-500/30 ring-1 sm:ring-2 ring-sky-400 z-10' : sameVal ? 'bg-sky-500/10' : 'hover:bg-slate-800/60 active:bg-slate-800'}
                        ${cell.isClue ? 'text-slate-100 font-bold' : 'text-sky-300'}
                        ${conflict ? 'text-rose-400 bg-rose-500/10' : ''}
                        ${boxBorderR ? 'border-r-2 border-r-slate-500' : 'border-r border-r-slate-800/60'}
                        ${boxBorderB ? 'border-b-2 border-b-slate-500' : 'border-b border-b-slate-800/60'}
                      `}
                    >
                      {cell.value !== 0 ? (
                        cell.value
                      ) : cell.notes.size > 0 ? (
                        <span className="grid grid-cols-3 gap-0 text-[6px] xs:text-[7px] sm:text-[9px] text-slate-500 leading-none">
                          {Array.from({ length: 9 }, (_, i) => (
                            <span key={i}>{cell.notes.has(i + 1) ? i + 1 : ''}</span>
                          ))}
                        </span>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="w-full max-w-[min(100%,420px)] lg:w-64 space-y-3 sm:space-y-4">
          {won && (
            <div className="card p-3 sm:p-4 bg-emerald-500/10 border-emerald-500/30 animate-pop">
              <div className="flex items-center gap-2 text-emerald-300 font-semibold"><Check className="h-5 w-5" /> Solved!</div>
              <p className="text-sm text-emerald-200/80 mt-1">Time: {formatTime(elapsed)}</p>
            </div>
          )}
          <div className="card p-3 sm:p-4 space-y-3">
            <div className="flex gap-2">
              <button onClick={() => setNotesMode((n) => !n)} className={`btn flex-1 !py-2.5 ${notesMode ? 'btn-primary' : 'btn-ghost'}`}>
                <Pencil className="h-4 w-4" /> Notes {notesMode ? 'ON' : 'OFF'}
              </button>
              <button onClick={erase} title="Erase" className="btn-ghost !py-2.5 !px-4"><Eraser className="h-4 w-4" /></button>
            </div>
            {/* 1-9 keypad: 9 buttons in a row on small mobile, 3x3 on tablet/desktop */}
            <div className="grid grid-cols-9 sm:grid-cols-3 gap-1 sm:gap-2">
              {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => input(n)}
                  className="btn-ghost !py-2.5 sm:!py-3 !px-0 text-base sm:text-lg font-bold tabular-nums min-h-[42px] flex items-center justify-center hover:bg-sky-500/20 active:scale-95 transition"
                >
                  {n}
                </button>
              ))}
            </div>
            <button onClick={() => reset(difficulty)} className="btn-ghost w-full !py-2.5"><RotateCcw className="h-4 w-4" /> New puzzle</button>
          </div>
          <p className="text-xs text-slate-500 text-center lg:text-left">Use keyboard 1-9 or tap the keypad. Backspace to clear.</p>
        </div>
      </div>
    </div>
  );
}

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}
