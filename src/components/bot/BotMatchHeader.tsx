import { Bot, ArrowLeft, Volume2, VolumeX, Sparkles, RotateCcw, Loader2 } from 'lucide-react';
import type { DifficultyTier } from './botConfigs';

type BotMatchHeaderProps = {
  tier: DifficultyTier;
  isBotThinking: boolean;
  soundOn: boolean;
  onToggleSound: () => void;
  onExit: () => void;
  onRestart: () => void;
  statusText?: string;
  isGameOver?: boolean;
};

export default function BotMatchHeader({
  tier,
  isBotThinking,
  soundOn,
  onToggleSound,
  onExit,
  onRestart,
  statusText,
  isGameOver = false,
}: BotMatchHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onExit}
          className="btn-ghost !py-1.5 !px-3 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
          title="Exit to lobby station"
        >
          <ArrowLeft className="h-4 w-4" /> Lobby
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <Bot className="h-3.5 w-3.5 text-amber-400" />
          <span className="font-bold text-slate-200">{tier.name}</span>
          <span className="text-[10px] font-mono text-amber-400 uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
            {tier.badge}
          </span>
        </div>

        {isBotThinking && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono animate-pulse">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
            <span>CALCULATING...</span>
          </div>
        )}
      </div>

      {statusText && (
        <div className="text-xs font-bold text-slate-300 px-3 py-1 rounded-xl bg-slate-950/70 border border-slate-800/80 hidden md:block">
          {statusText}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRestart}
          className="btn-ghost !py-1.5 !px-2.5 text-xs font-semibold flex items-center gap-1 text-slate-300 hover:text-white"
          title={isGameOver ? 'Play new match' : 'Restart match'}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>{isGameOver ? 'New Match' : 'Reset'}</span>
        </button>

        <button
          type="button"
          onClick={onToggleSound}
          className="btn-ghost !p-2"
          title={soundOn ? 'Mute arcade audio' : 'Unmute audio'}
        >
          {soundOn ? <Volume2 className="h-4 w-4 text-amber-400" /> : <VolumeX className="h-4 w-4 text-slate-500" />}
        </button>

        <span className="token-badge hidden sm:inline-flex">
          <Sparkles className="h-3 w-3" />
          1 COIN · BOT
        </span>
      </div>
    </div>
  );
}
