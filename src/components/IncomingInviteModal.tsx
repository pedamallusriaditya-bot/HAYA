import { useEffect, useState } from 'react';
import { useMultiplayer } from '@/context/MultiplayerContext';
import { getGame } from '@/games/registry';
import { Sparkles, Swords, Check, X } from 'lucide-react';
import { PlayerAvatar } from '@/components/avatar/PlayerAvatar';

export default function IncomingInviteModal() {
  const { incomingInvite, acceptIncomingInvite, declineIncomingInvite } = useMultiplayer();
  const [secondsLeft, setSecondsLeft] = useState(45);

  useEffect(() => {
    if (!incomingInvite) return;
    const calculateSeconds = () => Math.max(0, Math.ceil((incomingInvite.expiresAt - Date.now()) / 1000));
    setSecondsLeft(calculateSeconds());

    const timer = setInterval(() => {
      const remaining = calculateSeconds();
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [incomingInvite]);

  if (!incomingInvite) return null;

  const game = getGame(incomingInvite.gameId);

  return (
    <div className="fixed top-[max(1rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] xs:w-[calc(100%-2rem)] max-w-md animate-in">
      <div className="arcade-cabinet p-4 xs:p-5 border-2 border-amber-400 bg-slate-950/95 shadow-2xl shadow-amber-500/25 ring-4 ring-amber-400/20">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="token-badge !bg-amber-500/20 !border-amber-400 !text-amber-300">
            <Sparkles className="h-3 w-3" />
            INCOMING ARCADE CHALLENGE
          </div>
          <span className="font-mono text-xs font-bold text-amber-400 tabular-nums">
            {secondsLeft}s
          </span>
        </div>

        <div className="flex items-center gap-3.5 mb-4">
          <div className="shrink-0 relative">
            <PlayerAvatar
              config={incomingInvite.fromAvatar}
              name={incomingInvite.fromName}
              size="md"
            />
            <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-amber-500 text-slate-950 shadow-md">
              <Swords className="h-3 w-3" />
            </span>
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-base leading-tight">
              {incomingInvite.fromName} challenged you to a match!
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Game: <strong className="text-amber-300 font-semibold">{game?.name || incomingInvite.gameId}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={acceptIncomingInvite}
            className="btn-arcade-teal flex-1 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
          >
            <Check className="h-4 w-4" />
            <span>Accept Match</span>
          </button>
          <button
            onClick={declineIncomingInvite}
            className="btn-ghost flex-1 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 hover:text-rose-400 hover:border-rose-500/40"
          >
            <X className="h-4 w-4" />
            <span>Decline</span>
          </button>
        </div>
      </div>
    </div>
  );
}
