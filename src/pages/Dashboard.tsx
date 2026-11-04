import { Link } from '@/router';
import { ArrowRight, Bot, Users, Play, Sparkles, Trophy, Palette } from 'lucide-react';
import { SINGLE_GAMES, MULTI_GAMES } from '@/games/registry';
import { useAuth } from '@/auth/AuthContext';
import { useState, useEffect } from 'react';
import PlayerAvatar from '@/components/avatar/PlayerAvatar';
import { getCachedAvatar } from '@/lib/avatarStorage';
import { computeUserStats, type UserGameStats } from '@/lib/gameRecordsService';
import type { AvatarConfig } from '@/types/avatar';

export default function Dashboard() {
  const { profile } = useAuth();
  const rawName = profile?.display_name || profile?.email?.split('@')[0] || 'Player';
  const playerName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  const [avatar, setAvatar] = useState<AvatarConfig>(() =>
    getCachedAvatar(profile?.email || '', playerName)
  );
  const [stats, setStats] = useState<UserGameStats | null>(null);

  useEffect(() => {
    if (profile?.email) {
      setAvatar(getCachedAvatar(profile.email, playerName));
    }
  }, [profile?.email, playerName]);

  useEffect(() => {
    if (!profile?.id) return;
    void computeUserStats(profile.id).then((s) => setStats(s));

    const handleRecordAdded = () => {
      void computeUserStats(profile.id).then((s) => setStats(s));
    };
    window.addEventListener('haya_game_record_added', handleRecordAdded);
    return () => window.removeEventListener('haya_game_record_added', handleRecordAdded);
  }, [profile?.id]);

  useEffect(() => {
    const handleAvatarUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ email: string; config: AvatarConfig }>;
      if (
        !profile?.email ||
        customEvent.detail?.email?.toLowerCase() === profile.email.toLowerCase()
      ) {
        setAvatar(customEvent.detail.config);
      }
    };
    window.addEventListener('haya_avatar_updated', handleAvatarUpdate);
    return () => window.removeEventListener('haya_avatar_updated', handleAvatarUpdate);
  }, [profile?.email]);

  const tictactoe = MULTI_GAMES.find((g) => g.id === 'tictactoe');

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-5 sm:py-10 space-y-8 sm:space-y-12 animate-in">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800/80 sm:border-2 p-5 sm:p-8 lg:p-10 shadow-2xl">
        {/* Subtle arcade background lighting */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative grid md:grid-cols-12 gap-6 lg:gap-8 items-center">
          {/* Headline & Pitch */}
          <div className="md:col-span-7 lg:col-span-7 space-y-3.5 sm:space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/avatar"
                className="inline-flex items-center gap-2.5 p-1.5 pr-3 rounded-full bg-slate-900/90 border border-slate-700/80 hover:border-amber-400/60 transition group"
                title="Customize your 2D Character"
              >
                <PlayerAvatar config={avatar} size="xs" />
                <span className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5">
                  <span>READY: {avatar.displayName || playerName}</span>
                  <span className="text-[10px] text-slate-400 group-hover:text-amber-400 transition">
                    (CUSTOMIZE)
                  </span>
                </span>
              </Link>

              {stats && stats.totalPlayed > 0 && (
                <Link
                  to="/scores"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 hover:border-amber-400/60 text-xs font-mono font-bold text-amber-300 transition"
                  title="View your Hall of Records"
                >
                  <Trophy className="h-3.5 w-3.5 text-amber-400" />
                  <span>{stats.wins} WINS ({stats.winPercentage}%)</span>
                </Link>
              )}
            </div>

            <h1
              className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-100 uppercase leading-[1.15]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              YOUR GAME. <br />
              <span className="bg-gradient-to-r from-amber-400 via-rose-400 to-teal-300 bg-clip-text text-transparent">
                YOUR RULES.
              </span>{' '}
              <br />
              PRESS PLAY.
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm lg:text-base max-w-lg leading-relaxed">
              Step inside HAYA. Pick a machine, beat a challenge, or call a friend to play.
              High scores saved directly to your player profile.
            </p>

            <div className="pt-2 flex flex-col xs:flex-row gap-2.5 sm:gap-3">
              <a
                href="#arcade-floor"
                className="btn-primary py-2.5 sm:py-3 px-4 sm:px-5 text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 w-full xs:w-auto"
              >
                <Play className="h-4 w-4 fill-slate-950" />
                <span>Enter Arcade Floor</span>
              </a>

              <Link
                to="/avatar"
                className="btn-ghost py-2.5 sm:py-3 px-4 sm:px-5 text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:border-amber-400/50 w-full xs:w-auto text-amber-300"
              >
                <Palette className="h-4 w-4 text-amber-400" />
                <span>Avatar Studio</span>
              </Link>

              <Link
                to="/play/tictactoe"
                className="btn-ghost py-2.5 sm:py-3 px-4 sm:px-5 text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:border-teal-400/50 w-full xs:w-auto"
              >
                <Bot className="h-4 w-4 text-teal-400" />
                <span>Challenge Bot</span>
              </Link>
            </div>
          </div>

          {/* Miniature Custom Arcade Cabinet Illustration (Hidden on small mobile, visible md+) */}
          <div className="hidden md:flex md:col-span-5 justify-center">
            <div className="relative w-64 sm:w-72 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 rounded-3xl border-4 border-slate-700/80 p-4 shadow-2xl shadow-amber-500/10">
              {/* Marquee */}
              <div className="rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-teal-400 p-0.5 shadow-md shadow-amber-500/20 mb-3">
                <div className="bg-slate-950 rounded-[10px] py-2 px-3 text-center">
                  <span className="font-black text-xs uppercase tracking-widest text-amber-300 flex items-center justify-center gap-1.5 font-mono">
                    <Sparkles className="h-3 w-3 text-amber-400" />
                    HAYA ARCADE 1984
                  </span>
                </div>
              </div>

              {/* CRT Screen with Animated Grid */}
              <div className="arcade-screen h-36 flex flex-col justify-between p-3 border border-slate-700/80 mb-3">
                <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400">
                  <span>{playerName.toUpperCase()}: {stats ? `${stats.wins} W` : 'READY'}</span>
                  <span className="animate-pulse">● LIVE</span>
                </div>
                <div className="text-center">
                  <div className="inline-block p-2 rounded-xl bg-slate-900/90 border border-slate-700 text-xs font-mono text-amber-300 font-bold">
                    ARCADE ENGINE
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">
                    {stats && stats.totalPlayed > 0 ? `${stats.totalPlayed} MATCHES ARCHIVED` : 'INSERT COIN / SELECT GAME'}
                  </div>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                  <span>SYSTEM READY</span>
                  <span>CREDITS: {stats?.totalPlayed ?? 0}</span>
                </div>
              </div>

              {/* Controls Deck */}
              <div className="rounded-xl bg-slate-900 border border-slate-700 p-3 mb-2 flex items-center justify-between">
                {/* Joystick */}
                <div className="relative w-10 h-10 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center">
                    <div className="w-3.5 h-3.5 rounded-full bg-rose-500 shadow-lg shadow-rose-500/50" />
                  </div>
                </div>

                {/* 4 Arcade Push Buttons */}
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-400 shadow-md shadow-amber-400/40" />
                  <span className="w-4 h-4 rounded-full bg-teal-400 shadow-md shadow-teal-400/40" />
                  <span className="w-4 h-4 rounded-full bg-rose-500 shadow-md shadow-rose-500/40" />
                  <span className="w-4 h-4 rounded-full bg-sky-400 shadow-md shadow-sky-400/40" />
                </div>
              </div>

              {/* Coin Door */}
              <div className="flex items-center justify-center gap-4 py-1 text-slate-500">
                <div className="flex items-center gap-1 text-[9px] font-mono">
                  <span className="w-1 h-3.5 bg-amber-400/50 rounded-full inline-block" />
                  <span>25¢</span>
                </div>
                <div className="flex items-center gap-1 text-[9px] font-mono">
                  <span className="w-1 h-3.5 bg-amber-400/50 rounded-full inline-block" />
                  <span>25¢</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Battle Station: Tic-Tac-Toe */}
      {tictactoe && (
        <section className="arcade-cabinet p-5 sm:p-7 border-amber-400/50">
          <div className="grid md:grid-cols-12 gap-5 sm:gap-6 items-center">
            <div className="md:col-span-8 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="token-badge !bg-rose-500/10 !border-rose-400/40 !text-rose-300">
                  FEATURED CABINET
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                  REAL BOT + 2P ONLINE
                </span>
              </div>

              <h2 className="text-xl xs:text-2xl sm:text-3xl font-extrabold text-slate-100" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Tic-Tac-Toe Arena Station
              </h2>

              <p className="text-slate-300 text-xs sm:text-sm max-w-xl leading-relaxed">
                The classic 3x3 grid redesigned for the arcade. Challenge our unbeatable Master Minimax AI,
                or create a private room to battle your friend in real time.
              </p>

              <div className="flex flex-wrap gap-3 sm:gap-4 pt-1 text-[11px] sm:text-xs text-slate-400 font-mono">
                <span className="flex items-center gap-1.5">
                  <Bot className="h-3.5 w-3.5 text-amber-400" /> 3 Difficulty Levels
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-teal-400" /> Instant Invites
                </span>
                <span className="flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5 text-yellow-400" /> Match Records
                </span>
              </div>
            </div>

            <div className="md:col-span-4 flex flex-col xs:flex-row md:flex-col gap-2.5 sm:gap-3 justify-center">
              <Link to="/play/tictactoe" className="btn-primary py-2.5 sm:py-3 px-5 text-center text-xs sm:text-sm font-bold w-full">
                Play vs CPU Bot
              </Link>
              <Link to="/multiplayer" className="btn-ghost py-2.5 sm:py-3 px-5 text-center text-xs sm:text-sm font-bold w-full">
                Online Versus Room
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Arcade Floor: Single Player Machines */}
      <section id="arcade-floor" className="space-y-4 sm:space-y-6 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-800 pb-3 sm:pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="token-badge">FLOOR SECTION 1</span>
            </div>
            <h2 className="text-xl xs:text-2xl sm:text-3xl font-extrabold text-slate-100" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Single-Player Cabinets
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm">
              Tested classic puzzle machines. High scores and personal best times saved automatically.
            </p>
          </div>

          <Link to="/singleplayer" className="text-xs uppercase font-bold tracking-wider text-amber-400 hover:text-amber-300 flex items-center gap-1 self-start sm:self-auto py-1">
            Browse All 5 Machines <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-5">
          {SINGLE_GAMES.map((game) => (
            <div
              key={game.id}
              className="arcade-cabinet p-4 sm:p-5 flex flex-col justify-between group hover:border-amber-400/60"
            >
              <div>
                {/* Cabinet Topper */}
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl bg-slate-950 border border-slate-700/80 flex items-center justify-center text-amber-400 group-hover:text-amber-300 group-hover:scale-105 transition">
                    <game.icon className="h-5 w-5" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    READY
                  </span>
                </div>

                <h3 className="text-sm sm:text-base font-bold text-slate-100 mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {game.name}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 mb-3 sm:mb-4">
                  {game.tagline}
                </p>
              </div>

              <Link
                to={`/play/${game.id}`}
                className="btn-ghost w-full py-2 text-xs font-bold uppercase tracking-wider group-hover:bg-amber-400 group-hover:text-slate-950 group-hover:border-transparent transition-all"
              >
                Insert Coin
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Arcade Floor: Multiplayer Arena */}
      <section className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-800 pb-3 sm:pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="token-badge !bg-teal-500/10 !border-teal-400/40 !text-teal-300">
                FLOOR SECTION 2
              </span>
            </div>
            <h2 className="text-xl xs:text-2xl sm:text-3xl font-extrabold text-slate-100" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Multiplayer Versus Arena
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm">
              Head-to-head multiplayer machines. Snakes &amp; Ladders, Chess, Ludo, and classic table games.
            </p>
          </div>

          <Link to="/multiplayer" className="text-xs uppercase font-bold tracking-wider text-teal-400 hover:text-teal-300 flex items-center gap-1 self-start sm:self-auto py-1">
            View All 6 Battle Stations <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
          {MULTI_GAMES.map((game) => {
            const isPlayable = game.status === 'playable';

            return (
              <div
                key={game.id}
                className={`rounded-2xl p-4 sm:p-5 border transition flex flex-col justify-between ${
                  isPlayable
                    ? 'arcade-cabinet border-amber-400/40'
                    : 'bg-slate-900/40 border-slate-800/80 opacity-80'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-300">
                      <game.icon className="h-5 w-5" />
                    </div>
                    {isPlayable ? (
                      <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        1P CPU + 2P ONLINE
                      </span>
                    ) : (
                      <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        NEXT UPGRADE
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-200 text-sm sm:text-base">{game.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{game.description}</p>
                </div>

                <div className="mt-4 sm:mt-5">
                  {isPlayable ? (
                    <Link
                      to={`/play/${game.id}`}
                      className="btn-primary w-full py-2.5 text-xs font-bold uppercase tracking-wider"
                    >
                      Enter Station
                    </Link>
                  ) : (
                    <div className="text-xs text-slate-500 font-mono text-center py-2 bg-slate-950/50 rounded-xl border border-slate-800/60">
                      Cabinet Being Calibrated
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Arcade Wall Hall of Fame Banner */}
      <section className="arcade-cabinet p-5 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-5 border-slate-700/80 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center gap-3.5 sm:gap-4">
          <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Trophy className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-100 text-base sm:text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Arcade High-Score Wall
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md">
              Personal bests across Sudoku, Minesweeper, 2048, and Maze Runner are saved in your profile.
            </p>
          </div>
        </div>

        <Link to="/scores" className="btn-ghost shrink-0 text-xs font-bold uppercase tracking-wider w-full sm:w-auto">
          Inspect Records
        </Link>
      </section>
    </div>
  );
}
