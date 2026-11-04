import { useState, useEffect } from 'react';
import { useMultiplayer } from '@/context/MultiplayerContext';
import { getGame } from '@/games/registry';
import { Swords, Sparkles, Loader2, X, Play } from 'lucide-react';
import PlayerAvatar from '@/components/avatar/PlayerAvatar';

type FriendMatchStationProps = {
  gameId: string;
  onPlayBot: () => void;
  botDifficultyComponent?: React.ReactNode;
};

export default function FriendMatchStation({
  gameId,
  onPlayBot,
  botDifficultyComponent,
}: FriendMatchStationProps) {
  const { friend, outgoingInvite, sendInvite, cancelOutgoingInvite } = useMultiplayer();
  const game = getGame(gameId);
  const [secondsRemaining, setSecondsRemaining] = useState(45);

  const isPendingForThisGame = outgoingInvite && outgoingInvite.gameId === gameId;

  useEffect(() => {
    if (!isPendingForThisGame) return;

    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((outgoingInvite.expiresAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isPendingForThisGame, outgoingInvite]);

  const isOnline = friend.status === 'online';
  const isInMatch = friend.status === 'in_match';
  const isOffline = friend.status === 'offline';

  return (
    <div className="space-y-6 animate-in">
      {/* Title & Game Badge */}
      <div className="text-center space-y-1">
        <div className="token-badge mb-1">
          <Sparkles className="h-3 w-3" />
          VERSUS LOBBY · {game?.name || 'MULTIPLAYER'}
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Choose How to Play
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto">
          Challenge your friend directly with zero room codes, or battle our calibrated arcade bot immediately.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {/* Station 1: Play with Friend */}
        <div className={`arcade-cabinet p-3.5 xs:p-5 sm:p-6 flex flex-col justify-between border-2 transition-all ${
          isOnline ? 'border-teal-500/50 bg-teal-950/10' : 'border-slate-800 bg-slate-900/60'
        }`}>
          <div>
            {/* Header / Avatar */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <PlayerAvatar
                  config={friend.avatar}
                  name={friend.name}
                  email={friend.email}
                  size="md"
                />
                <div>
                  <h3 className="font-bold text-slate-100 text-base" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {friend.name}
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">Authorized Friend</span>
                </div>
              </div>

              {/* Status Badge */}
              {isOnline && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  ONLINE
                </span>
              )}
              {isInMatch && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  IN MATCH
                </span>
              )}
              {isOffline && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase bg-slate-800 border border-slate-700 text-slate-400">
                  OFFLINE
                </span>
              )}
            </div>

            {/* Status Description */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 mb-6">
              {isOnline && (
                <p>
                  <strong>{friend.name}</strong> is currently active on HAYA. Click below to send an instant game invitation directly to their screen.
                </p>
              )}
              {isInMatch && (
                <p>
                  <strong>{friend.name}</strong> is currently playing a match. You can challenge a bot below or wait for them to finish!
                </p>
              )}
              {isOffline && (
                <p>
                  Your friend isn&apos;t around right now. They&apos;ll see your high scores next time they log in. Play with a bot in the meantime!
                </p>
              )}
            </div>
          </div>

          {/* Action Area */}
          <div>
            {isPendingForThisGame ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                    Waiting for {friend.name} to accept...
                  </span>
                  <span className="font-mono font-bold">{secondsRemaining}s</span>
                </div>
                <button
                  onClick={cancelOutgoingInvite}
                  className="btn-ghost w-full py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 hover:text-rose-400"
                >
                  <X className="h-4 w-4" /> Cancel Invitation
                </button>
              </div>
            ) : (
              <button
                onClick={() => sendInvite(gameId)}
                disabled={!isOnline}
                className="btn-arcade-teal w-full py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Swords className="h-4 w-4" />
                <span>{isOnline ? `Invite ${friend.name} to Play` : `${friend.name} is Offline`}</span>
              </button>
            )}
          </div>
        </div>

        {/* Station 2: Play with a Bot */}
        <div className="arcade-cabinet p-3.5 xs:p-5 sm:p-6 flex flex-col justify-between border-2 border-amber-500/40 bg-amber-950/5">
          <div>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <PlayerAvatar isBot size="md" />
                <div>
                  <h3 className="font-bold text-slate-100 text-base" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Arcade Bot Battle
                  </h3>
                  <span className="text-[11px] font-mono text-amber-400">Instant CPU Match</span>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                ALWAYS READY
              </span>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Play immediately against our computer-controlled opponent. Choose between Rookie, Veteran, or Master Minimax intelligence.
            </p>

            {/* Custom Bot Difficulty Selector if provided */}
            {botDifficultyComponent && (
              <div className="mb-4">
                {botDifficultyComponent}
              </div>
            )}
          </div>

          <button
            onClick={onPlayBot}
            className="btn-primary w-full py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <Play className="h-4 w-4 fill-slate-950" />
            <span>Start Match vs Bot</span>
          </button>
        </div>
      </div>
    </div>
  );
}
