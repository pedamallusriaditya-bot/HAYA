import React from 'react';
import { Dices, Sparkles, User, Bot } from 'lucide-react';
import type { PlayerState, LudoColor } from './engine';
import PlayerAvatar from '@/components/avatar/PlayerAvatar';
import type { AvatarConfig } from '@/types/avatar';

type PlayerDiceCardProps = {
  player: PlayerState;
  isActiveTurn: boolean;
  isRolling: boolean;
  lastRoll: number | null;
  onRoll: () => void;
  canRoll: boolean;
  extraTurn?: boolean;
  tokensHome: number;
  avatar?: AvatarConfig;
};

const COLOR_CONFIGS: Record<
  LudoColor,
  {
    borderActive: string;
    borderInactive: string;
    bgActive: string;
    bgInactive: string;
    badgeBg: string;
    textColor: string;
    diceBg: string;
    diceBorder: string;
    dicePip: string;
    glow: string;
  }
> = {
  red: {
    borderActive: 'border-rose-400 ring-2 ring-rose-400/50 shadow-rose-500/20',
    borderInactive: 'border-rose-900/40',
    bgActive: 'bg-rose-950/40',
    bgInactive: 'bg-slate-900/60',
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    textColor: 'text-rose-400',
    diceBg: 'bg-gradient-to-br from-rose-400 via-rose-500 to-rose-600',
    diceBorder: 'border-rose-300',
    dicePip: '#ffffff',
    glow: 'shadow-lg shadow-rose-500/30',
  },
  green: {
    borderActive: 'border-emerald-400 ring-2 ring-emerald-400/50 shadow-emerald-500/20',
    borderInactive: 'border-emerald-900/40',
    bgActive: 'bg-emerald-950/40',
    bgInactive: 'bg-slate-900/60',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    textColor: 'text-emerald-400',
    diceBg: 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600',
    diceBorder: 'border-emerald-300',
    dicePip: '#0f172a',
    glow: 'shadow-lg shadow-emerald-500/30',
  },
  yellow: {
    borderActive: 'border-amber-400 ring-2 ring-amber-400/50 shadow-amber-500/20',
    borderInactive: 'border-amber-900/40',
    bgActive: 'bg-amber-950/40',
    bgInactive: 'bg-slate-900/60',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    textColor: 'text-amber-400',
    diceBg: 'bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500',
    diceBorder: 'border-amber-200',
    dicePip: '#0f172a',
    glow: 'shadow-lg shadow-amber-500/30',
  },
  blue: {
    borderActive: 'border-sky-400 ring-2 ring-sky-400/50 shadow-sky-500/20',
    borderInactive: 'border-sky-900/40',
    bgActive: 'bg-sky-950/40',
    bgInactive: 'bg-slate-900/60',
    badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    textColor: 'text-sky-400',
    diceBg: 'bg-gradient-to-br from-sky-400 via-sky-500 to-sky-600',
    diceBorder: 'border-sky-300',
    dicePip: '#ffffff',
    glow: 'shadow-lg shadow-sky-500/30',
  },
};

