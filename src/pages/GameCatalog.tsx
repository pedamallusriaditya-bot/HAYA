import { useMemo, useState } from 'react';
import { Search, ArrowRight, Clock, Sparkles } from 'lucide-react';
import { GAMES, type GameMeta } from '@/games/registry';
import { Link } from '@/router';

export default function GameCatalog({ mode }: { mode: 'single' | 'multi' }) {
  const [query, setQuery] = useState('');
  const games = useMemo(
    () =>
      GAMES.filter((g) => g.mode === mode).filter((g) =>
        `${g.name} ${g.tagline} ${g.description}`.toLowerCase().includes(query.toLowerCase())
      ),
    [mode, query]
  );

  const title = mode === 'single' ? 'Single-Player Arcade Cabinets' : 'Multiplayer Battle Stations';
  const subtitle =
    mode === 'single'
      ? 'Classic puzzle & arcade machines. Personal bests and high scores recorded to your profile.'
      : 'Online match-linked machines & calibrated arcade CPU bots.';

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-5 sm:py-10 space-y-6 sm:space-y-8 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="token-badge mb-2">
            <Sparkles className="h-3 w-3" />
            {mode === 'single' ? '1-PLAYER VAULT' : '2-PLAYER ARENA'}
          </div>
          <h1 className="text-2xl xs:text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-100" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {title}
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">{subtitle}</p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            className="input pl-10 text-xs sm:text-sm"
            placeholder="Search cabinets..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {games.length === 0 ? (
        <div className="arcade-cabinet p-8 sm:p-12 text-center text-slate-400 text-sm">
          No cabinets match &quot;{query}&quot;.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {games.map((g, i) => (
            <GameCard key={g.id} game={g} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function GameCard({ game, index }: { game: GameMeta; index: number }) {
  const playable = game.status === 'playable';
  return (
    <div
      className={`p-4 sm:p-6 flex flex-col justify-between transition-all ${
        playable ? 'arcade-cabinet hover:border-amber-400/60' : 'rounded-2xl bg-slate-900/40 border border-slate-800/80 opacity-75'
      }`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="h-12 w-12 rounded-2xl bg-slate-950 border border-slate-700/80 flex items-center justify-center text-amber-400">
            <game.icon className="h-6 w-6" />
          </div>
          <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
            playable ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            {playable ? 'ONLINE' : 'NEXT UP'}
          </span>
        </div>

        <h3 className="font-bold text-lg text-slate-100" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {game.name}
        </h3>
        <p className="text-xs text-amber-400/90 font-mono mb-2">{game.tagline}</p>
        <p className="text-xs text-slate-400 line-clamp-3 mb-5">{game.description}</p>
      </div>

      <div>
        {playable ? (
          <Link
            to={`/play/${game.id}`}
            className="btn-primary w-full py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
          >
            <span>Play Cabinet</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <div className="text-xs text-slate-500 font-mono text-center py-2 bg-slate-950/40 rounded-xl border border-slate-800/60 flex items-center justify-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>Under Calibration</span>
          </div>
        )}
      </div>
    </div>
  );
}
