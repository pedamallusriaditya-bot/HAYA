import { useCallback, useEffect, useMemo, useState } from 'react';
import { RotateCcw, Trophy } from 'lucide-react';
import { useHighScore } from '@/lib/useHighScore';
import { useGameRecorder } from '@/lib/useGameRecorder';

import { arcadeAudio } from '@/lib/arcadeAudio';

type Difficulty = 'easy' | 'medium' | 'hard';
const PAIRS: Record<Difficulty, number> = { easy: 6, medium: 8, hard: 12 };

const EMOJIS = ['🎮', '🎲', '🎯', '🏆', '⭐', '🔥', '💎', '🚀', '🎨', '🎭', '🎹', '🧩'];

type Card = { id: number; symbol: string; flipped: boolean; matched: boolean };

function buildDeck(diff: Difficulty): Card[] {
  const n = PAIRS[diff];
  const chosen = EMOJIS.slice(0, n);
  const pairs = [...chosen, ...chosen];
  // shuffle
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs.map((symbol, id) => ({ id, symbol, flipped: false, matched: false }));
}

export default function MemoryGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [cards, setCards] = useState<Card[]>(() => buildDeck('easy'));
  const [first, setFirst] = useState<number | null>(null);
  const [second, setSecond] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [moves, setMoves] = useState(0);
  const [start, setStart] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [won, setWon] = useState(false);
  const { best, submit } = useHighScore('memory', difficulty);
  const { recordResult, resetSession } = useGameRecorder('memory', difficulty);

  const reset = useCallback((d: Difficulty) => {
    resetSession();
    setDifficulty(d);
    setCards(buildDeck(d));
    setFirst(null);
    setSecond(null);
    setBusy(false);
    setMoves(0);
    setStart(null);
    setElapsed(0);
    setWon(false);
  }, [resetSession]);

  useEffect(() => {
    if (won || start === null) return;
    const t = setInterval(() => setElapsed(Date.now() - start), 100);
    return () => clearInterval(t);
  }, [won, start]);

  const allMatched = useMemo(() => cards.length > 0 && cards.every((c) => c.matched), [cards]);

  useEffect(() => {
    if (allMatched && !won) {
      setWon(true);
      arcadeAudio.playWin();
      if (start) {
        const timeMs = Date.now() - start;
        void submit(timeMs, 'time');
        void recordResult({
          result: 'win',
          score: moves,
          scoreType: 'score',
          opponentType: 'none',
          botDifficulty: difficulty,
          durationSeconds: Math.round(timeMs / 1000),
        });
      }
    }
  }, [allMatched, won, start, submit, moves, difficulty, recordResult]);

  function flip(idx: number) {
    if (busy || won) return;
    if (cards[idx].flipped || cards[idx].matched) return;
    if (start === null) setStart(Date.now());

    arcadeAudio.playBlip();
    setCards((prev) => prev.map((c, i) => (i === idx ? { ...c, flipped: true } : c)));

    if (first === null) {
      setFirst(idx);
    } else if (second === null && idx !== first) {
      setSecond(idx);
      setMoves((m) => m + 1);
      setBusy(true);
      const a = first;
      const b = idx;
      setTimeout(() => {
        setCards((prev) => {
          const match = prev[a].symbol === prev[b].symbol;
          if (match) {
            arcadeAudio.playCoin();
          } else {
            arcadeAudio.playDraw();
          }
          return prev.map((c, i) => {
            if (i === a || i === b) {
              return { ...c, flipped: match, matched: match ? true : c.matched };
            }
            return c;
          });
        });
        setFirst(null);
        setSecond(null);
        setBusy(false);
      }, 700);
    }
  }

  const cols =
    difficulty === 'easy'
      ? 'grid-cols-3 xs:grid-cols-4'
      : difficulty === 'medium'
      ? 'grid-cols-4'
      : 'grid-cols-4 sm:grid-cols-6';

  return (
    <div className="space-y-4 sm:space-y-6 max-w-2xl mx-auto">
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
        <div className="flex flex-wrap items-center gap-2 xs:gap-3 text-xs xs:text-sm">
          <span className="chip bg-slate-800 text-slate-300">Moves: {moves}</span>
          <span className="text-slate-400 tabular-nums font-mono">{(elapsed / 1000).toFixed(1)}s</span>
          {best !== null && <span className="chip bg-amber-500/15 text-amber-300"><Trophy className="h-3 w-3" /> Best {(best / 1000).toFixed(1)}s</span>}
        </div>
      </div>

      {won && (
        <div className="card p-3 sm:p-4 bg-emerald-500/10 border-emerald-500/30 animate-pop">
          <div className="font-semibold text-emerald-300">You matched every pair!</div>
          <p className="text-sm text-emerald-200/80 mt-1">{moves} moves in {(elapsed / 1000).toFixed(1)}s</p>
        </div>
      )}

      <div className={`grid ${cols} gap-1.5 xs:gap-2 sm:gap-2.5`}>
        {cards.map((card, i) => (
          <button
            key={card.id}
            onClick={() => flip(i)}
            className={`aspect-square min-h-[44px] rounded-lg xs:rounded-xl sm:rounded-2xl text-2xl xs:text-3xl sm:text-4xl font-bold grid place-items-center transition-all duration-200 select-none ${
              card.flipped || card.matched
                ? `bg-slate-100 text-slate-900 ${card.matched ? 'ring-2 ring-emerald-400 shadow-lg shadow-emerald-500/30' : ''}`
                : 'bg-slate-800 hover:bg-slate-700 active:scale-95'
            }`}
            style={{ perspective: '600px' }}
          >
            {card.flipped || card.matched ? card.symbol : ''}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Flip two cards per move. Match all pairs to win.</p>
        <button onClick={() => reset(difficulty)} className="btn-ghost"><RotateCcw className="h-4 w-4" /> New game</button>
      </div>
    </div>
  );
}
