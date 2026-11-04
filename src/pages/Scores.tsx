import { useEffect, useState, useCallback } from 'react';
import {
  Trophy,
  Loader2,
  Sparkles,
  Medal,
  Swords,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  History,
  TrendingUp,
  Flame,
  Bot,
  User,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthContext';
import { GAMES } from '@/games/registry';
import PlayerAvatar from '@/components/avatar/PlayerAvatar';
import { getCachedAvatar } from '@/lib/avatarStorage';
import {
  computeUserStats,
  fetchUserGameHistory,
  type UserGameStats,
} from '@/lib/gameRecordsService';
import type { GameRecord } from '@/lib/supabase';

type HighScoreRow = {
  game: string;
  difficulty: string | null;
  score: number;
  score_type: string;
  created_at: string;
};

export default function Scores() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'history' | 'highscores'>('history');
  const [highScores, setHighScores] = useState<HighScoreRow[] | null>(null);
  const [stats, setStats] = useState<UserGameStats | null>(null);
  const [records, setRecords] = useState<GameRecord[] | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rawName = profile?.display_name || profile?.email?.split('@')[0] || 'Player';
  const playerName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const avatar = getCachedAvatar(profile?.email || '', playerName);

  const loadAllData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch user game stats & match history
      const historyResult = await fetchUserGameHistory(user.id, 50);
      setRecords(historyResult.records);
      setFromCache(historyResult.fromCache);

      const computedStats = await computeUserStats(user.id);
      setStats(computedStats);

      // 2. Fetch high scores from game_scores table
      const { data: scoreData, error: scoreErr } = await supabase
        .from('game_scores')
        .select('game, difficulty, score, score_type, created_at')
        .eq('user_id', user.id)
        .order('game', { ascending: true });

      if (scoreErr) {
        console.warn('[Scores] High scores error:', scoreErr.message);
      } else {
        setHighScores(scoreData as HighScoreRow[]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load scores';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAllData();

    // Listen for realtime record updates
    const handleRecordAdded = () => {
      loadAllData();
    };
    window.addEventListener('haya_game_record_added', handleRecordAdded);
    return () => window.removeEventListener('haya_game_record_added', handleRecordAdded);
  }, [loadAllData]);

  const lookupGame = (id: string) => GAMES.find((g) => g.id === id);

  return (
    <div className="mx-auto max-w-5xl px-3 xs:px-4 sm:px-6 lg:px-8 py-5 xs:py-8 sm:py-12 space-y-6 sm:space-y-8 animate-in">
      {/* Header Profile Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <PlayerAvatar
            config={avatar}
            name={playerName}
            size="lg"
            className="shrink-0 ring-2 ring-amber-400/30"
          />
          <div>
            <div className="token-badge mb-1 xs:mb-1.5 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              <span>PLAYER ARCHIVE &amp; SCORES</span>
            </div>
            <h1
              className="text-xl xs:text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Arcade Hall of Records
            </h1>
            <p className="text-slate-400 text-xs xs:text-sm mt-0.5">
              Match statistics &amp; personal bests for{' '}
              <strong className="text-amber-400">{playerName}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => loadAllData()}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-400 hover:border-slate-700 transition"
            title="Refresh statistics"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <span
            className={`text-xs font-mono px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
              fromCache
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                fromCache ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
              }`}
            />
            <span>{fromCache ? 'LOCAL CACHE ACTIVE' : 'SUPABASE SYNCED'}</span>
          </span>
        </div>
      </div>

      {/* Overview Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="arcade-cabinet p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
            <span>TOTAL PLAYED</span>
            <Swords className="h-4 w-4 text-sky-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-slate-100">
            {stats ? stats.totalPlayed : '—'}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1">Across all machines</span>
        </div>

        <div className="arcade-cabinet p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-mono mb-2">
            <span>VICTORIES</span>
            <Trophy className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-300">
            {stats ? stats.wins : '—'}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1">
            {stats && stats.totalPlayed > 0 ? `${stats.winPercentage}% Win Rate` : 'No matches yet'}
          </span>
        </div>

        <div className="arcade-cabinet p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-400 text-xs font-mono mb-2">
            <span>DEFEATS</span>
            <XCircle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-rose-300">
            {stats ? stats.losses : '—'}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1">
            {stats ? `${stats.draws} Draws / Stalemate` : '—'}
          </span>
        </div>

        <div className="arcade-cabinet p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-400 text-xs font-mono mb-2">
            <span>WIN ACCURACY</span>
            <TrendingUp className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-amber-300">
            {stats ? `${stats.winPercentage}%` : '—'}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1">Combat efficiency</span>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition ${
            activeTab === 'history'
              ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <History className="h-4 w-4" />
          <span>Match History ({records?.length || 0})</span>
        </button>
        <button
          onClick={() => setActiveTab('highscores')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition ${
            activeTab === 'highscores'
              ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Flame className="h-4 w-4" />
          <span>High-Score Wall ({highScores?.length || 0})</span>
        </button>
      </div>

      {loading && !records && !highScores && (
        <div className="arcade-cabinet p-12 sm:p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
          <span className="font-mono text-xs">SYNCHRONIZING ARCADE DATABASE...</span>
        </div>
      )}

      {error && (
        <div className="arcade-cabinet p-4 sm:p-6 text-rose-300 border-rose-500/30 bg-rose-500/10 text-xs sm:text-sm">
          Couldn&apos;t load scores: {error}
        </div>
      )}

      {/* TAB 1: MATCH HISTORY */}
      {activeTab === 'history' && records && (
        <div className="space-y-3">
          {records.length === 0 ? (
            <div className="arcade-cabinet p-8 sm:p-12 text-center">
              <History className="h-10 w-10 sm:h-12 sm:w-12 text-slate-600 mx-auto mb-3" />
              <h3 className="font-bold text-slate-200 text-base sm:text-lg">No Match History Yet</h3>
              <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-md mx-auto">
                Play any single-player, bot, or multiplayer match to populate your permanent match history.
              </p>
            </div>
          ) : (
            <div className="arcade-cabinet divide-y divide-slate-800/80 overflow-hidden">
              <div className="bg-slate-950/60 p-3 xs:p-4 border-b border-slate-800 flex items-center justify-between text-[11px] sm:text-xs font-mono uppercase tracking-wider text-slate-400">
                <span>Game &amp; Opponent</span>
                <span>Result &amp; Timing</span>
              </div>

              {records.map((r, i) => {
                const g = lookupGame(r.game);
                const Icon = g?.icon ?? Trophy;
                const isWin = r.result === 'win';
                const isLoss = r.result === 'loss';
                const isDraw = r.result === 'draw';

                return (
                  <div
                    key={r.id || `${r.match_id}_${i}`}
                    className="flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 hover:bg-slate-800/30 transition"
                  >
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-slate-950 border border-slate-700/80 flex items-center justify-center text-amber-400 shrink-0">
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-100 flex items-center gap-2 text-sm sm:text-base truncate">
                        <span className="truncate">{g?.name ?? r.game}</span>
                        {r.mode === 'bot' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                            <Bot className="h-2.5 w-2.5" />
                            <span>{r.bot_difficulty || 'Bot'}</span>
                          </span>
                        )}
                        {r.mode === 'multi' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/20">
                            <User className="h-2.5 w-2.5" />
                            <span>vs {r.opponent_name || 'Player'}</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                        {r.duration_seconds && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-500" />
                            <span>{r.duration_seconds}s match</span>
                          </span>
                        )}
                        <span>•</span>
                        <span>{r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Recent'}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold uppercase font-mono tracking-wider border ${
                          isWin
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : isLoss
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                            : isDraw
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                        }`}
                      >
                        {isWin && <CheckCircle2 className="h-3 w-3" />}
                        {isLoss && <XCircle className="h-3 w-3" />}
                        {isDraw && <MinusCircle className="h-3 w-3" />}
                        <span>{r.result}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: HIGH-SCORE WALL */}
      {activeTab === 'highscores' && (
        <div>
          {highScores && highScores.length === 0 ? (
            <div className="arcade-cabinet p-8 sm:p-12 text-center">
              <Trophy className="h-10 w-10 sm:h-12 sm:w-12 text-slate-600 mx-auto mb-3" />
              <h3 className="font-bold text-slate-200 text-base sm:text-lg">No High Scores Yet</h3>
              <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-md mx-auto">
                Step onto the arcade floor and complete a puzzle or game to engrave your first high score on this wall!
              </p>
            </div>
          ) : (
            <div className="arcade-cabinet divide-y divide-slate-800/80 overflow-hidden">
              <div className="bg-slate-950/60 p-3 xs:p-4 border-b border-slate-800 flex items-center justify-between text-[11px] sm:text-xs font-mono uppercase tracking-wider text-slate-400">
                <span>Machine &amp; Setting</span>
                <span>Record Achievement</span>
              </div>

              {(highScores || []).map((r, i) => {
                const g = lookupGame(r.game);
                const Icon = g?.icon ?? Trophy;
                const isTime = r.score_type === 'time';

                return (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 xs:gap-4 p-3 xs:p-4 sm:p-5 hover:bg-slate-800/30 transition"
                  >
                    <div className="h-10 w-10 xs:h-12 xs:w-12 rounded-xl xs:rounded-2xl bg-slate-950 border border-slate-700/80 flex items-center justify-center text-amber-400 shrink-0">
                      <Icon className="h-5 w-5 xs:h-6 xs:w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-100 flex items-center gap-1.5 xs:gap-2 text-sm xs:text-base truncate">
                        <span className="truncate">{g?.name ?? r.game}</span>
                        <Medal className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      </div>
                      <div className="text-[10px] xs:text-xs font-mono text-slate-400 mt-0.5 truncate">
                        {r.difficulty ? `${r.difficulty.toUpperCase()} · ` : ''}
                        {isTime ? 'BEST TIME' : 'MAX SCORE'}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-base xs:text-lg sm:text-xl text-amber-400 font-mono tracking-wider tabular-nums">
                        {isTime ? formatTime(r.score) : r.score.toLocaleString()}
                      </div>
                      <div className="text-[10px] xs:text-[11px] font-mono text-slate-500 mt-0.5">
                        {new Date(r.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}