export default function PlayerDiceCard({
  player,
  isActiveTurn,
  isRolling,
  lastRoll,
  onRoll,
  canRoll,
  extraTurn = false,
  tokensHome,
  avatar,
}: PlayerDiceCardProps) {
  const conf = COLOR_CONFIGS[player.color];

  // SVG Pips for values 1-6
  const renderPips = (val: number, fill: string) => {
    switch (val) {
      case 1:
        return <circle cx="20" cy="20" r="3.8" fill={fill} />;
      case 2:
        return (
          <>
            <circle cx="12" cy="12" r="3" fill={fill} />
            <circle cx="28" cy="28" r="3" fill={fill} />
          </>
        );
      case 3:
        return (
          <>
            <circle cx="11" cy="11" r="3" fill={fill} />
            <circle cx="20" cy="20" r="3" fill={fill} />
            <circle cx="29" cy="29" r="3" fill={fill} />
          </>
        );
      case 4:
        return (
          <>
            <circle cx="12" cy="12" r="3" fill={fill} />
            <circle cx="28" cy="12" r="3" fill={fill} />
            <circle cx="12" cy="28" r="3" fill={fill} />
            <circle cx="28" cy="28" r="3" fill={fill} />
          </>
        );
      case 5:
        return (
          <>
            <circle cx="11" cy="11" r="3" fill={fill} />
            <circle cx="29" cy="11" r="3" fill={fill} />
            <circle cx="20" cy="20" r="3" fill={fill} />
            <circle cx="11" cy="29" r="3" fill={fill} />
            <circle cx="29" cy="29" r="3" fill={fill} />
          </>
        );
      case 6:
        return (
          <>
            <circle cx="12" cy="10" r="2.8" fill={fill} />
            <circle cx="12" cy="20" r="2.8" fill={fill} />
            <circle cx="12" cy="30" r="2.8" fill={fill} />
            <circle cx="28" cy="10" r="2.8" fill={fill} />
            <circle cx="28" cy="20" r="2.8" fill={fill} />
            <circle cx="28" cy="30" r="2.8" fill={fill} />
          </>
        );
      default:
        return <circle cx="20" cy="20" r="3.5" fill={fill} />;
    }
  };

  const displayVal = lastRoll || 1;

  return (
    <div
      className={`rounded-xl sm:rounded-2xl border p-2 xs:p-2.5 sm:p-3 transition-all flex items-center justify-between gap-1.5 xs:gap-2.5 ${
        isActiveTurn
          ? `${conf.borderActive} ${conf.bgActive} shadow-lg border-2`
          : `${conf.borderInactive} ${conf.bgInactive} opacity-85`
      }`}
    >
      {/* Player Identity & Score Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <PlayerAvatar
            config={avatar}
            name={player.name}
            isBot={player.isBot}
            size="xs"
            className="shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 mb-0.5">
              <span
                className={`text-[8px] xs:text-[9px] font-mono uppercase font-black px-1.5 py-0.5 rounded border ${conf.badgeBg}`}
              >
                {player.color}
              </span>
              {player.isBot ? (
                <span className="inline-flex items-center gap-0.5 text-[8px] xs:text-[9px] font-mono text-slate-400 bg-slate-800 px-1 py-0.5 rounded">
                  <Bot className="h-2.5 w-2.5" /> BOT
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-[8px] xs:text-[9px] font-mono text-amber-300 bg-amber-500/20 px-1 py-0.5 rounded border border-amber-500/30">
                  <User className="h-2.5 w-2.5" /> YOU
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-1">
              <span className="font-bold text-[11px] xs:text-xs sm:text-sm text-slate-100 truncate block">
                {player.name}
              </span>
              <span className="text-[9px] xs:text-[10px] font-mono font-bold text-slate-400 shrink-0">
                {tokensHome}/4
              </span>
            </div>
          </div>
        </div>

        {/* Turn Status Indicators */}
        <div className="mt-0.5 flex items-center gap-1 text-[9px] xs:text-[10px] min-h-[14px]">
          {isActiveTurn && extraTurn && (
            <span className="inline-flex items-center gap-0.5 text-[8px] xs:text-[9px] font-bold text-amber-400 uppercase tracking-wider bg-amber-500/10 px-1 rounded border border-amber-500/30 animate-pulse">
              <Sparkles className="h-2 w-2" /> Extra
            </span>
          )}
          {isActiveTurn && !extraTurn && (
            <span className="text-[8px] xs:text-[9px] font-mono font-bold uppercase text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              Turn
            </span>
          )}
          {!isActiveTurn && (
            <span className="text-[8px] xs:text-[9px] font-mono text-slate-500">
              {lastRoll !== null ? `Rolled ${lastRoll}` : 'Waiting'}
            </span>
          )}
        </div>
      </div>

      {/* Individual Square Dice with Rounded Corners */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <button
          type="button"
          disabled={!canRoll || isRolling}
          onClick={canRoll ? onRoll : undefined}
          aria-label={`Dice for ${player.name}${canRoll ? ' - Click to roll' : ''}`}
          className={`w-9 h-9 xs:w-10 xs:h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl border-2 flex items-center justify-center transition-all select-none ${
            conf.diceBg
          } ${conf.diceBorder} ${
            isRolling
              ? 'animate-spin scale-110 shadow-xl'
              : canRoll
              ? 'hover:scale-110 active:scale-95 cursor-pointer shadow-lg shadow-amber-500/25 ring-2 ring-amber-300 ring-offset-2 ring-offset-slate-950 animate-bounce'
              : 'cursor-default opacity-90'
          }`}
        >
          <svg viewBox="0 0 40 40" className="w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9">
            {renderPips(displayVal, conf.dicePip)}
          </svg>
        </button>

        {/* Human Interactive Roll Button on their active turn */}
        {canRoll && (
          <button
            type="button"
            onClick={onRoll}
            disabled={isRolling}
            className="btn-primary !py-0.5 !px-1.5 text-[9px] xs:text-[10px] font-black uppercase tracking-wider flex items-center gap-0.5 shadow-md"
          >
            <Dices className="h-2.5 w-2.5" />
            <span>ROLL</span>
          </button>
        )}
      </div>
    </div>
  );
}
