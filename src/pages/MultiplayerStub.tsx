import { Bot, Play, Sparkles, Swords, Clock } from 'lucide-react';
import { MULTI_GAMES } from '@/games/registry';
import { Link } from '@/router';
import { useMultiplayer } from '@/context/MultiplayerContext';

export default function MultiplayerStub() {
  const { friend, sendInvite, outgoingInvite } = useMultiplayer();
  const activeGames = MULTI_GAMES.filter((g) => g.status === 'playable');
  const upcomingGames = MULTI_GAMES.filter((g) => g.status === 'soon');

  const isFriendOnline = friend.status === 'online';
  const isFriendInMatch = friend.status === 'in_match';

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-5 sm:py-10 space-y-6 sm:space-y-10 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 token-badge mb-2">
            <Sparkles className="h-3 w-3" />
            2-PLAYER VERSUS ARENA
          </div>
          <h1 className="text-2xl xs:text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-100" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Multiplayer Arcade
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
            Challenge your friend directly with instant invitations or play against calibrated arcade bots. No room codes needed.
          </p>
        </div>
      </div>

      {/* Live Friend Presence Bar */}
      <div className="arcade-cabinet p-4 sm:p-6 border-slate-700/80 bg-slate-900/90">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl sm:text-4xl select-none shrink-0">{friend.emoji}</span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-extrabold text-slate-100 text-base sm:text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {friend.name}
                </h3>
                {isFriendOnline && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    ONLINE &amp; READY
                  </span>
                )}
                {isFriendInMatch && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/15 border border-amber-500/30 text-amber-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    IN MATCH
                  </span>
                )}
                {!isFriendOnline && !isFriendInMatch && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 border border-slate-700 text-slate-400">
                    OFFLINE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {isFriendOnline
                  ? `${friend.name} is currently connected. Send an instant match challenge to their screen.`
                  : isFriendInMatch
                  ? `${friend.name} is in a match. You can challenge a bot or wait for them to finish.`
                  : `Your friend isn't around right now. Play with an arcade bot in the meantime.`}
              </p>
            </div>
          </div>

          <div className="text-[11px] sm:text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 self-start sm:self-auto shrink-0">
            PRESENCE: <strong className={isFriendOnline ? 'text-emerald-400' : 'text-slate-400'}>{friend.status.toUpperCase()}</strong>
          </div>
        </div>
      </div>

      {/* Active Battle Stations */}
      {activeGames.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h2 className="text-base sm:text-lg font-bold uppercase tracking-wider text-slate-200">
              Active Battle Stations
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {activeGames.map((game) => {
              const isInvitingThis = outgoingInvite && outgoingInvite.gameId === game.id;

              return (
                <div key={game.id} className="arcade-cabinet p-4 sm:p-6 flex flex-col justify-between border-amber-400/40">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
                      <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                        <game.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <span className="token-badge !bg-emerald-500/10 !border-emerald-500/30 !text-emerald-400">
                        ONLINE &amp; BOT
                      </span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-bold text-slate-100 mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {game.name}
                    </h3>
                    <p className="text-slate-400 text-xs sm:text-sm mb-3 sm:mb-4">
                      {game.description}
                    </p>

                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] sm:text-xs mb-4 sm:mb-5 font-mono text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Bot className="h-3.5 w-3.5 text-amber-400" />
                        <span>Minimax CPU</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Swords className="h-3.5 w-3.5 text-teal-400" />
                        <span>Direct Invites</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {isFriendOnline && (
                      <button
                        onClick={() => sendInvite(game.id)}
                        disabled={Boolean(outgoingInvite)}
                        className="btn-arcade-teal w-full py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                      >
                        <Swords className="h-4 w-4" />
                        <span>{isInvitingThis ? 'Invitation Sent...' : `Invite ${friend.name}`}</span>
                      </button>
                    )}

                    <Link
                      to={`/play/${game.id}`}
                      className="btn-primary w-full py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                    >
                      <Play className="h-3.5 w-3.5 fill-slate-950" />
                      <span>Play with Bot</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Upcoming Cabinets */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-slate-500" />
          <h2 className="text-lg font-bold uppercase tracking-wider text-slate-400">
            Work In Progress Cabinets
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {upcomingGames.map((game, i) => (
            <div key={game.id} className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-5 opacity-75">
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center">
                  <game.icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800/90 text-slate-400 border border-slate-700/60">
                  Priority #{i + 1}
                </span>
              </div>
              <h3 className="font-bold text-slate-200">{game.name}</h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{game.tagline}</p>
              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>Friend Invite + Bot</span>
                <span className="text-amber-500/70 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Next
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
